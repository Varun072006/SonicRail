import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { GaugeRing, SectionHeader } from '../components/UIComponents';

export default function TrackHealth({ api }) {
    const [health, setHealth] = useState(null);
    const [heatmap, setHeatmap] = useState(null);
    const [trends, setTrends] = useState(null);
    const [maintenance, setMaintenance] = useState([]);
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        Promise.all([
            fetch(`${api}/track-health`).then(r => r.json()),
            fetch(`${api}/risk-heatmap`).then(r => r.json()),
            fetch(`${api}/trends`).then(r => r.json()),
            fetch(`${api}/maintenance`).then(r => r.json()),
            fetch(`${api}/predictive-alerts`).then(r => r.json()),
        ]).then(([h, hm, tr, m, a]) => {
            setHealth(h); setHeatmap(hm); setTrends(tr); setMaintenance(m); setAlerts(a);
        }).catch(console.error);
    }, [api]);

    if (!health) return <div className="loading-skeleton" style={{ height: 400 }} />;

    const getColor = (h) => h >= 80 ? 'var(--green-500)' : h >= 50 ? 'var(--amber-500)' : 'var(--red-500)';
    const overallColor = getColor(health.overall);

    return (
        <div>
            {/* Overall Health */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
                <div className={`kpi-card ${health.overall >= 80 ? 'green' : health.overall >= 50 ? 'amber' : 'red'}`} style={{ minWidth: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
                        Overall Track Health Index
                    </div>
                    <div className={`kpi-value ${health.overall >= 80 ? 'green' : health.overall >= 50 ? 'amber' : 'red'}`} style={{ fontSize: '3.5rem' }}>
                        {health.overall}%
                    </div>
                </div>
            </div>

            {/* Section Gauges */}
            <SectionHeader icon="🔋" title="Section Health Gauges" />
            <div className="grid-4" style={{ marginBottom: 24 }}>
                {health.sections.map(s => (
                    <div className="card" key={s.id} style={{ textAlign: 'center', padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <GaugeRing value={s.health} color={getColor(s.health)} size={110} label={s.id} />
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: 12 }}>
                            Block Section {s.id.replace('BS-', '')}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            KM {s.km_start}–{s.km_end}
                        </div>
                        <span className={`badge ${s.status === 'GOOD' ? 'normal' : s.status === 'CAUTION' ? 'p2' : 'p1'}`}
                            style={{ marginTop: 6, display: 'inline-block' }}>
                            {s.status}
                        </span>
                    </div>
                ))}
            </div>

            {/* Risk Heatmap */}
            {heatmap && (
                <>
                    <SectionHeader icon="📊" title="24-Hour Risk Forecast" />
                    <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table" style={{ fontSize: '0.75rem', border: 'none', margin: 0 }}>
                                <thead>
                                    <tr>
                                        <th>Section</th>
                                        {Array.from({ length: 24 }, (_, i) => (
                                            <th key={i} style={{ padding: '6px 4px', textAlign: 'center' }}>{String(i).padStart(2, '0')}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {heatmap.map(row => (
                                        <tr key={row.section}>
                                            <td style={{ fontWeight: 600 }}>{row.section}</td>
                                            {row.risks.map((risk, i) => {
                                                const intensity = risk / 100;
                                                const bg = `rgba(${risk > 60 ? '239, 68, 68' : risk > 30 ? '245, 158, 11' : '34, 197, 94'}, ${0.1 + (intensity * 0.4)})`;
                                                const color = risk > 60 ? 'var(--red-700)' : risk > 30 ? 'var(--amber-700)' : 'var(--green-700)';
                                                return (
                                                    <td key={i} style={{
                                                        background: bg, color, textAlign: 'center', padding: '8px 4px',
                                                        fontWeight: 600, borderLeft: '1px solid rgba(255,255,255,0.2)',
                                                        borderBottom: '1px solid rgba(255,255,255,0.2)'
                                                    }}>
                                                        {Math.round(risk)}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <div className="grid-2">
                {/* Trends */}
                {trends && (
                    <div className="card">
                        <div className="card-title">📈 Event Frequency Trends (7 Days)</div>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart>
                                <XAxis dataKey="day" type="category" allowDuplicatedCategory={false}
                                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                                <Tooltip />
                                {Object.entries(trends).map(([sid, daily], i) => {
                                    const data = daily.map((v, d) => ({ day: `Day ${d + 1}`, [sid]: v }));
                                    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#f97316', '#14b8a6'];
                                    return (
                                        <Line key={sid} data={data} dataKey={sid} name={sid}
                                            stroke={colors[i % colors.length]} strokeWidth={2} dot={{ r: 3 }} />
                                    );
                                })}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Maintenance Queue */}
                <div className="card">
                    <div className="card-title">🔧 Maintenance Priority Queue</div>
                    {maintenance.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {maintenance.slice(0, 6).map((item, i) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '12px 16px', background: 'var(--bg-secondary)',
                                    borderLeft: `4px solid ${getColor(item.health)}`, borderRadius: '6px',
                                    transition: 'transform 0.2s', cursor: 'default'
                                }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Block Section {item.section.replace('BS-', '')}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>{item.issue} <span style={{ opacity: 0.5 }}>→</span> {item.action}</div>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: getColor(item.health) }}>{item.health}%</div>
                                        <span className={`badge ${item.urgency === 'CRITICAL' ? 'p1' : 'p2'}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{item.urgency}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: 'var(--green-500)', padding: 20 }}>✓ All sections healthy</div>
                    )}
                </div>
            </div>

            {/* Predictive Alerts */}
            {alerts.length > 0 && (
                <div style={{ marginTop: 24 }}>
                    <SectionHeader icon="⚠️" title="Predictive Maintenance Alerts" />
                    {alerts.map((a, i) => (
                        <div key={i} className={`alert-card ${a.urgency === 'IMMEDIATE' ? 'p1' : 'p2'}`}>
                            <div className="alert-title">{a.section} – {a.urgency}</div>
                            <div className="alert-detail">{a.message}</div>
                            <div className="alert-detail" style={{ marginTop: 4, color: 'var(--blue-600)' }}>
                                Recommended: {a.recommended_action}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
