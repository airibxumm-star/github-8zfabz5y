/**
 * UI Management utilities for better user experience
 */

export class UIManager {
  constructor() {
    this.notifications = [];
    this.loadingStates = new Set();
  }

  showError(message, duration = 5000) {
    this.showNotification(message, 'error', duration);
  }

  showSuccess(message, duration = 3000) {
    this.showNotification(message, 'success', duration);
  }

  showInfo(message, duration = 4000) {
    this.showNotification(message, 'info', duration);
  }

  showNotification(message, type = 'info', duration = 4000) {
    const notification = this.createNotificationElement(message, type);
    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
      notification.classList.add('notification-show');
    });
    
    // Auto-remove after duration
    setTimeout(() => {
      this.removeNotification(notification);
    }, duration);
    
    this.notifications.push(notification);
  }

  createNotificationElement(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${this.escapeHtml(message)}</span>
        <button class="notification-close" aria-label="Close">&times;</button>
      </div>
    `;
    
    // Add close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      this.removeNotification(notification);
    });
    
    return notification;
  }

  removeNotification(notification) {
    notification.classList.add('notification-hide');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      const index = this.notifications.indexOf(notification);
      if (index > -1) {
        this.notifications.splice(index, 1);
      }
    }, 300);
  }

  showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.add('loading-state');
      this.loadingStates.add(elementId);
    }
  }

  hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.remove('loading-state');
      this.loadingStates.delete(elementId);
    }
  }

  setButtonLoading(button, isLoading = true) {
    if (isLoading) {
      button.classList.add('btn-loading');
      button.disabled = true;
      const originalText = button.textContent;
      button.dataset.originalText = originalText;
      button.innerHTML = '<span class="loading"></span> Loading...';
    } else {
      button.classList.remove('btn-loading');
      button.disabled = false;
      button.textContent = button.dataset.originalText || button.textContent;
    }
  }

  async copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const result = document.execCommand('copy');
        document.body.removeChild(textArea);
        return result;
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unitIndex]}`;
  }

  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 30 * day;
    const year = 365 * day;

    if (diff < minute) return 'just now';
    if (diff < hour) return `${Math.floor(diff / minute)} minutes ago`;
    if (diff < day) return `${Math.floor(diff / hour)} hours ago`;
    if (diff < week) return `${Math.floor(diff / day)} days ago`;
    if (diff < month) return `${Math.floor(diff / week)} weeks ago`;
    if (diff < year) return `${Math.floor(diff / month)} months ago`;
    return `${Math.floor(diff / year)} years ago`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

// Add notification styles to the page
const notificationStyles = `
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  max-width: 400px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateX(100%);
  transition: transform 0.3s ease;
}

.notification-show {
  transform: translateX(0);
}

.notification-hide {
  transform: translateX(100%);
}

.notification-content {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.notification-message {
  flex: 1;
  margin-right: 12px;
}

.notification-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.notification-close:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.notification-error {
  border-left: 4px solid #dc3545;
}

.notification-success {
  border-left: 4px solid #28a745;
}

.notification-info {
  border-left: 4px solid #17a2b8;
}

.loading-state {
  position: relative;
  pointer-events: none;
}

.loading-state::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-loading {
  position: relative;
}

.btn-loading .loading {
  margin-right: 8px;
}
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);