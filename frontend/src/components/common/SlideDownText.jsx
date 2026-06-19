import React from 'react';

const SlideDownText = ({ text, className = '', as: Component = 'span' }) => {
  const chunks = String(text || '').match(/\S+|\s+/g) || [];
  let letterIndex = 0;

  return (
    <Component className={`clip-slide-text ${className}`} aria-label={text}>
      {chunks.map((chunk, chunkIndex) => {
        if (/^\s+$/.test(chunk)) {
          return (
            <span key={`space-${chunkIndex}`} className="clip-slide-space" aria-hidden="true">
              {chunk.replace(/ /g, '\u00A0')}
            </span>
          );
        }

        return (
          <span key={`${chunk}-${chunkIndex}`} className="clip-slide-word" aria-hidden="true">
            {Array.from(chunk).map((letter) => {
              const index = letterIndex;
              letterIndex += 1;

              return (
                <span
                  key={`${letter}-${index}`}
                  className="clip-slide-letter"
                  style={{ '--letter-index': index }}
                >
                  {letter}
                </span>
              );
            })}
          </span>
        );
      })}
    </Component>
  );
};

export default SlideDownText;
