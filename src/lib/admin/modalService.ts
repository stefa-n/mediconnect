// Modal Service - Confirmation dialogs
export interface ConfirmOptions {
  title: string;
  message: string;
  icon?: string;
  confirmText?: string;
  cancelText?: string;
  confirmClass?: string;
}

export class ModalService {
  private static instance: ModalService;
  private modal: HTMLElement | null = null;
  private resolvePromise: ((value: boolean) => void) | null = null;

  private constructor() {
    this.initModal();
  }

  static getInstance(): ModalService {
    if (!ModalService.instance) {
      ModalService.instance = new ModalService();
    }
    return ModalService.instance;
  }

  private initModal() {
    if (typeof window === 'undefined') return;

    this.modal = document.getElementById('confirm-modal');
    if (!this.modal) {
      console.warn('Confirm modal not found in DOM');
    }
  }

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.modal) {
        this.initModal();
        if (!this.modal) {
          console.error('Cannot show modal: element not initialized');
          resolve(false);
          return;
        }
      }

      this.resolvePromise = resolve;

      // Update modal content
      const iconEl = this.modal.querySelector('#confirm-icon') as HTMLElement;
      const titleEl = this.modal.querySelector('#confirm-title') as HTMLElement;
      const messageEl = this.modal.querySelector('#confirm-message') as HTMLElement;
      const confirmBtn = this.modal.querySelector('#confirm-btn') as HTMLElement;
      const cancelBtn = this.modal.querySelector('#cancel-btn') as HTMLElement;

      if (iconEl && options.icon) {
        iconEl.className = `fas fa-${options.icon} text-4xl`;
      }
      if (titleEl) titleEl.textContent = options.title;
      if (messageEl) messageEl.textContent = options.message;
      if (confirmBtn) {
        confirmBtn.textContent = options.confirmText || 'Confirm';
        if (options.confirmClass) {
          confirmBtn.className = options.confirmClass;
        }
      }
      if (cancelBtn) {
        cancelBtn.textContent = options.cancelText || 'Cancel';
      }

      // Show modal
      this.show();

      // Set up event listeners
      this.setupEventListeners();
    });
  }

  private show() {
    if (!this.modal) return;

    this.modal.classList.remove('hidden');
    this.modal.classList.add('flex');

    const content = this.modal.querySelector('#confirm-modal-content') as HTMLElement;
    if (content) {
      requestAnimationFrame(() => {
        content.style.transform = 'scale(1)';
        content.style.opacity = '1';
      });
    }
  }

  private hide() {
    if (!this.modal) return;

    const content = this.modal.querySelector('#confirm-modal-content') as HTMLElement;
    if (content) {
      content.style.transform = 'scale(0.95)';
      content.style.opacity = '0';
    }

    setTimeout(() => {
      if (this.modal) {
        this.modal.classList.remove('flex');
        this.modal.classList.add('hidden');
      }
    }, 200);
  }

  private setupEventListeners() {
    const confirmBtn = this.modal?.querySelector('#confirm-btn');
    const cancelBtn = this.modal?.querySelector('#cancel-btn');

    const handleConfirm = () => {
      this.hide();
      if (this.resolvePromise) {
        this.resolvePromise(true);
        this.resolvePromise = null;
      }
      cleanup();
    };

    const handleCancel = () => {
      this.hide();
      if (this.resolvePromise) {
        this.resolvePromise(false);
        this.resolvePromise = null;
      }
      cleanup();
    };

    const cleanup = () => {
      confirmBtn?.removeEventListener('click', handleConfirm);
      cancelBtn?.removeEventListener('click', handleCancel);
    };

    confirmBtn?.addEventListener('click', handleConfirm);
    cancelBtn?.addEventListener('click', handleCancel);
  }
}

// Export singleton instance
export const modalService = typeof window !== 'undefined' ? ModalService.getInstance() : null;

// Make it available globally
if (typeof window !== 'undefined') {
  (window as any).modalService = modalService;
}
