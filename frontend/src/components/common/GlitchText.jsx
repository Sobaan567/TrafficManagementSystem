import React from 'react';

const GlitchText = ({ text, className = '' }) => {
  return (
    <span className={`glitch-text ${className}`}>
      {text}
    </span>
  );
};

export default GlitchText;
