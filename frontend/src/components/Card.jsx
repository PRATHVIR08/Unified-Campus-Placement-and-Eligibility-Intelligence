// Card component  [P1]
import React from 'react';

/** Simple surface card. Use elevated prop for deeper nesting. */
export default function Card({ children, elevated = false, className = '', style, ...props }) {
  return (
    <div
      className={`card${elevated ? ' card-elevated' : ''} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}
