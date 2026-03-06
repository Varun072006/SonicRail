import { useState, useEffect } from 'react';
import { SectionHeader } from '../components/UIComponents';

const SIMULATION_SCENARIOS = [
    {
        id: 'cascade_rockfall',
        icon: '🪨', name: 'Cascade Rockfall',
        desc: 'Multi-point rockfall across adjacent sections — monsoon debris scenario',
        severity: 'P1 CRITICAL',
        severityColor: 'var(--red-500)',
    },
    {
        id: 'joint_fracture',
        icon: '⚡', name: 'Rail Joint Fracture',
        desc: 'Thermal expansion fracture at km marker — summer heat stress scenario',
        severity: 'P1 CRITICAL',
        severityColor: 'var(--red-500)',
    },
    {
        id: 'animal_herd',
        icon: '🐾', name: 'Animal Herd Intrusion',
        desc: 'Large animal herd crossing — cattle migration near FDB block',
        severity: 'P2 WARNING',
        severityColor: 'var(--amber-500)',
    },
    {
        id: 'train_approach',
        icon: '🚆', name: 'Train Approach',
        desc: 'High-speed train approach detection — baseline movement signature',
        severity: 'NORMAL',
        severityColor: 'var(--green-500)',
    },
    {
        id: 'ambient_wind',
        icon: '🌬️', name: 'High Wind Event',
        desc: 'Strong crosswind — tests ambient noise filtering at night',
        severity: 'NORMAL',
        severityColor: 'var(--green-500)',
    },
    {
        id: 'unknown_event',
        icon: '❓', name: 'Unknown Acoustic Event',
        desc: 'Unclassified sound — tests anomaly detection layer for OOD events',
        severity: 'P3 ADVISORY',
        severityColor: 'var(--blue-500)',
    },
];

export default function Administration({ api }) {
    const [mode, setMode] = useState('AUTO');
    const [sensitivity, setSensitivity] = useState(0.75);
    const [sections, setSections] = useState(
        Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`BS-${i + 1}`, true]))
    );
    const [simResult, setSimResult] = useState(null);
    const [simLoading, setSimLoading] = useState(null);

    const modeDescriptions = {
        AUTO: 'System automatically executes decision protocols (emergency brake, speed restriction) without operator confirmation.',
        MANUAL: 'System detects and alerts, but waits for operator confirmation before executing any action.',
        MAINTENANCE: 'Detection logging only. No alerts or actions triggered. Use during scheduled track maintenance.',
    };

    const modeColors = { AUTO: 'var(--green-500)', MANUAL: 'var(--amber-500)', MAINTENANCE: 'var(--blue-500)' };

    const triggerScenario = async (scenarioId) => {
        setSimLoading(scenarioId);
        setSimResult(null);
        try {
            const res = await fetch(`${api}/simulation/trigger`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario: scenarioId }),
            });
            const data = await res.json();
            setSimResult({ scenario: scenarioId, ...data });
        } catch (e) {
            setSimResult({ error: e.message });
        } finally {
            setSimLoading(null);
        }
    };

    return (
        <div>
            <div className="grid-2" style={{ marginBottom: 24 }}>
                {/* Detection Settings */}
                <div className="card">
                    <div className="card-title">🎚️ Detection Settings</div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                            Detection Sensitivity: <b>{sensitivity.toFixed(2)}</b>
                        </label>
                        <input type="range" min="0.5" max="1" step="0.05" value={sensitivity}
                            onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--blue-600)' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            <span>Less Sensitive</span><span>More Sensitive</span>
                        </div>
                    </div>

                    <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 10 }}>Alert Confidence Thresholds</div>
                    {[
                        { label: 'P1 Critical Threshold', value: 0.85, color: 'var(--red-500)' },
                        { label: 'P2 Warning Threshold', value: 0.70, color: 'var(--amber-500)' },
                        { label: 'P3 Advisory Threshold', value: 0.50, color: 'var(--blue-500)' },
                    ].map((t, i) => (
                        <div key={i} style={{ marginBottom: 10 }}>
                            <label style={{ fontSize: '0.75rem', color: t.color, fontWeight: 500 }}>{t.label}: {t.value}</label>
                            <input type="range" min="0.3" max="1" step="0.05" defaultValue={t.value}
                                style={{ width: '100%', accentColor: t.color }} />
                        </div>
                    ))}

                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <button className="btn btn-primary" onClick={() => alert('Settings saved!')}>💾 Save Settings</button>
                        <button className="btn btn-outline" onClick={() => { setSensitivity(0.75); alert('Settings reset'); }}>🔄 Reset</button>
                    </div>
                </div>

                {/* Protocol Mode */}
                <div className="card">
                    <div className="card-title">🔐 Protocol Mode</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                        {['AUTO', 'MANUAL', 'MAINTENANCE'].map(m => (
                            <label key={m} style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                                background: mode === m ? 'var(--blue-50)' : 'transparent',
                                border: `1px solid ${mode === m ? 'var(--blue-300)' : 'var(--border)'}`,
                                borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.2s',
                            }}>
                                <input type="radio" name="mode" value={m} checked={mode === m}
                                    onChange={() => setMode(m)} style={{ accentColor: 'var(--blue-600)' }} />
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m}</span>
                            </label>
                        ))}
                    </div>
                    <div style={{
                        background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
                        padding: 14, borderLeft: `3px solid ${modeColors[mode]}`,
                    }}>
                        <div style={{ fontWeight: 600, color: modeColors[mode], fontSize: '0.85rem' }}>{mode} Mode Active</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
                            {modeDescriptions[mode]}
                        </div>
                    </div>
                </div>
            </div>

            {/* Simulation Mode */}
            <SectionHeader icon="🎬" title="Simulation Mode" />
            <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                    Trigger named scenarios to test system response and train operators — no physical incident required.
                    Results appear in the Command Center live feed and Incident Manager.
                </div>
                <div className="grid-3">
                    {SIMULATION_SCENARIOS.map(s => (
                        <div key={s.id} className="card" style={{
                            padding: 14, border: `1px solid var(--border)`,
                            borderTop: `3px solid ${s.severityColor}`,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: '1.3rem' }}>{s.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{s.name}</div>
                                    <div style={{ fontSize: '0.65rem', color: s.severityColor, fontWeight: 600 }}>{s.severity}</div>
                                </div>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>
                                {s.desc}
                            </div>
                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', fontSize: '0.72rem', padding: '6px' }}
                                disabled={simLoading === s.id}
                                onClick={() => triggerScenario(s.id)}
                            >
                                {simLoading === s.id ? '⏳ Running...' : `▶ Trigger ${s.icon}`}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Sim result */}
                {simResult && (
                    <div style={{
                        marginTop: 16, padding: 12, borderRadius: 'var(--radius-sm)',
                        background: simResult.error ? 'var(--red-50)' : 'var(--green-50)',
                        border: `1px solid ${simResult.error ? 'var(--red-200)' : 'var(--green-200)'}`,
                    }}>
                        {simResult.error ? (
                            <div style={{ color: 'var(--red-500)', fontSize: '0.82rem' }}>
                                ❌ Error: {simResult.error}
                            </div>
                        ) : (
                            <div style={{ fontSize: '0.8rem', color: 'var(--green-700)' }}>
                                ✅ <b>{simResult.scenario}</b> triggered —
                                {' '}{simResult.prediction?.class_name?.replace(/_/g, ' ')} detected
                                {' '}({(simResult.prediction?.confidence * 100)?.toFixed(1)}% confidence) ·
                                {' '}Severity: {simResult.decision?.severity?.replace('_', ' ')} ·
                                {' '}ID: <code>{simResult.decision?.incident_id}</code>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Section Manager */}
            <SectionHeader icon="🔧" title="Section Manager" />
            <div className="grid-4" style={{ marginBottom: 24 }}>
                {Array.from({ length: 8 }, (_, i) => {
                    const sid = `BS-${i + 1}`;
                    return (
                        <div className="card" key={sid} style={{ padding: 14 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <input type="checkbox" checked={sections[sid]}
                                    onChange={(e) => setSections(prev => ({ ...prev, [sid]: e.target.checked }))}
                                    style={{ accentColor: 'var(--blue-600)', width: 16, height: 16 }} />
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{sid}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>KM {i * 6}–{(i + 1) * 6}</div>
                                </div>
                            </label>
                            {!sections[sid] && (
                                <div style={{ fontSize: '0.68rem', color: 'var(--amber-500)', marginTop: 4 }}>⚠ Monitoring disabled</div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Security */}
            <SectionHeader icon="🔒" title="Security Layer" />
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="grid-3">
                    {[
                        { icon: '🔑', title: 'JWT Authentication', desc: 'Token-based auth via POST /api/auth/login. Tokens expire after 24h. Username: admin / operator' },
                        { icon: '🔐', title: 'Encrypted Comms', desc: 'In production: all sensor → server communication over TLS 1.3. WebSocket connections use WSS.' },
                        { icon: '🛡️', title: 'CORS & Rate Limiting', desc: 'CORS configured via flask-cors. Rate limiting (100 req/min) to be added in production deployment.' },
                    ].map((item, i) => (
                        <div key={i} style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 'var(--radius-sm)' }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{item.icon}</div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>{item.title}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
