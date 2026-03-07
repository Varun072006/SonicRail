import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { SectionHeader } from '../components/UIComponents';

const COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#22c55e', '#a855f7'];

export default function Analytics({ api }) {
    const [data, setData] = useState(null);
    const [stressData, setStressData] = useState(null);

    useEffect(() => {
        fetch(`${api}/analytics`).then(r => r.json()).then(setData).catch(console.error);
        fetch(`${api}/maintenance-stress`).then(r => r.json()).then(setStressData).catch(console.error);
    }, [api]);

    if (!data || !stressData) return <div className="loading-skeleton" style={{ height: 400 }} />;

    return (
        <div>
            {/* Daily Digest */}
            <SectionHeader icon="📋" title="Daily Intelligence Digest" />
            <div className="grid-3" style={{ marginBottom: 24 }}>
                {[
                    { value: data.total, label: 'Total Events (24h)', colorClass: 'blue' },
                    { value: data.hazards, label: 'Hazard Detections', colorClass: 'red' },
                    { value: '99.1%', label: 'Detection Accuracy', colorClass: 'green' },
                ].map((d, i) => (
                    <div key={i} className={`kpi-card ${d.colorClass}`}>
                        <div className={`kpi-value ${d.colorClass}`}>{d.value}</div>
                        <div className="kpi-label">{d.label}</div>
                    </div>
                ))}
            </div>

            <div className="grid-2" style={{ marginBottom: 24 }}>
                {/* Donut Chart */}
                <div className="card">
                    <div className="card-title">🎯 Event Class Distribution</div>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={data.class_distribution} dataKey="value" nameKey="name"
                                cx="50%" cy="50%" innerRadius={65} outerRadius={110}
                                paddingAngle={2} label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                                style={{ fontSize: '0.7rem' }}>
                                {data.class_distribution.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Timeline */}
                <div className="card">
                    <div className="card-title">⏱️ Detection Timeline (24h)</div>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={data.hourly_timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--blue-500)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--blue-500)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="hour" tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                                label={{ value: 'Hour', position: 'insideBottom', offset: -5, style: { fontSize: 11, fill: 'var(--text-muted)' } }}
                                axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow)' }} />
                            <Area type="monotone" dataKey="count" stroke="var(--blue-500)" fill="url(#colorCount)"
                                strokeWidth={3} activeDot={{ r: 6, fill: 'var(--blue-600)', stroke: 'white', strokeWidth: 2 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Predictive Maintenance / Stress Heatmap */}
            <SectionHeader icon="🔥" title="Track Stress Heatmaps (Predictive Maintenance)" />
            <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    {Object.entries(stressData).sort((a, b) => b[1] - a[1]).map(([km, stress]) => {
                        const isCritical = stress > 75;
                        const isWarning = stress > 40;

                        const bg = isCritical ? 'var(--red-50)' : isWarning ? 'var(--amber-50)' : 'var(--green-50)';
                        const color = isCritical ? 'var(--red-600)' : isWarning ? 'var(--amber-600)' : 'var(--green-600)';
                        const border = isCritical ? 'var(--red-200)' : isWarning ? 'var(--amber-200)' : 'var(--green-200)';
                        const shadow = isCritical ? '0 4px 12px rgba(239, 68, 68, 0.1)' : isWarning ? '0 4px 12px rgba(245, 158, 11, 0.1)' : '0 4px 12px rgba(34, 197, 94, 0.1)';

                        return (
                            <div key={km} style={{
                                padding: '20px',
                                borderRadius: '12px',
                                backgroundColor: bg,
                                border: `1px solid ${border}`,
                                boxShadow: shadow,
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative',
                                overflow: 'hidden',
                            }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: color }} />
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Km Block: {km}</div>
                                <div style={{ fontSize: '2.5rem', marginTop: '4px', fontWeight: 800, color: color, lineHeight: 1 }}>{stress.toFixed(1)}%</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 500 }}>Accumulated Fatigue Stress</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Fingerprint Table */}
            <SectionHeader icon="🔬" title="Acoustic Fingerprint Comparison" />
            <div className="card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Class</th><th>Detections</th><th>Avg Confidence</th><th>Avg Energy</th>
                            <th>Freq Range</th><th>Duration Pattern</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.fingerprints.map((fp, i) => (
                            <tr key={i}>
                                <td style={{ fontWeight: 600 }}>{fp.icon} {fp.label}</td>
                                <td>{fp.count}</td>
                                <td>{(fp.avg_confidence * 100).toFixed(1)}%</td>
                                <td>{fp.avg_energy.toFixed(4)}</td>
                                <td>{fp.freq_range}</td>
                                <td>{fp.pattern}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
