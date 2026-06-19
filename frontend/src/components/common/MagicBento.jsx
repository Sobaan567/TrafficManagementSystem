import React, { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './MagicBento.css';

const DEFAULT_GLOW = '210, 232, 35';
const MOBILE_BREAKPOINT = 768;

const defaultItems = [
  { label: 'Live Ops', title: 'Dashboard', description: 'Track challans, appeals, violations, and road activity from one command view.' },
  { label: 'Public', title: 'Citizen Portal', description: 'Give citizens fast access to challan lookup, payments, appeals, and traffic alerts.' },
  { label: 'Maps', title: 'Real-Time Mapping', description: 'Surface traffic locations, alert markers, and city pressure through map-based views.' },
  { label: 'Command', title: '3D Visualization', description: 'Use animated city visuals to make traffic state and officer activity easier to read.' },
  { label: 'Finance', title: 'E-Challan System', description: 'Issue digital fines, track payment status, print challans, and manage receipts.' },
  { label: 'AI', title: 'Gemini Assistant', description: 'Guide users through challans, public services, traffic updates, and officer workflows.' },
];

const createParticle = (x, y, glowColor) => {
  const element = document.createElement('span');
  element.className = 'magic-bento-particle';
  element.style.left = `${x}px`;
  element.style.top = `${y}px`;
  element.style.setProperty('--magic-glow-rgb', glowColor);
  return element;
};

const MagicCard = ({
  children,
  className = '',
  disableAnimations,
  particleCount,
  glowColor,
  enableStars,
  enableTilt,
  enableMagnetism,
  clickEffect,
}) => {
  const cardRef = useRef(null);
  const particlesRef = useRef([]);
  const timeoutsRef = useRef([]);
  const hoveredRef = useRef(false);
  const magnetRef = useRef(null);

  const clearParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    magnetRef.current?.kill();

    particlesRef.current.forEach((particle) => {
      gsap.to(particle, {
        opacity: 0,
        scale: 0,
        duration: 0.22,
        ease: 'power2.out',
        onComplete: () => particle.remove(),
      });
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!cardRef.current || !hoveredRef.current || !enableStars) return;
    const { width, height } = cardRef.current.getBoundingClientRect();

    for (let index = 0; index < particleCount; index += 1) {
      const timeoutId = window.setTimeout(() => {
        if (!cardRef.current || !hoveredRef.current) return;
        const particle = createParticle(Math.random() * width, Math.random() * height, glowColor);
        cardRef.current.appendChild(particle);
        particlesRef.current.push(particle);

        gsap.fromTo(particle, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.22, ease: 'back.out(1.8)' });
        gsap.to(particle, {
          x: (Math.random() - 0.5) * 64,
          y: (Math.random() - 0.5) * 64,
          duration: 1.8 + Math.random(),
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }, index * 80);
      timeoutsRef.current.push(timeoutId);
    }
  }, [enableStars, glowColor, particleCount]);

  useEffect(() => {
    const element = cardRef.current;
    if (!element || disableAnimations) return undefined;

    const handleEnter = () => {
      hoveredRef.current = true;
      animateParticles();
    };

    const handleLeave = () => {
      hoveredRef.current = false;
      clearParticles();
      gsap.to(element, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.24, ease: 'power2.out' });
    };

    const handleMove = (event) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      element.style.setProperty('--mouse-x', `${x}px`);
      element.style.setProperty('--mouse-y', `${y}px`);

      if (enableTilt) {
        gsap.to(element, {
          rotateX: ((y - centerY) / centerY) * -5,
          rotateY: ((x - centerX) / centerX) * 5,
          transformPerspective: 900,
          duration: 0.12,
          ease: 'power2.out',
        });
      }

      if (enableMagnetism) {
        magnetRef.current = gsap.to(element, {
          x: (x - centerX) * 0.025,
          y: (y - centerY) * 0.025,
          duration: 0.24,
          ease: 'power2.out',
        });
      }
    };

    const handleClick = (event) => {
      if (!clickEffect) return;
      const rect = element.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'magic-bento-ripple';
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      ripple.style.setProperty('--magic-glow-rgb', glowColor);
      element.appendChild(ripple);
      gsap.fromTo(ripple, { opacity: 0.7, scale: 0 }, { opacity: 0, scale: 42, duration: 0.62, ease: 'power2.out', onComplete: () => ripple.remove() });
    };

    element.addEventListener('mouseenter', handleEnter);
    element.addEventListener('mouseleave', handleLeave);
    element.addEventListener('mousemove', handleMove);
    element.addEventListener('click', handleClick);

    return () => {
      element.removeEventListener('mouseenter', handleEnter);
      element.removeEventListener('mouseleave', handleLeave);
      element.removeEventListener('mousemove', handleMove);
      element.removeEventListener('click', handleClick);
      clearParticles();
    };
  }, [animateParticles, clearParticles, clickEffect, disableAnimations, enableMagnetism, enableTilt, glowColor]);

  return (
    <article ref={cardRef} className={`magic-bento-card ${className}`} style={{ '--magic-glow-rgb': glowColor }}>
      {children}
    </article>
  );
};

const MagicBento = ({
  items = defaultItems,
  textAutoHide = true,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  enableTilt = true,
  enableMagnetism = false,
  clickEffect = true,
  spotlightRadius = 300,
  particleCount = 8,
  glowColor = DEFAULT_GLOW,
  disableAnimations = false,
}) => {
  const gridRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const shouldDisable = disableAnimations || isMobile || reduceMotion;

  useEffect(() => {
    if (!enableSpotlight || shouldDisable) return undefined;
    const grid = gridRef.current;
    if (!grid) return undefined;

    const handleMove = (event) => {
      grid.querySelectorAll('.magic-bento-card').forEach((card) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
        card.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
        card.style.setProperty('--spotlight-radius', `${spotlightRadius}px`);
      });
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMove);
  }, [enableSpotlight, shouldDisable, spotlightRadius]);

  return (
    <div ref={gridRef} className="magic-bento-grid">
      {items.map((item, index) => (
        <MagicCard
          key={item.title}
          className={`magic-card-${index}`}
          disableAnimations={shouldDisable}
          particleCount={particleCount}
          glowColor={glowColor}
          enableStars={enableStars}
          enableTilt={enableTilt}
          enableMagnetism={enableMagnetism}
          clickEffect={clickEffect}
        >
          {enableSpotlight && <span className="magic-bento-spotlight" aria-hidden="true" />}
          {enableBorderGlow && <span className="magic-bento-border" aria-hidden="true" />}
          <div className="magic-bento-content">
            <span>{item.label}</span>
            <h3>{item.title}</h3>
            <p className={textAutoHide ? 'text-auto-hide' : ''}>{item.description}</p>
          </div>
        </MagicCard>
      ))}
    </div>
  );
};

export default MagicBento;
