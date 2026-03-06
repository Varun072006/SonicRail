import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Activity, Shield, BarChart3, Brain, Settings, Train, Map } from 'lucide-react';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Home' },
    { to: '/command', icon: Activity, label: 'Command Center' },
    { to: '/health', icon: Train, label: 'Track Health' },
    { to: '/map', icon: Map, label: 'GeoRail Map' },
    { to: '/incidents', icon: Shield, label: 'Incident Manager' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/ai', icon: Brain, label: 'AI Center' },
    { to: '/admin', icon: Settings, label: 'Administration' },
];

export default function Sidebar() {
    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <h1>🚆 SonicRail</h1>
                <p>Track Safety Intelligence</p>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <Icon size={20} />
                        {label}
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-status">
                <div className="status-indicator">
                    <span className="status-dot green" />
                    <span style={{ color: 'var(--text-secondary)' }}>System Operational</span>
                </div>
                <div style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: '0.65rem' }}>
                    SonicRail v1.0 • Northern Railway Zone<br />
                    © 2026 SonicRail Team
                </div>
            </div>
        </aside>
    );
}
