import { useState, useEffect } from 'react';
import { KpiCard, SectionHeader, Badge } from '../components/UIComponents';

const STATUS_COLORS = {
    DETECTED: 'var(--red-500)', ACKNOWLEDGED: 'var(--amber-500)',
    INVESTIGATING: 'var(--blue-500)', RESOLVED: 'var(--green-500)',
};

export default function IncidentManager({ api }) {
    const [data, setData] = useState(null);
    const [fbStats, setFbStats] = useState(null);
    const [submitting, setSubmitting] = useState({});

    // Modal states
    const [resolvingId, setResolvingId] = useState(null);
    const [resolutionData, setResolutionData] = useState({ resolver: '', action: '', condition: '', notes: '' });

    const [viewingInc, setViewingInc] = useState(null);

    const loadData = () => {
        fetch(`${api}/incidents`).then(r => r.json()).then(setData).catch(console.error);
        fetch(`${api}/feedback/stats`).then(r => r.json()).then(setFbStats).catch(console.error);
    };

    useEffect(() => { loadData(); }, [api]);

    const acknowledge = async (id) => {
        await fetch(`${api}/incident/${id}/acknowledge`, { method: 'POST' });
        loadData();
    };

    const investigate = async (id) => {
        await fetch(`${api}/incident/${id}/investigate`, { method: 'POST' });
        loadData();
    };

    const resolve = async () => {
        if (!resolutionData.resolver || !resolutionData.action) {
            alert("Resolver Name and Action required."); return;
        }
        await fetch(`${api}/incident/${resolvingId}/resolve`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resolutionData),
        });
        setResolvingId(null);
        setResolutionData({ resolver: '', action: '', condition: '', notes: '' });
        loadData();
    };

    const submitFeedback = async (incidentId, verdict) => {
        setSubmitting(prev => ({ ...prev, [incidentId]: verdict }));
        try {
            await fetch(`${api}/feedback`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ incident_id: incidentId, verdict }),
            });
            loadData();
        } finally {
            setTimeout(() => setSubmitting(prev => { const n = { ...prev }; delete n[incidentId]; return n; }), 1500);
        }
    };

    if (!data) return <div className="loading-skeleton" style={{ height: 400 }} />;

    const { incidents, stats, statuses } = data;
    const grouped = {};
    statuses.forEach(s => { grouped[s] = []; });
    incidents.forEach(inc => {
        if (grouped[inc.status]) grouped[inc.status].push(inc);
    });

    return (
        <div>
            {/* KPI Strip */}
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                <KpiCard value={stats.total} label="Total Incidents" color="blue" />
                <KpiCard value={stats.active} label="Active" color={stats.active > 0 ? 'amber' : 'green'} />
                <KpiCard value={stats.resolved} label="Resolved" color="green" />
                <KpiCard value={stats.p1_count} label="P1 Critical" color="red" />
                <KpiCard value={stats.p2_count} label="P2 Warning" color="amber" />
                <KpiCard value={`${stats.resolution_rate}%`} label="Resolution Rate" color="blue" />
                <KpiCard
                    value={fbStats ? `${(fbStats.confirmed_rate * 100).toFixed(0)}%` : '—'}
                    label="Operator-Confirmed" color="green"
                    tooltip={`${fbStats?.confirmed || 0} confirmed, ${fbStats?.false_alarms || 0} false alarms`}
                />
            </div>

            {/* Feedback stats bar */}
            {fbStats && fbStats.total_feedback > 0 && (
                <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>🔁 Self-Learning Feedback Loop</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <b style={{ color: 'var(--green-600)' }}>{fbStats.confirmed}</b> confirmed ·{' '}
                            <b style={{ color: 'var(--red-500)' }}>{fbStats.false_alarms}</b> false alarms ·{' '}
                            <b>{fbStats.total_feedback}</b> total
                        </div>
                        <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 8, height: 8, minWidth: 100 }}>
                            <div style={{
                                width: `${fbStats.confirmed_rate * 100}%`, height: '100%',
                                background: 'var(--green-500)', borderRadius: 8, transition: 'width 0.5s',
                            }} />
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--green-600)' }}>
                            {(fbStats.confirmed_rate * 100).toFixed(1)}%
                        </div>
                    </div>
                </div>
            )}

            {/* Kanban Board */}
            <SectionHeader icon="📋" title="Incident Board" />
            <div className="kanban-board" style={{ marginBottom: 24 }}>
                {statuses.map(status => (
                    <div className="kanban-column" key={status}>
                        <div className="kanban-header" style={{ borderColor: STATUS_COLORS[status], color: STATUS_COLORS[status] }}>
                            {status} ({grouped[status]?.length || 0})
                        </div>
                        {grouped[status]?.slice(0, 5).map((inc, i) => {
                            const fb = submitting[inc.incident_id];
                            return (
                                <div className="kanban-item" key={i} style={{ borderColor: STATUS_COLORS[status] }}>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 3 }}>{inc.incident_id}</div>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                        {inc.class_name?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                        {inc.section} • KM {inc.km} • {inc.timestamp}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--blue-600)', marginTop: 4 }}>{inc.action}</div>

                                    {/* Feedback buttons */}
                                    <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                                        <button className="btn btn-success"
                                            style={{
                                                flex: 1, padding: '3px 4px', fontSize: '0.65rem',
                                                fontWeight: fb === 'correct' ? 800 : 500
                                            }}
                                            onClick={() => submitFeedback(inc.incident_id, 'correct')}>
                                            {fb === 'correct' ? '✔ Saved!' : '✔ Correct'}
                                        </button>
                                        <button className="btn btn-outline"
                                            style={{
                                                flex: 1, padding: '3px 4px', fontSize: '0.65rem',
                                                color: 'var(--red-500)', fontWeight: fb === 'false_alarm' ? 800 : 500
                                            }}
                                            onClick={() => submitFeedback(inc.incident_id, 'false_alarm')}>
                                            {fb === 'false_alarm' ? '✖ Saved!' : '✖ False Alarm'}
                                        </button>
                                    </div>

                                    {/* Action Buttons based on Status */}
                                    {inc.status === 'DETECTED' && (
                                        <button className="btn btn-outline" style={{ marginTop: 8, padding: '4px 8px', fontSize: '0.72rem', width: '100%', borderColor: 'var(--amber-500)', color: 'var(--amber-600)' }}
                                            onClick={(e) => { e.stopPropagation(); acknowledge(inc.incident_id); }}>
                                            ⚠️ Acknowledge
                                        </button>
                                    )}
                                    {inc.status === 'ACKNOWLEDGED' && (
                                        <button className="btn btn-primary" style={{ marginTop: 8, padding: '4px 8px', fontSize: '0.72rem', width: '100%', background: 'var(--blue-500)', color: 'white', border: 'none' }}
                                            onClick={(e) => { e.stopPropagation(); investigate(inc.incident_id); }}>
                                            🔍 Investigate
                                        </button>
                                    )}
                                    {inc.status === 'INVESTIGATING' && (
                                        <button className="btn btn-success" style={{ marginTop: 8, padding: '4px 8px', fontSize: '0.72rem', width: '100%' }}
                                            onClick={(e) => { e.stopPropagation(); setResolvingId(inc.incident_id); }}>
                                            ✓ Mark Resolved
                                        </button>
                                    )}
                                    {inc.status === 'RESOLVED' && (
                                        <div style={{ marginTop: 8, fontSize: '0.7rem', color: 'var(--green-600)', fontWeight: 600 }}>
                                            Resolved by: {inc.resolver_name || 'Unknown'}
                                        </div>
                                    )}

                                    <button className="btn btn-outline" style={{ marginTop: 4, padding: '2px 8px', fontSize: '0.65rem', width: '100%', opacity: 0.6 }}
                                        onClick={() => setViewingInc(inc)}>📝 Details</button>
                                    {/* Modal: Resolve Incident */}
                                    {resolvingId && (
                                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                                            <div className="card" style={{ width: 400, maxWidth: '90%' }}>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>Resolve Incident {resolvingId}</div>

                                                <div style={{ marginBottom: 12 }}>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Resolver Name</label>
                                                    <input className="form-input" value={resolutionData.resolver} onChange={e => setResolutionData({ ...resolutionData, resolver: e.target.value })} placeholder="e.g. John Doe (Patrol Unit A)" />
                                                </div>
                                                <div style={{ marginBottom: 12 }}>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Action Taken</label>
                                                    <textarea className="form-input" style={{ minHeight: 60 }} value={resolutionData.action} onChange={e => setResolutionData({ ...resolutionData, action: e.target.value })} placeholder="What did you do?" />
                                                </div>
                                                <div style={{ marginBottom: 12 }}>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Current Condition</label>
                                                    <input className="form-input" value={resolutionData.condition} onChange={e => setResolutionData({ ...resolutionData, condition: e.target.value })} placeholder="e.g. Track cleared, safe for operations" />
                                                </div>
                                                <div style={{ marginBottom: 16 }}>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Additional Notes (Optional)</label>
                                                    <input className="form-input" value={resolutionData.notes} onChange={e => setResolutionData({ ...resolutionData, notes: e.target.value })} />
                                                </div>

                                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                    <button className="btn btn-outline" onClick={() => setResolvingId(null)}>Cancel</button>
                                                    <button className="btn btn-primary" onClick={resolve}>Resolve Incident</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Modal: Incident Details */}
                                    {viewingInc && (
                                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setViewingInc(null)}>
                                            <div className="card" style={{ width: 500, maxWidth: '90%' }} onClick={e => e.stopPropagation()}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{viewingInc.incident_id}</div>
                                                    <Badge severity={viewingInc.severity} />
                                                </div>

                                                <div className="grid-2" style={{ marginBottom: 16 }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Location</div>
                                                        <div style={{ fontWeight: 600 }}>{viewingInc.section} • KM {viewingInc.km}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Event classification</div>
                                                        <div style={{ fontWeight: 600 }}>{viewingInc.class_label} ({Math.round(viewingInc.confidence * 100)}%)</div>
                                                    </div>
                                                </div>

                                                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', marginBottom: 16 }}>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>Timeline</div>
                                                    <div style={{ fontSize: '0.8rem', marginBottom: 4 }}><b>DETECTED:</b> {viewingInc.timestamp}</div>
                                                    {viewingInc.acknowledged_at && <div style={{ fontSize: '0.8rem', marginBottom: 4 }}><b>ACKNOWLEDGED:</b> {viewingInc.acknowledged_at}</div>}
                                                    {viewingInc.investigating_at && <div style={{ fontSize: '0.8rem', marginBottom: 4 }}><b>INVESTIGATING:</b> {viewingInc.investigating_at}</div>}
                                                    {viewingInc.resolved_at && <div style={{ fontSize: '0.8rem', marginBottom: 4, color: 'var(--green-600)' }}><b>RESOLVED:</b> {viewingInc.resolved_at}</div>}
                                                </div>

                                                {viewingInc.status === 'RESOLVED' ? (
                                                    <div style={{ borderLeft: '3px solid var(--green-500)', paddingLeft: '12px', marginBottom: 16 }}>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--green-600)', marginBottom: 8 }}>Resolution Report</div>
                                                        <div style={{ fontSize: '0.85rem', marginBottom: 4 }}><b>Resolver:</b> {viewingInc.resolver_name}</div>
                                                        <div style={{ fontSize: '0.85rem', marginBottom: 4 }}><b>Action Taken:</b> {viewingInc.resolution_action}</div>
                                                        <div style={{ fontSize: '0.85rem', marginBottom: 4 }}><b>Condition:</b> {viewingInc.current_condition}</div>
                                                        {viewingInc.resolution_notes && <div style={{ fontSize: '0.85rem', fontStyle: 'italic', marginTop: 8 }}>"{viewingInc.resolution_notes}"</div>}
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                                                        <i>This incident is currently {viewingInc.status}.</i>
                                                    </div>
                                                )}

                                                <div style={{ textAlign: 'right' }}>
                                                    <button className="btn btn-outline" onClick={() => setViewingInc(null)}>Close</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {(!grouped[status] || grouped[status].length === 0) && (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20, fontSize: '0.8rem' }}>No incidents</div>
                        )}
                    </div>
                ))}
            </div>

            {/* Full History */}
            <SectionHeader icon="📜" title="Complete Incident History" />
            <div className="card">
                {incidents.length > 0 ? (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th><th>Time</th><th>Section</th><th>Event</th>
                                <th>Severity</th><th>Action</th><th>Status</th><th>Feedback</th>
                            </tr>
                        </thead>
                        <tbody>
                            {incidents.slice(0, 20).map((inc, i) => (
                                <tr key={i} onClick={() => setViewingInc(inc)} style={{ cursor: 'pointer' }} className="hover-row">
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{inc.incident_id}</td>
                                    <td>{inc.timestamp}</td>
                                    <td>{inc.section}</td>
                                    <td>{inc.class_name?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</td>
                                    <td><Badge severity={inc.severity} /></td>
                                    <td><span style={{ color: STATUS_COLORS[inc.status], fontWeight: 600, fontSize: '0.75rem' }}>{inc.status}</span></td>
                                    <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{inc.resolver_name || '—'}</td>
                                    <td>
                                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green-600)', marginRight: 4 }}
                                            onClick={(e) => { e.stopPropagation(); submitFeedback(inc.incident_id, 'correct'); }} title="Mark as Correct">✔</button>
                                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red-500)' }}
                                            onClick={(e) => { e.stopPropagation(); submitFeedback(inc.incident_id, 'false_alarm'); }} title="Mark as False Alarm">✖</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                        No incidents recorded. Run detections from the Command Center.
                    </div>
                )}
            </div>
        </div>
    );
}
