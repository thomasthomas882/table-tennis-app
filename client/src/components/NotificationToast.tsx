import { useEffect, useRef, useState } from 'react';
import { Notification } from '../types';
import { sounds } from '../utils/sounds';

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

function NotificationItem({ n, onDismiss }: { n: Notification; onDismiss: (id: number) => void }) {
  const [exiting, setExiting] = useState(false);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
    }, 4750);
    return () => clearTimeout(timer);
  }, []);

  // Bulletproof unmount fallback
  useEffect(() => {
    if (exiting) {
      const timer = setTimeout(() => onDismiss(n.id), 250);
      return () => clearTimeout(timer);
    }
  }, [exiting, n.id, onDismiss]);

  return (
    <div
      className={`flex items-start gap-3 border rounded-lg px-4 py-3 shadow-xl backdrop-blur-sm ${
        exiting ? 'animate-slide-out' : 'animate-slide-in'
      } ${typeStyles[n.type]}`}
    >
      <span className="text-lg flex-shrink-0">{typeIcon[n.type]}</span>
      <p className="text-sm flex-1">{n.message}</p>
      <button
        onClick={() => setExiting(true)}
        className="text-current opacity-60 hover:opacity-100 flex-shrink-0 text-lg leading-none transition-opacity"
      >×</button>
    </div>
  );
}

export default function NotificationToast({ notifications, onDismiss }: Props) {
  const prevLen = useRef(0);

  useEffect(() => {
    if (notifications.length > prevLen.current && notifications[0]) {
      sounds.notification(notifications[0].type);
    }
    prevLen.current = notifications.length;
  }, [notifications]);

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 max-w-sm w-full pointer-events-none">
      {/* Set pointer-events-none on wrapper so you can click through empty space,
          then pointer-events-auto on the children so they can be dismissed */}
      {notifications.map((n) => (
        <div key={n.id} className="pointer-events-auto">
          <NotificationItem n={n} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
