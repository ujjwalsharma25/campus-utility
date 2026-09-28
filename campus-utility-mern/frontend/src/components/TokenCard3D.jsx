import { useRef, useState } from 'react';

// A reusable wrapper that gives its children a subtle real-time 3D tilt as the
// pointer moves across them - used for menu tiles and queue tokens.
export default function TokenCard3D({ children, className = '' }) {
  const cardRef = useRef(null);
  const [transform, setTransform] = useState('rotateX(0deg) rotateY(0deg) scale3d(1,1,1)');

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateY = ((x - centerX) / centerX) * 8;
    const rotateX = -((y - centerY) / centerY) * 8;
    setTransform(`rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
  };

  const handleMouseLeave = () => {
    setTransform('rotateX(0deg) rotateY(0deg) scale3d(1,1,1)');
  };

  return (
    <div className="perspective-1000">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ transform, transition: 'transform 150ms ease-out' }}
        className={`transform-gpu will-change-transform ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
