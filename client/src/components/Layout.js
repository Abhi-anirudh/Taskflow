import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, FolderKanban, Users, LogOut, User, Zap } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };
  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/profile', icon: User, label: 'Profile' },
    ...(user?.role === 'admin' ? [{ to: '/admin/users', icon: Users, label: 'Users' }] : []),
  ];
  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 'var(--sidebar-w)', flexShrink: 0, background: 'var(--mantle)',
        borderRight: '1px solid var(--surface0)', display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh'
      }}>
        <div style={{ padding: '20px 18px', borderBottom: '1px solid var(--surface0)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--mauve), var(--blue))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} color="var(--crust)" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>TaskFlow</div>
            <div style={{ fontSize: 10, color: 'var(--overlay0)', fontFamily: 'JetBrains Mono' }}>{user?.role}</div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600,
              color: isActive ? 'var(--mauve)' : 'var(--subtext0)',
              background: isActive ? 'rgba(203,166,247,0.1)' : 'transparent',
              transition: 'all 0.15s',
            })}>
              <Icon size={16} />{label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: 14, borderTop: '1px solid var(--surface0)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div className="avatar avatar-sm">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize: 10, color: 'var(--overlay0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}
