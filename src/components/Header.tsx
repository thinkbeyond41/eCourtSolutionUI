import React, { useState, useEffect } from 'react';
import { ShieldCheck, CloudLightning, ShieldAlert, Cpu, Menu } from 'lucide-react';
import { apiConfig } from '../services/api';

// VITE_SHOW_MOCK_TOGGLE controls visibility of the Mock/Live toggle in the header.
// Set to 'false' in production .env to hide it from end-users.
// Defaults to true (visible) for dev and staging.
const SHOW_MOCK_TOGGLE = import.meta.env.VITE_SHOW_MOCK_TOGGLE !== 'false';

interface HeaderProps {
  title: string;
  onMockToggle: (isMock: boolean) => void;
  onMenuOpen: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onMockToggle, onMenuOpen }) => {
  const [isMock, setIsMock] = useState(apiConfig.useMock);
  // Tracks live backend health; derived apiStatus also accounts for mock mode
  const [liveStatus, setLiveStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Derive status without calling setState synchronously in the effect
  const apiStatus = isMock ? 'online' : liveStatus;

  useEffect(() => {
    if (isMock) return; // status derived above — no setState needed here
    let cancelled = false;
    fetch(`${apiConfig.baseUrl}/health`, {
      headers: { 'X-API-Key': apiConfig.apiKey },
    })
      .then(res => res.json())
      .then(data => { if (!cancelled) setLiveStatus(data?.status === 'ok' ? 'online' : 'offline'); })
      .catch(() => { if (!cancelled) setLiveStatus('offline'); });
    return () => { cancelled = true; };
  }, [isMock]);

  const handleToggle = () => {
    const newVal = !isMock;
    setIsMock(newVal);
    apiConfig.useMock = newVal;
    onMockToggle(newVal);
  };

  const statusClass =
    apiStatus === 'online' ? 'badge-success' :
    apiStatus === 'offline' ? 'badge-danger' : 'badge-warning';

  return (
    <header className="glass-panel app-header">
      {/* Hamburger — visible on ≤1024px via CSS */}
      <button
        className="hamburger-btn"
        onClick={onMenuOpen}
        aria-label="Open navigation menu"
      >
        <Menu size={22} />
      </button>

      {/* Page title */}
      <h2 className="header-title">{title}</h2>

      {/* Right-side actions */}
      <div className="header-actions">
        {/* Mock-data toggle — hidden in production when VITE_SHOW_MOCK_TOGGLE=false */}
        {SHOW_MOCK_TOGGLE && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '0.4rem 0.85rem',
            borderRadius: '9999px',
            border: '1px solid var(--border-glass)',
            flexShrink: 0,
          }}>
            <Cpu size={14} color={isMock ? 'var(--accent-secondary)' : 'var(--accent-primary)'} />
            {/* Label hidden on very small screens via inline responsive trick */}
            <span className="desktop-only" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Mock:
            </span>
            <button
              id="mock-toggle"
              onClick={handleToggle}
              title={isMock ? 'Using mock data' : 'Using live API'}
              style={{
                position: 'relative',
                width: '40px',
                height: '22px',
                borderRadius: '9999px',
                background: isMock ? 'var(--accent-secondary)' : 'var(--bg-tertiary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)',
                flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute',
                top: '2px',
                left: isMock ? '20px' : '2px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'white',
                transition: 'var(--transition-smooth)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        )}

        {/* API status badge */}
        <div className={`badge ${statusClass}`} style={{ height: '30px' }}>
          {apiStatus === 'online'  ? <><ShieldCheck size={13} /><span>Online</span></> :
           apiStatus === 'offline' ? <><ShieldAlert size={13} /><span>Offline</span></> :
                                     <><CloudLightning size={13} /><span>…</span></>}
        </div>
      </div>
    </header>
  );
};
