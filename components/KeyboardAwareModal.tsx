"use client";



type KeyboardAwareModalProps = {
  visible?: boolean;
  animationType?: "slide" | "fade" | "none";
  transparent?: boolean;
  onRequestClose?: () => void;
  children: ReactNode;
  keyboardVerticalOffset?: number;
};

export default function KeyboardAwareModal({
  visible,
  children,
  onRequestClose,
  transparent = true,
}: KeyboardAwareModalProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50">
      {transparent && (
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onRequestClose}
        />
      )}
      <div className="relative w-full h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
