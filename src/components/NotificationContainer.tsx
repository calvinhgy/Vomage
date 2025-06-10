import React from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon, 
  InformationCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/solid';
import { useAppStore } from '@/store/useAppStore';
import { Notification } from '@/types';

const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => {
  const { removeNotification } = useAppStore();

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <InformationCircleIcon className="w-5 h-5 text-blue-600" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-neutral-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-neutral-50 border-neutral-200';
    }
  };

  return (
    <div
      className={`flex items-start space-x-3 p-4 rounded-lg border shadow-sm animate-slide-up ${getBackgroundColor()}`}
    >
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-900">
          {notification.message}
        </p>
      </div>
      
      <button
        onClick={() => removeNotification(notification.id)}
        className="flex-shrink-0 text-neutral-400 hover:text-neutral-600 transition-colors"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export const NotificationContainer: React.FC = () => {
  const { notifications } = useAppStore();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
};
