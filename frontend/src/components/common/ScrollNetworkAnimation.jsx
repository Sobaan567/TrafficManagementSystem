import React, { useEffect, useRef } from 'react';
import './ScrollNetworkAnimation.css';

const nodes = [
  { id: 'public', label: 'Public Portal', x: 16, y: 26 },
  { id: 'officer', label: 'Officer Action', x: 82, y: 22 },
  { id: 'admin', label: 'Admin Control', x: 88, y: 66 },
  { id: 'citizen', label: 'Citizen Services', x: 18, y: 72 },
  { id: 'traffic', label: 'Traffic Intel', x: 50, y: 10 },
  { id: 'payments', label: 'Payments', x: 50, y: 88 },
];

const center = { x: 50, y: 50 };

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const ScrollNetworkAnimation = () => {
  const sectionRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const updateProgress = () => {
      frameRef.current = null;

      if (reducedMotion) {
        section.style.setProperty('--network-progress', '1');
        return;
      }

      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const start = viewportHeight * 0.78;
      const end = -rect.height + viewportHeight * 0.25;
      const progress = clamp((start - rect.top) / (start - end), 0, 1);

      section.style.setProperty('--network-progress', progress.toFixed(3));
    };

    const requestUpdate = () => {
      if (frameRef.current) return;
      frameRef.current = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <section ref={sectionRef} className="scroll-network-section" aria-label="Connected traffic management workflow">
      <div className="scroll-network-sticky">
        <div className="scroll-network-copy">
          <span>Connected System</span>
          <h2>One control center. Every service linked.</h2>
          <p>
            Scroll through the network to see the central traffic engine expand and connect public services,
            officer action, admin control, intelligence, and payments into one operating layer.
          </p>
        </div>

        <div className="scroll-network-stage" aria-hidden="true">
          <svg className="scroll-network-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
            {nodes.map((node) => (
              <line
                key={node.id}
                x1={center.x}
                y1={center.y}
                x2={node.x}
                y2={node.y}
                pathLength="1"
              />
            ))}
          </svg>

          <div className="scroll-network-core">
            <strong>TMS</strong>
            <span>Command Core</span>
          </div>

          {nodes.map((node, index) => (
            <div
              key={node.id}
              className="scroll-network-node"
              style={{ left: `${node.x}%`, top: `${node.y}%`, '--node-index': index }}
            >
              <span>{node.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ScrollNetworkAnimation;
