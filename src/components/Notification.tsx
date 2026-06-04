import React from 'react';
import { Info } from 'lucide-react';

interface NotificationProps {
  message: string | null;
}

export const Notification: React.FC<NotificationProps> = ({ message }) => {
  if (!message) return null;
  return (
    <div
      className="animate-fade-in"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 'calc(var(--bottom-nav-height) + 1rem)',
        right: '1.5rem',
        background: 'rgba(17, 24, 39, 0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--border-glass)',
        borderRadius: 'var(--radius-md)',
        padding: '0.75rem 1.1rem',
        color: 'var(--text-primary)',
        fontSize: '0.85rem',
        fontWeight: 500,
        zIndex: 800,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        maxWidth: '320px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
      }}
    >
      <Info size={15} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
      {message}
    </div>
  );
};
