import React, { ReactNode } from 'react';

interface LinearGradientProps {
  colors?: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: number[];
  style?: React.CSSProperties;
  children?: ReactNode;
  [key: string]: any;
}

export const LinearGradient: React.FC<divProps> = ({
  colors = ['#000000', '#ffffff'],
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  locations,
  style,
  children,
  ...props
}) => {
  // Convert Expo gradient to CSS gradient
  // Normalize coordinates from 0-1 to degrees
  const getAngle = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  const angle = getAngle(start, end);

  // Build gradient stops
  let gradientStops = colors.map((color, index) => {
    if (locations && locations[index] !== undefined) {
      return `${color} ${locations[index] * 100}%`;
    }
    const position = (index / (colors.length - 1)) * 100;
    return `${color} ${position}%`;
  }).join(', ');

  const backgroundImage = `linear-gradient(${angle}deg, ${gradientStops})`;

  const combinedStyle: React.CSSProperties = {
    backgroundImage,
    ...style,
  };

  return (
    <div
      style={combinedStyle}
      {...props}
    >
      {children}
    </div>
  );
};

export default LinearGradient;
