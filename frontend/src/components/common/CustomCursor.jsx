import React, { useEffect, useRef, useState } from 'react';

const CustomCursor = () => {
  const cursorRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseOver = (e) => {
      // Guard against non-element targets (like text nodes)
      if (e.target && e.target.nodeType === 1) {
        const isInteractive =
          e.target.tagName === 'A' ||
          e.target.tagName === 'BUTTON' ||
          (e.target.classList && (
            e.target.classList.contains('btn') ||
            e.target.classList.contains('interactive')
          ));

        setIsHovering(isInteractive);
      }
    };

    let animationId;
    const animate = () => {
      setPosition((prev) => ({
        x: prev.x + (targetRef.current.x - prev.x) * 0.15,
        y: prev.y + (targetRef.current.y - prev.y) * 0.15,
      }));
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseover', handleMouseOver);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseover', handleMouseOver);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className={`custom-cursor ${isHovering ? 'hover' : ''}`}
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 9999,
        left: 0,
        top: 0,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
    />
  );
};

export default CustomCursor;
