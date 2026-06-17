// Toast utility for Next.js - compatible with react-native-toast-message API
// Provides a simple toast notification system

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  type?: ToastType;
  text1: string;
  text2?: string;
  duration?: number;
  visibilityTime?: number;
  position?: 'top' | 'bottom';
  topOffset?: number;
  bottomOffset?: number;
  text1Style?: Record<string, any>;
  text2Style?: Record<string, any>;
  [key: string]: any; // Allow other properties from react-native-toast-message
}

export const Toast = {
  show: (options: ToastOptions) => {
    const { 
      type = 'info',
      text1, 
      text2, 
      duration, 
      visibilityTime = 2000,
      position = 'top'
    } = options;
    
    const displayDuration = duration || visibilityTime;
    
    // Log to console for debugging
    console.log(`[Toast] ${type.toUpperCase()}: ${text1}${text2 ? ' - ' + text2 : ''}`);
    
    // If we're in the browser, create a simple notification element
    if (typeof window !== 'undefined') {
      // Create a simple notification element
      const toast = document.createElement('div');
      
      // Format message
      const message = text2 ? `${text1}\n${text2}` : text1;
      toast.textContent = message;
      
      const positionStyle = position === 'top' ? 'top: 60px;' : 'bottom: 20px;';
      
      toast.style.cssText = `
        position: fixed;
        ${positionStyle}
        right: 20px;
        left: 20px;
        max-width: 500px;
        margin: 0 auto;
        padding: 16px 20px;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        z-index: 9999;
        animation: slideIn 0.3s ease-in-out;
        white-space: pre-wrap;
        word-wrap: break-word;
      `;
      
      // Set background color based on type
      const colors: Record<ToastType, string> = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b',
      };
      
      toast.style.backgroundColor = colors[type];
      document.body.appendChild(toast);
      
      // Remove after duration
      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in-out';
        setTimeout(() => toast.remove(), 300);
      }, displayDuration);
    }
  },
};

export default Toast;
