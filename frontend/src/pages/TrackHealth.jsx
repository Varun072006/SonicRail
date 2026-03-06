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
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2 }}>
                    Overall Track Health Index
                </div>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: overallColor }}>{health.overall}%</div>
            </div>

            {/* Section Gauges */}
            <SectionHeader icon="🔋" title="Section Health Gauges" />
            <div className="grid-4" style={{ marginBottom: 24 }}>
                {health.sections.map(s => (
                    <div className="card" key={s.id} style={{ textAlign: 'center', padding: 16 }}>
                        <GaugeRing value={s.health} color={getColor(s.health)} size={110} label={s.id} />
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
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
                    <div className="card" style={{ marginBottom: 24, overflowX: 'auto' }}>
                        <table className="data-table" style={{ fontSize: '0.7rem' }}>
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
                                            const bg = risk > 60 ? 'var(--red-100)' : risk > 30 ? 'var(--amber-100)' : 'var(--green-100)';
                                            const color = risk > 60 ? 'var(--red-600)' : risk > 30 ? 'var(--amber-600)' : 'var(--green-600)';
                                            return (
                                                <td key={i} style={{ background: bg, color, textAlign: 'center', padding: '4px 2px', fontWeight: 600 }}>
                                                    {Math.round(risk)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
                        maintenance.slice(0, 6).map((item, i) => (
                            <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '10px 12px', borderBottom: '1px solid var(--border-light)',
                                borderLeft: `3px solid ${getColor(item.health)}`, marginBottom: 4, borderRadius: 4
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.section}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.issue} → {item.action}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 700, color: getColor(item.health) }}>{item.health}%</div>
                                    <span className={`badge ${item.urgency === 'CRITICAL' ? 'p1' : 'p2'}`}>{item.urgency}</span>
                                </div>
                            </div>
                        ))
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
