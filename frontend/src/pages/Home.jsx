import { Link } from 'react-router-dom';

const stats = [
    { value: '8', label: 'Block Sections', sub: 'Delhi–Agra Corridor' },
    { value: '5', label: 'Threat Classes', sub: 'AI-Powered Detection' },
    { value: '< 2s', label: 'Response Time', sub: 'Detection to Decision' },
    { value: '50 km', label: 'Coverage', sub: 'Continuous Monitoring' },
];

const navCards = [
    { to: '/command', icon: '⚡', title: 'Command Center', desc: 'Live detection, actions, signals' },
    { to: '/health', icon: '📊', title: 'Track Health', desc: 'Health gauges, risk heatmap, trends' },
    { to: '/incidents', icon: '🛡️', title: 'Incident Manager', desc: 'Track and resolve incidents' },
    { to: '/analytics', icon: '📈', title: 'Analytics', desc: 'Distribution, timeline, fingerprints' },
    { to: '/ai', icon: '🧠', title: 'AI Center', desc: 'Model metrics, confusion matrix, ROC' },
    { to: '/admin', icon: '⚙️', title: 'Administration', desc: 'Settings, protocols, architecture' },
];

export default function Home() {
    return (
        <div>
            <div className="hero">
                <div className="hero-icon">🚆</div>
                <h1>SonicRail</h1>
                <div className="subtitle">National Track Safety Intelligence System</div>
                <div className="description">
                    Integrated Distributed Acoustic Sensing platform for real-time railway track hazard
                    detection, predictive maintenance, and automated safety response.
                </div>
            </div>

            <div className="stat-grid">
                {stats.map(s => (
                    <div className="stat-card" key={s.label}>
                        <div className="stat-value">{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                        <div className="stat-sub">{s.sub}</div>
                    </div>
                ))}
            </div>

            <div className="section-header">🚀 Quick Navigation</div>
            <div className="nav-grid">
                {navCards.map(c => (
                    <Link to={c.to} className="nav-card" key={c.to}>
                        <div className="icon">{c.icon}</div>
                        <div>
                            <h3>{c.title}</h3>
                            <p>{c.desc}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
