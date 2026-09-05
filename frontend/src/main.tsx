import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './utils/api.ts';
import App from './App.tsx';
import './index.css';

// Prevent mouse wheel from changing number input values across entire app
window.addEventListener(
  'wheel',
  () => {
    const activeEl = document.activeElement;
    if (activeEl instanceof HTMLInputElement && activeEl.type === 'number') {
      activeEl.blur();
    }
  },
  { passive: true }
);

document.addEventListener(
  'focusin',
  (e) => {
    const target = e.target;
    if (target instanceof HTMLInputElement && target.type === 'number') {
      const handleWheel = (event: WheelEvent) => {
        event.preventDefault();
        target.blur();
      };
      target.addEventListener('wheel', handleWheel, { passive: false });
    }
  },
  true
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);


