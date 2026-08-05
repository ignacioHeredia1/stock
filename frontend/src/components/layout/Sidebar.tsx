import React from 'react';
import {
  LayoutDashboard, Package, ArrowLeftRight, ShoppingBag, FileBarChart, Store
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onSelectView, isOpen, onClose }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Productos y Stock', icon: Package, highlight: true },
    { id: 'purchases', label: 'Compras y Reposición', icon: ShoppingBag },
    { id: 'stock', label: 'Movimientos de Stock', icon: ArrowLeftRight },
    { id: 'reports', label: 'Reportes', icon: FileBarChart },
  ];

  const handleSelect = (view: string) => {
    onSelectView(view);
    if (onClose) onClose();
  };

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar-container ${isOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div style={{
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 800
        }}>
          <Store size={22} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0, fontWeight: 800 }}>
            Control<span style={{ color: 'var(--accent-primary)' }}>Stock</span>
          </h1>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Kiosco de Barrio</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: isActive
                  ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))'
                  : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.92rem',
                cursor: 'pointer',
                textAlign: 'left',
                border: 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        Kiosco Control Stock &copy; 2026
      </div>
    </aside>
    </>
  );
};
