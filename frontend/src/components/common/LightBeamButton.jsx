import React from 'react';
import { motion } from 'framer-motion';
import './LightBeamButton.css';

const LightBeamButton = ({
  children,
  className = '',
  onClick,
  gradientColors = ['#D2E823', '#39D5FF', '#D2E823'],
  type = 'button',
  disabled = false,
  ...props
}) => {
  const gradient = `conic-gradient(from var(--beam-angle), transparent 0%, ${gradientColors[0]} 34%, ${gradientColors[1]} 50%, ${gradientColors[2]} 66%, transparent 76%, transparent 100%)`;

  return (
    <motion.button
      type={type}
      whileHover={disabled ? undefined : { scale: 1.025 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={onClick}
      className={`light-beam-button ${className}`}
      disabled={disabled}
      style={{ '--beam-gradient': gradient }}
      {...props}
    >
      <span className="light-beam-content">{children}</span>
      <span className="light-beam-border" aria-hidden="true" />
      <span className="light-beam-core" aria-hidden="true" />
      <span className="light-beam-shine" aria-hidden="true" />
    </motion.button>
  );
};

export default LightBeamButton;
