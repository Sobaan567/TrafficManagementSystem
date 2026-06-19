import React, { useEffect, useMemo, useRef, useState } from 'react';
import './AnimatedNumber.css';

const numberPattern = /(-?\d[\d,]*(?:\.\d+)?)/;

const parseValue = (value) => {
  const text = String(value ?? '');
  const match = text.match(numberPattern);
  if (!match) return null;

  const raw = match[1];
  const numeric = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(numeric)) return null;

  const decimalPart = raw.split('.')[1];
  const integerPart = raw.split('.')[0].replace(/,/g, '').replace('-', '');

  return {
    prefix: text.slice(0, match.index),
    suffix: text.slice((match.index || 0) + raw.length),
    target: numeric,
    decimals: decimalPart ? decimalPart.length : 0,
    padLength: integerPart.length > 1 && integerPart.startsWith('0') ? integerPart.length : 0,
    useGrouping: raw.includes(','),
  };
};

const formatNumber = (value, parsed) => {
  const fixed = value.toFixed(parsed.decimals);
  const [integer, decimal] = fixed.split('.');
  const absoluteInteger = Math.abs(Number(integer)).toString().padStart(parsed.padLength, '0');
  const signedInteger = Number(integer) < 0 ? `-${absoluteInteger}` : absoluteInteger;
  const grouped = parsed.useGrouping
    ? Number(signedInteger).toLocaleString(undefined, { maximumFractionDigits: 0 })
    : signedInteger;

  return `${parsed.prefix}${grouped}${decimal ? `.${decimal}` : ''}${parsed.suffix}`;
};

const AnimatedNumber = ({ value, duration = 1100, className = '' }) => {
  const ref = useRef(null);
  const frameRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const parsed = useMemo(() => parseValue(value), [value]);
  const [displayValue, setDisplayValue] = useState(() => (parsed ? formatNumber(0, parsed) : value));

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !parsed) {
      setVisible(true);
      setDisplayValue(value);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [parsed, value]);

  useEffect(() => {
    if (!visible || !parsed) {
      setDisplayValue(value);
      return undefined;
    }

    const startTime = performance.now();
    const startValue = 0;
    const endValue = parsed.target;

    const step = (time) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(formatNumber(startValue + ((endValue - startValue) * eased), parsed));

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(step);
      }
    };

    frameRef.current = window.requestAnimationFrame(step);
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, [duration, parsed, value, visible]);

  return (
    <span ref={ref} className={`animated-number ${visible ? 'is-visible' : ''} ${className}`}>
      {displayValue}
    </span>
  );
};

export default AnimatedNumber;
