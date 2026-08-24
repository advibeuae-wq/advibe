import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import DemoOne from './demo';
import './index.css';

// Mounts the EarbudShowcase "after" demo into the static case-study section
// of ../index.html. That host page provides #advibe-case-study-widget-root
// and gives it `contain: layout paint` so the component's `position: fixed`
// children (BackgroundGradient, Switcher) are scoped to this widget's box
// instead of the real browser viewport — see ../index.html and
// ../css/case-study-widget-host.css for the containing-block trick.
const rootEl = document.getElementById('advibe-case-study-widget-root');

if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <DemoOne />
    </StrictMode>,
  );
} else if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn(
    '[case-study-widget] #advibe-case-study-widget-root not found in the page.',
  );
}
