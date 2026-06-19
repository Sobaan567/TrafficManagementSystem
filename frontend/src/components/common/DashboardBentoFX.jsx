import { useEffect } from 'react';

const BENTO_SELECTORS = [
  '.stat-card',
  '.officer-quick-card',
  '.command-signal-grid article',
  '.admin-card-grid article',
  '.admin-report-hero article',
  '.admin-intelligence-grid article',
  '.reports-card-grid article',
  '.challan-stats-grid article',
  '.traffic-command-stats article',
  '.public-stat-card',
  '.public-chart-panel',
  '.public-map-panel',
  '.public-alert-panel',
  '.public-services article',
  '.public-status-board',
  '.public-command-ribbon',
  '.citizen-stat-card',
  '.citizen-panel',
  '.city-pulse',
  '.citizen-service-score',
  '.citizen-service-grid article',
  '.citizen-command-deck article',
  '.officer-appeals-panel',
  '.officer-activity-panel',
  '.officer-ai-fill',
  '.admin-panel',
  '.reports-panel',
  '.challan-table-panel',
  '.challan-priority-panel',
  '.traffic-radar-panel',
  '.traffic-feed-panel',
];

const selector = BENTO_SELECTORS.join(',');

const DashboardBentoFX = () => {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    if (reducedMotion || coarsePointer) return undefined;

    const cleanups = new Map();

    const enhance = (element) => {
      if (!element || cleanups.has(element)) return;

      element.classList.add('dashboard-bento-fx');

      const handlePointerMove = (event) => {
        const rect = element.getBoundingClientRect();
        element.style.setProperty('--bento-x', `${event.clientX - rect.left}px`);
        element.style.setProperty('--bento-y', `${event.clientY - rect.top}px`);
      };

      const handlePointerLeave = () => {
        element.style.removeProperty('--bento-x');
        element.style.removeProperty('--bento-y');
      };

      const handleClick = (event) => {
        const rect = element.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'dashboard-bento-ripple';
        ripple.style.left = `${event.clientX - rect.left}px`;
        ripple.style.top = `${event.clientY - rect.top}px`;
        element.appendChild(ripple);
        window.setTimeout(() => ripple.remove(), 650);
      };

      element.addEventListener('pointermove', handlePointerMove, { passive: true });
      element.addEventListener('pointerleave', handlePointerLeave);
      element.addEventListener('click', handleClick);

      cleanups.set(element, () => {
        element.classList.remove('dashboard-bento-fx');
        element.removeEventListener('pointermove', handlePointerMove);
        element.removeEventListener('pointerleave', handlePointerLeave);
        element.removeEventListener('click', handleClick);
      });
    };

    const scan = () => {
      document.querySelectorAll(selector).forEach(enhance);
    };

    scan();

    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanups.forEach((cleanup) => cleanup());
      cleanups.clear();
    };
  }, []);

  return null;
};

export default DashboardBentoFX;
