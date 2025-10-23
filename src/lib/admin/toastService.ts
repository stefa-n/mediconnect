// Toast Service - Notification system
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  message: string;
  type: ToastType;
  duration?: number;
}

export class ToastService {
  private static instance: ToastService;
  private container: HTMLElement | null = null;
  private toastCounter = 0;

  private constructor() {
    this.initContainer();
  }

  static getInstance(): ToastService {
    if (!ToastService.instance) {
      ToastService.instance = new ToastService();
    }
    return ToastService.instance;
  }

  private initContainer() {
    if (typeof window === 'undefined') return;

    this.container = document.getElementById('toast-container');
    if (!this.container) {
      console.warn('Toast container not found in DOM');
    }
  }

  show(options: ToastOptions): void {
    if (!this.container) {
      this.initContainer();
      if (!this.container) {
        console.error('Cannot show toast: container not initialized');
        return;
      }
    }

    const { message, type, duration = 3000 } = options;
    const toastId = `toast-${++this.toastCounter}`;

    const toast = this.createToastElement(toastId, message, type);
    this.container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto-remove after duration
    setTimeout(() => {
      this.remove(toastId);
    }, duration);
  }

  private createToastElement(id: string, message: string, type: ToastType): HTMLElement {
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `toast toast-${type}`;

    const icons: Record<ToastType, string> = {
      success: 'check-circle',
      error: 'exclamation-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle'
    };

    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <i class="fas fa-${icons[type]} text-lg"></i>
        <span class="flex-1">${message}</span>
        <button class="toast-close hover:opacity-70 transition-opacity" onclick="window.toastService?.remove('${id}')">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    return toast;
  }

  remove(toastId: string): void {
    const toast = document.getElementById(toastId);
    if (!toast) return;

    toast.classList.remove('show');
    toast.classList.add('hide');

    setTimeout(() => {
      toast.remove();
    }, 300);
  }

  success(message: string, duration?: number): void {
    this.show({ message, type: 'success', duration });
  }

  error(message: string, duration?: number): void {
    this.show({ message, type: 'error', duration });
  }

  warning(message: string, duration?: number): void {
    this.show({ message, type: 'warning', duration });
  }

  info(message: string, duration?: number): void {
    this.show({ message, type: 'info', duration });
  }
}

// Export singleton instance for global use
export const toastService = typeof window !== 'undefined' ? ToastService.getInstance() : null;

// Make it available globally for inline event handlers
if (typeof window !== 'undefined') {
  (window as any).toastService = toastService;
}
