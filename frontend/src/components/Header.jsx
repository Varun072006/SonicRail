import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Clock } from 'lucide-react';

const pageNames = {
    '/': 'Home',
    '/command': 'Command Center',
    '/health': 'Track Health & Prediction',
    '/incidents': 'Incident Manager',
    '/analytics': 'Analytics & Reports',
    '/ai': 'AI Model Center',
    '/admin': 'Administration',
};

export default function Header() {
    const location = useLocation();
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const pageName = pageNames[location.pathname] || 'SonicRail';

    return (
        <header className="header">
            <div className="header-left">
                <h2>{pageName}</h2>
                <span className="header-breadcrumb">
                    Northern Railway • Delhi Division • Delhi–Agra Corridor
                </span>
            </div>
            <div className="header-right">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span className="status-indicator">
                        <span className="status-dot green" />
                        <span>AI Engine</span>
                    </span>
                    <span className="status-indicator">
                        <span className="status-dot green" />
                        <span>Pipeline</span>
                    </span>
                </div>
                <div className="header-badge">
                    <Bell size={20} color="var(--text-secondary)" />
                    <span className="count">3</span>
                </div>
                <div className="header-clock">
                    <Clock size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {time.toLocaleTimeString('en-IN', { hour12: false })} IST
                </div>
            </div>
        </header>
    );
}
