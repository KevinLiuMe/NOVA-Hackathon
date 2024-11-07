import React, { useEffect, useState } from 'react';

const FloatingCircles = () => {
  const [circles, setCircles] = useState([]);

  useEffect(() => {
    // Add styles only once when component mounts
    const style = document.createElement('style');
    style.textContent = `
      .floating-circle {
        position: absolute;
        border-radius: 50%;
        opacity: 0.20;
        pointer-events: none;
        transform: translate(-50%, -50%);
        backdrop-filter: blur(1px);
      }

      @keyframes float {
        0% {
          transform: translate(-50%, -50%) translate(0, 0);
        }
        25% {
          transform: translate(-50%, -50%) translate(100px, 100px);
        }
        50% {
          transform: translate(-50%, -50%) translate(0, 200px);
        }
        75% {
          transform: translate(-50%, -50%) translate(-100px, 100px);
        }
        100% {
          transform: translate(-50%, -50%) translate(0, 0);
        }
      }
    `;
    document.head.appendChild(style);

    // Generate circles only once when component mounts
    const initialCircles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      size: Math.random() * 200 + 100,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 15 + 25,
      delay: -Math.random() * 20,
      backgroundColor: `rgba(${140 + Math.random() * 30}, ${180 + Math.random() * 40}, ${160 + Math.random() * 30}, 0.15)`
    }));
    setCircles(initialCircles);

    return () => {
      document.head.removeChild(style);
    };
  }, []); // Empty dependency array ensures this runs only once

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {circles.map(circle => (
        <div
          key={circle.id}
          className="floating-circle"
          style={{
            width: circle.size,
            height: circle.size,
            left: `${circle.x}%`,
            top: `${circle.y}%`,
            backgroundColor: circle.backgroundColor,
            animation: `float ${circle.duration}s infinite linear`,
            animationDelay: `${circle.delay}s`,
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        />
      ))}
    </div>
  );
};

export default FloatingCircles;