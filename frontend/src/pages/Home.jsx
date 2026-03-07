import { Link } from 'react-router-dom';

const stats = [
    { value: '8', label: 'Block Sections', sub: 'Delhi–Agra Corridor' },
    { value: '5', label: 'Threat Classes', sub: 'AI-Powered Detection' },
    { value: '< 2s', label: 'Response Time', sub: 'Detection to Decision' },
    { value: '50 km', label: 'Coverage', sub: 'Continuous Monitoring' },
];

const navCards = [
    { to: '/command', icon: '⚡', title: 'Command Center', desc: 'Live acoustic anomaly detection and real-time interactive mapping.' },
    { to: '/health', icon: '📊', title: 'Track Health', desc: 'Long-term structural integrity analysis, heatmaps, and trend gauges.' },
    { to: '/incidents', icon: '🛡️', title: 'Incident Manager', desc: 'Comprehensive log of all acoustic events, actions, and historical data.' },
    { to: '/analytics', icon: '📈', title: 'Analytics Engine', desc: 'Deep dive into event distributions, time-series analysis, and acoustic fingerprints.' },
    { to: '/ai', icon: '🧠', title: 'AI Co-Pilot', desc: 'Generative AI assistant for interactive incident reporting and model performance metrics.' },
    { to: '/admin', icon: '⚙️', title: 'Administration', desc: 'Global protocol management, sensitivity thresholds, and system architecture.' },
];

export default function Home() {
    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
            {/* Hero Section */}
            <div style={{
                textAlign: 'center', padding: '80px 20px 60px',
                background: 'linear-gradient(180deg, rgba(239, 246, 255, 0.5) 0%, rgba(255,255,255,0) 100%)',
                borderRadius: '0 0 40px 40px', marginBottom: '40px'
            }}>
                <div style={{
                    width: '80px', height: '80px', background: 'var(--bg-card)', borderRadius: '24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem',
                    margin: '0 auto 24px', boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.2)',
                    border: '1px solid var(--blue-100)'
                }}>
                    🚆
                </div>
                <h1 style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--blue-700)', letterSpacing: '-1px', marginBottom: '12px' }}>
                    SonicRail <span style={{ color: 'var(--cyan-500)' }}>Intelligence</span>
                </h1>
                <div style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '16px' }}>
                    National Track Safety & Predictive Monitoring System
                </div>
                <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: '650px', margin: '0 auto', lineHeight: 1.6 }}>
                    An advanced Integrated Distributed Acoustic Sensing (DAS) platform designed for real-time railway track hazard detection, structural predictive maintenance, and automated safety protocols.
                </div>
            </div>

            {/* Core Metrics */}
            <div style={{ marginBottom: '60px', display: 'flex', justifyContent: 'center' }}>
                <div className="stat-grid" style={{ width: '100%', maxWidth: '1000px', margin: 0, gap: '24px' }}>
                    {stats.map(s => (
                        <div key={s.label} style={{
                            background: '#ffffff', borderRadius: '20px', padding: '32px 24px',
                            textAlign: 'center', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.08)',
                            border: '1px solid var(--border)', transition: 'transform 0.2s', cursor: 'default'
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--blue-600)', lineHeight: 1 }}>{s.value}</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '12px' }}>{s.label}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 500 }}>{s.sub}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detailed Feature Navigation */}
            <div style={{ padding: '0 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px' }}>
                    <div style={{ width: '40px', height: '4px', background: 'var(--blue-500)', borderRadius: '2px' }} />
                    <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: 800 }}>Portal Modules & Features</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                    {navCards.map(c => (
                        <Link to={c.to} key={c.to} style={{ textDecoration: 'none' }}>
                            <div style={{
                                background: '#ffffff', border: '1px solid var(--border)', borderRadius: '16px',
                                padding: '24px', display: 'flex', gap: '20px', alignItems: 'flex-start',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', transition: 'all 0.2s'
                            }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--blue-300)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(37, 99, 235, 0.1)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}
                            >
                                <div style={{
                                    fontSize: '2rem', background: 'var(--blue-50)', width: '60px', height: '60px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: '12px', flexShrink: 0, color: 'var(--blue-600)'
                                }}>
                                    {c.icon}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>{c.title}</h3>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{c.desc}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '60px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>
                SonicRail Analytics Engine v2.0 • Northern Railway Zone • Secured by AI
            </div>
        </div>
    );
}
