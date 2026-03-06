import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { SectionHeader } from '../components/UIComponents';

const COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#22c55e', '#a855f7'];

export default function Analytics({ api }) {
    const [data, setData] = useState(null);

    useEffect(() => {
        fetch(`${api}/analytics`).then(r => r.json()).then(setData).catch(console.error);
    }, [api]);

    if (!data) return <div className="loading-skeleton" style={{ height: 400 }} />;

    return (
        <div>
            {/* Daily Digest */}
            <SectionHeader icon="📋" title="Daily Intelligence Digest" />
            <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
                    {[
                        { value: data.total, label: 'Total Events (24h)', color: 'var(--blue-600)' },
                        { value: data.hazards, label: 'Hazard Detections', color: 'var(--red-500)' },
                        { value: '99.1%', label: 'Detection Accuracy', color: 'var(--green-500)' },
                    ].map((d, i) => (
                        <div key={i}>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: d.color }}>{d.value}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{d.label}</div>
                        </div>
                    ))}
                </div>
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
                        <AreaChart data={data.hourly_timeline}>
                            <XAxis dataKey="hour" tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                                label={{ value: 'Hour', position: 'insideBottom', offset: -5, style: { fontSize: 11, fill: 'var(--text-muted)' } }} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="count" stroke="var(--blue-500)" fill="var(--blue-100)"
                                strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
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
