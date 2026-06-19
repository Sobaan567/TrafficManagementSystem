import React from 'react';
import SlideDownText from './SlideDownText';

const GlitchText = ({ text, className = '' }) => {
  return <SlideDownText text={text} className={`glitch-text ${className}`} />;
};

export default GlitchText;
