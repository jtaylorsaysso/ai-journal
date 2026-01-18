/**
 * Toast Notification System
 * Provides user-friendly, non-intrusive notifications for errors and status messages
 */

const NOTIFICATION_TYPES = {
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    SUCCESS: 'success'
};

const NOTIFICATION_DURATION = {
    SHORT: 3000,
    MEDIUM: 5000,
    LONG: 8000,
    PERSISTENT: 0  // Won't auto-dismiss
};

class NotificationManager {
    constructor() {
        this.container = null;
        this.notifications = [];
        this.init();
    }

    init() {
        // Create container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            this.container.setAttribute('aria-live', 'polite');
            this.container.setAttribute('aria-atomic', 'true');
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    /**
     * Show a notification
     * @param {string} message - Message to display
     * @param {string} type - Notification type (error, warning, info, success)
     * @param {number} duration - Duration in ms (0 for persistent)
     * @param {Object} options - Additional options
     * @returns {string} - Notification ID
     */
    show(message, type = NOTIFICATION_TYPES.INFO, duration = NOTIFICATION_DURATION.MEDIUM, options = {}) {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const toast = document.createElement('div');
        toast.id = id;
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');

        // Icon based on type
        const icon = this.getIcon(type);

        // Build toast content
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-message">${this.escapeHtml(message)}</div>
                ${options.action ? `<button class="toast-action" data-action="${options.action.id}">${options.action.label}</button>` : ''}
            </div>
            <button class="toast-close" aria-label="Close notification">×</button>
        `;

        // Add to container
        this.container.appendChild(toast);
        this.notifications.push({ id, toast, type });

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('toast-show');
        });

        // Set up close button
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.dismiss(id));

        // Set up action button if present
        if (options.action) {
            const actionBtn = toast.querySelector('.toast-action');
            actionBtn.addEventListener('click', () => {
                options.action.callback();
                this.dismiss(id);
            });
        }

        // Auto-dismiss if duration is set
        if (duration > 0) {
            setTimeout(() => this.dismiss(id), duration);
        }

        return id;
    }

    /**
     * Dismiss a notification
     * @param {string} id - Notification ID
     */
    dismiss(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (!notification) return;

        notification.toast.classList.remove('toast-show');
        notification.toast.classList.add('toast-hide');

        setTimeout(() => {
            notification.toast.remove();
            this.notifications = this.notifications.filter(n => n.id !== id);
        }, 300);
    }

    /**
     * Dismiss all notifications
     */
    dismissAll() {
        this.notifications.forEach(n => this.dismiss(n.id));
    }

    /**
     * Get icon for notification type
     */
    getIcon(type) {
        const icons = {
            error: '⚠️',
            warning: '⚡',
            info: 'ℹ️',
            success: '✓'
        };
        return icons[type] || icons.info;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Convenience methods
    error(message, duration = NOTIFICATION_DURATION.LONG, options = {}) {
        return this.show(message, NOTIFICATION_TYPES.ERROR, duration, options);
    }

    warning(message, duration = NOTIFICATION_DURATION.MEDIUM, options = {}) {
        return this.show(message, NOTIFICATION_TYPES.WARNING, duration, options);
    }

    info(message, duration = NOTIFICATION_DURATION.SHORT, options = {}) {
        return this.show(message, NOTIFICATION_TYPES.INFO, duration, options);
    }

    success(message, duration = NOTIFICATION_DURATION.SHORT, options = {}) {
        return this.show(message, NOTIFICATION_TYPES.SUCCESS, duration, options);
    }
}

// Create singleton instance
const notifications = new NotificationManager();

// Export convenience functions
export function showError(message, options = {}) {
    return notifications.error(message, options.duration, options);
}

export function showWarning(message, options = {}) {
    return notifications.warning(message, options.duration, options);
}

export function showInfo(message, options = {}) {
    return notifications.info(message, options.duration, options);
}

export function showSuccess(message, options = {}) {
    return notifications.success(message, options.duration, options);
}

export function dismissNotification(id) {
    notifications.dismiss(id);
}

export function dismissAllNotifications() {
    notifications.dismissAll();
}

export { NOTIFICATION_TYPES, NOTIFICATION_DURATION };
