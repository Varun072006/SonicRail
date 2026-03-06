export function KpiCard({ value, label, trend, direction, color = 'blue', tooltip }) {
    const trendIcon = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '';
    const trendClass = direction === 'down' && label?.toLowerCase().includes('response') ? 'up' : direction;
    return (
        <div className={`kpi-card ${color}`} title={tooltip}>
            <div className={`kpi-value ${color}`}>{value}</div>
            <div className="kpi-label">{label}</div>
            {trend !== undefined && trend !== 0 && (
                <div className={`kpi-trend ${trendClass}`}>{trendIcon} {Math.abs(trend)}</div>
            )}
        </div>
    );
}

export function AlertCard({ severity, title, detail, subDetail, active }) {
    const cssClass = severity?.includes('P1') ? 'p1' : severity?.includes('P2') ? 'p2' : 'p3';
    return (
        <div className={`alert-card ${cssClass} ${active ? 'active' : ''}`}>
            <div className="alert-title">{title}</div>
            <div className="alert-detail">{detail}</div>
            {subDetail && <div className="alert-detail" style={{ marginTop: 4, fontSize: '0.7rem' }}>{subDetail}</div>}
        </div>
    );
}

export function Badge({ severity }) {
    const map = {
        P1_CRITICAL: { label: 'P1 Critical', cls: 'p1' },
        P2_WARNING: { label: 'P2 Warning', cls: 'p2' },
        P3_ADVISORY: { label: 'P3 Advisory', cls: 'p3' },
        NORMAL: { label: 'Normal', cls: 'normal' },
    };
    const { label, cls } = map[severity] || { label: severity, cls: 'normal' };
    return <span className={`badge ${cls}`}>{label}</span>;
}

export function SectionHeader({ icon, title }) {
    return <div className="section-header">{icon} {title}</div>;
}

export function GaugeRing({ value, size = 100, color = 'var(--blue-500)', label }) {
    const radius = size / 2 - 8;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(value / 100, 1);
    const offset = circumference * (1 - progress);
    return (
        <div className="gauge-container">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--bg-secondary)" strokeWidth="7" />
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="7"
                    strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dashoffset 1s ease' }} />
                <text x="50%" y="50%" textAnchor="middle" dy="0.35em"
                    style={{ fontSize: size * 0.2, fontWeight: 700, fill: 'var(--text-primary)' }}>
                    {Math.round(value)}%
                </text>
            </svg>
            {label && <div className="gauge-label">{label}</div>}
        </div>
    );
}

export function ProbabilityBar({ label, value, isHighlight }) {
    return (
        <div className="prob-bar-container">
            <div className="prob-bar-label">
                <span>{label}</span>
                <span>{(value * 100).toFixed(1)}%</span>
            </div>
            <div className="prob-bar-track">
                <div className={`prob-bar-fill ${isHighlight ? 'highlight' : ''}`} style={{ width: `${value * 100}%` }} />
            </div>
        </div>
    );
}
