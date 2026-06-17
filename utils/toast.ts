// Toast utility for Next.js
// Provides a simple toast notification system

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  type: ToastType;
  text1: string;
  text2?: string;
  duration?: number;
}

export const Toast = {
  show: (options: ToastOptions) => {
    const { type, text1, text2, duration = 2000 } = options;
    
    // Log to console for debugging
    console.log(`[Toast] ${type.toUpperCase()}: ${text1}${text2 ? ' - ' + text2 : ''}`);
    
    // If we're in the browser, we could add a visual toast here
    if (typeof window !== 'undefined') {
      // Create a simple notification element
      const toast = document.createElement('div');
      toast.textContent = text1;
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        z-index: 9999;
        animation: slideIn 0.3s ease-in-out;
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
      }, duration);
    }
  },
};

export default Toast;
