import {
  Home,
  Send,
  Code,
  ChevronRight,
  LucideIcon,
} from 'lucide-react';
import React from 'react';

type IconMapping = Record<string, LucideIcon>;

/**
 * Icon component using lucide-react icons.
 * Maps common icon names to lucide-react components.
 */
const ICON_MAP: IconMapping = {
  'house.fill': Home,
  'paperplane.fill': Send,
  'chevron.left.forwardslash.chevron.right': Code,
  'chevron.right': ChevronRight,
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color = 'currentColor',
  style,
  weight,
}: {
  name: keyof typeof ICON_MAP;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  weight?: 'light' | 'regular' | 'medium' | 'semibold' | 'bold';
}) {
  const IconComponent = ICON_MAP[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in icon map`);
    return null;
  }

  return (
    <IconComponent 
      size={size} 
      color={color} 
      style={style}
      strokeWidth={weight === 'bold' ? 2.5 : weight === 'semibold' ? 2 : weight === 'medium' ? 1.75 : 1.5}
    />
  );
}
