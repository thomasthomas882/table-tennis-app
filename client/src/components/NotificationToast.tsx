import { Notification } from '../types';

const typeStyles: Record<Notification['type'], string> = {
  info: 'bg-blue-900/80 border-blue-700 text-blue-100',
  success: 'bg-green-900/80 border-green-700 text-green-100',
  match: 'bg-orange-900/80 border-orange-700 text-orange-100',
  warning: 'bg-yellow-900/80 border-yellow-700 text-yellow-100',
};

const typeIcon: Record<Notification['type'], string> = {
  info: 'ℹ',
  success: '✓',
  match: '🏓',
  warning: '⚠',
};

interface Props {
  notifications: Notification[];
  onDismiss: (id: number) => void;
}

export default function NotificationToast({ notifications, onDismiss }: Props) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 max-w-sm w-full">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`flex items-start gap-3 border rounded-lg px-4 py-3 shadow-xl backdrop-blur-sm animate-slide-in ${typeStyles[n.type]}`}
        >
          <span className="text-lg flex-shrink-0">{typeIcon[n.type]}</span>
          <p className="text-sm flex-1">{n.message}</p>
          <button
            onClick={() => onDismiss(n.id)}
            className="text-current opacity-60 hover:opacity-100 flex-shrink-0 text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
