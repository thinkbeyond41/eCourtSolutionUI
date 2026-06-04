import React from 'react';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Gavel, 
  Calendar, 
  Building2, 
  Users, 
  UserCheck, 
  DownloadCloud, 
  Settings,
  Scale,
  X
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  drawerOpen: boolean;
  onDrawerClose: () => void;
}

const menuItems = [
  { id: 'dashboard',  label: 'Dashboard',     shortLabel: 'Home',     icon: LayoutDashboard },
  { id: 'cases',      label: 'Case Status',   shortLabel: 'Cases',    icon: FolderOpen },
  { id: 'judgments',  label: 'Judgments',     shortLabel: 'Judgments',icon: Gavel },
  { id: 'causelists', label: 'Cause Lists',   shortLabel: 'Lists',    icon: Calendar },
  { id: 'courts',     label: 'Court Registry',shortLabel: 'Courts',   icon: Building2 },
  { id: 'advocates',  label: 'Advocates',     shortLabel: 'Advocates',icon: Users },
  { id: 'judges',     label: 'Judges Profile',shortLabel: 'Judges',   icon: UserCheck },
  { id: 'bulk',       label: 'Bulk Downloads',shortLabel: 'Bulk',     icon: DownloadCloud },
  { id: 'admin',      label: 'Admin Ops',     shortLabel: 'Admin',    icon: Settings },
];

const NavButton: React.FC<{
  item: typeof menuItems[0];
  isActive: boolean;
  onClick: () => void;
}> = ({ item, isActive, onClick }) => {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.85rem 1.25rem',
        width: '100%',
        background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
        border: '1px solid',
        borderColor: isActive ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
        borderRadius: 'var(--radius-md)',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: '0.92rem',
        fontWeight: isActive ? 600 : 500,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'var(--transition-fast)',
        boxShadow: isActive ? '0 0 10px rgba(99, 102, 241, 0.08)' : 'none',
      }}
      className={isActive ? 'pulse-glow' : ''}
    >
      <Icon size={18} style={{
        color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
        flexShrink: 0,
        transition: 'var(--transition-fast)',
      }} />
      {item.label}
    </button>
  );
};

const SidebarContent: React.FC<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
  showClose?: boolean;
  onClose?: () => void;
}> = ({ activeTab, setActiveTab, showClose, onClose }) => (
  <>
    {/* Logo area */}
    <div style={{
      padding: '1.5rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      borderBottom: '1px solid var(--border-glass)',
      flexShrink: 0,
    }}>
      <div style={{
        background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
        width: '38px',
        height: '38px',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 15px var(--accent-glow-strong)',
        flexShrink: 0,
      }}>
        <Scale size={20} color="white" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{
          fontSize: '1.1rem',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #ffffff 0%, var(--text-secondary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          whiteSpace: 'nowrap',
        }}>eCourtSolution</h1>
        <span style={{ fontSize: '0.65rem', color: 'var(--accent-secondary)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          PORTAL v1.0
        </span>
      </div>
      {showClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '6px',
          }}
        >
          <X size={20} />
        </button>
      )}
    </div>

    {/* Nav items */}
    <nav style={{
      flex: 1,
      padding: '1rem 0.75rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.375rem',
      overflowY: 'auto',
    }}>
      {menuItems.map((item) => (
        <NavButton
          key={item.id}
          item={item}
          isActive={activeTab === item.id}
          onClick={() => setActiveTab(item.id)}
        />
      ))}
    </nav>

    {/* Footer */}
    <div style={{
      padding: '1.25rem',
      borderTop: '1px solid var(--border-glass)',
      fontSize: '0.72rem',
      color: 'var(--text-muted)',
      textAlign: 'center',
      flexShrink: 0,
    }}>
      Operon Labs AI &copy; 2026
    </div>
  </>
);

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, drawerOpen, onDrawerClose }) => {
  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="glass-panel sidebar-desktop">
        <SidebarContent activeTab={activeTab} setActiveTab={setActiveTab} />
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div className="sidebar-overlay" onClick={onDrawerClose}>
          <div className="sidebar-drawer" onClick={(e) => e.stopPropagation()}>
            <SidebarContent
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              showClose
              onClose={onDrawerClose}
            />
          </div>
        </div>
      )}

      {/* ── Mobile bottom nav bar ── */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`bottom-nav-item${isActive ? ' active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={20} />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
