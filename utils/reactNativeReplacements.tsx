// Temporary replacements for React Native components during migration
import React from 'react';

export const ActivityIndicator: React.FC<any> = ({ color = '#000', size = 'small' }) => (
  <div className="animate-spin rounded-full border-2 border-gray-300 border-t-transparent" 
    style={{ 
      width: size === 'small' ? '20px' : '40px',
      height: size === 'small' ? '20px' : '40px',
      borderColor: `${color}33`,
      borderTopColor: color
    }}
  />
);

export const TouchableOpacity: React.FC<any> = ({ children, onPress, style, disabled, ...props }) => (
  <button
    onClick={onPress}
    disabled={disabled}
    style={style as React.CSSProperties}
    {...props}
    className={`${props.className || ''} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    {children}
  </button>
);

export const TextInput: React.FC<any> = React.forwardRef<HTMLInputElement, any>(({ style, ...props }, ref) => (
  <input ref={ref} style={style as React.CSSProperties} {...props} />
));

TextInput.displayName = 'TextInput';

export const ScrollView: React.FC<any> = ({ children, style, contentContainerStyle, ...props }) => (
  <div style={style as React.CSSProperties} {...props} className="overflow-auto">
    <div style={contentContainerStyle as React.CSSProperties}>
      {children}
    </div>
  </div>
);

export const KeyboardAvoidingView: React.FC<any> = ({ children, style, ...props }) => (
  <div style={style as React.CSSProperties} {...props}>
    {children}
  </div>
);

export const Alert = {
  alert: (title: string, message?: string, buttons?: any[]) => {
    alert(`${title}\n${message || ''}`);
  }
};

export const Platform = {
  OS: 'web',
  select: (obj: any) => obj.web || obj.default
};

export const StyleSheet = {
  create: (styles: any) => styles,
  absoluteFill: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 }
};

export const Animated = {
  Value: class {
    _value: number;
    constructor(value: number) {
      this._value = value;
    }
  },
  timing: () => ({ start: () => {} }),
  parallel: (animations: any[]) => ({ start: () => {} }),
  spring: () => ({ start: () => {} }),
  sequence: () => ({ start: () => {} }),
};

export const Pressable: React.FC<any> = TouchableOpacity;
export const FlatList: React.FC<any> = ({ data, renderItem, keyExtractor }: any) => (
  <div>
    {data?.map((item: any, index: number) => (
      <div key={keyExtractor?.(item, index) || index}>
        {renderItem?.({ item })}
      </div>
    ))}
  </div>
);

export const TouchableWithoutFeedback: React.FC<any> = ({ children, onPress, ...props }) => (
  <div onClick={onPress} {...props}>
    {children}
  </div>
);

export const Keyboard = {
  addListener: (event: string, callback: any) => ({
    remove: () => {}
  }),
  dismiss: () => {}
};

export const Modal: React.FC<any> = ({ visible, children, onRequestClose, transparent }: any) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50">
      {transparent && <div className="absolute inset-0 bg-black/50" onClick={onRequestClose} />}
      <div className="relative w-full h-full flex items-center">
        {children}
      </div>
    </div>
  );
};

export const webStyle = (style: any) => style;
