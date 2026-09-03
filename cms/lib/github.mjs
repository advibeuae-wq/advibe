/**
 * Minimal GitHub API client — no SDK dependency (fetch + Buffer only), so
 * the CMS stays lightweight. Every write goes through commitFiles(), which
 * builds ONE atomic commit via the Git Data API (blob -> tree -> commit ->
 * ref update) so a post file, the blog index, and the sitemap either all
 * land together or none of them do.
 *
 * GITHUB_TOKEN is read from process.env only — this module never runs in
 * the browser, and nothing here ever echoes the token back in a response.
 */

const API = "https://api.github.com";

function repoInfo() {
  const owner = process.env.GITHUB_OWNER || "advibeuae-wq";
  const repo = process.env.GITHUB_REPO || "advibe";
  const branch = process.env.GITHUB_BRANCH || "main";
  return { owner, repo, branch };
}

function authHeaders() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set on the server.");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "advibe-cms",
    "Content-Type": "application/json",
  };
}

/** Reads a file at HEAD of the configured branch. Returns null on 404. */
export async function getFile(path) {
  const { owner, repo, branch } = repoInfo();
  const url = `${API}/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHub getFile(${path}) failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  const content = Buffer.from(json.content, "base64").toString("utf-8");
  return { content, sha: json.sha };
}

/**
 * Commits multiple files in a single atomic commit to the configured branch.
 * files: [{ path, content, encoding }] — encoding defaults to "utf-8" (plain
 * text files); pass encoding: "base64" with content already base64-encoded
 * for binary files (images). Mixing text and binary files in one call is
 * fine — each blob is created with its own encoding.
 * Throws an Error whose message starts with "CONCURRENT_UPDATE:" if the
 * branch moved between reading and writing (non-fast-forward) — the caller
 * should surface that as "please retry" rather than a generic 500.
 */
export async function commitFiles({ files, message }) {
  const { owner, repo, branch } = repoInfo();
  const headers = authHeaders();
  const base = `${API}/repos/${owner}/${repo}`;

  const refRes = await fetch(`${base}/git/ref/heads/${branch}`, { headers });
  if (!refRes.ok) throw new Error(`Could not read ref heads/${branch}: ${refRes.status} ${await refRes.text()}`);
  const ref = await refRes.json();
  const baseCommitSha = ref.object.sha;

  const commitRes = await fetch(`${base}/git/commits/${baseCommitSha}`, { headers });
  if (!commitRes.ok) throw new Error(`Could not read base commit: ${commitRes.status} ${await commitRes.text()}`);
  const baseCommit = await commitRes.json();
  const baseTreeSha = baseCommit.tree.sha;

  const treeEntries = [];
  for (const f of files) {
    const blobRes = await fetch(`${base}/git/blobs`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content: f.content, encoding: f.encoding || "utf-8" }),
    });
    if (!blobRes.ok) throw new Error(`Could not create blob for ${f.path}: ${blobRes.status} ${await blobRes.text()}`);
    const blob = await blobRes.json();
    treeEntries.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
  }

  const treeRes = await fetch(`${base}/git/trees`, {
    method: "POST",
    headers,
    body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries }),
  });
  if (!treeRes.ok) throw new Error(`Could not create tree: ${treeRes.status} ${await treeRes.text()}`);
  const tree = await treeRes.json();

  const newCommitRes = await fetch(`${base}/git/commits`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message, tree: tree.sha, parents: [baseCommitSha] }),
  });
  if (!newCommitRes.ok) throw new Error(`Could not create commit: ${newCommitRes.status} ${await newCommitRes.text()}`);
  const newCommit = await newCommitRes.json();

  const updateRes = await fetch(`${base}/git/refs/heads/${branch}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ sha: newCommit.sha, force: false }),
  });
  if (!updateRes.ok) {
    throw new Error(`CONCURRENT_UPDATE: could not fast-forward heads/${branch}: ${updateRes.status} ${await updateRes.text()}`);
  }

  return {
    commitSha: newCommit.sha,
    commitUrl: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
  };
}
