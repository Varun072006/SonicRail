import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { KpiCard, AlertCard, SectionHeader, ProbabilityBar } from '../components/UIComponents';
import AdvancedMap from '../components/AdvancedMap';
import { socket } from '../App';

const EVENT_LABELS = {
    train_movement: 'Train Movement', animal_intrusion: 'Animal Intrusion',
    rockfall_landslide: 'Rockfall / Landslide', track_fracture: 'Track Fracture',
    normal_ambient: 'Normal / Ambient',
};

const SEVERITY_COLORS = {
    P1_CRITICAL: 'var(--red-500)', P2_WARNING: 'var(--amber-500)',
    P3_ADVISORY: 'var(--blue-500)', NORMAL: 'var(--green-500)',
};

const SIMULATION_SCENARIOS = [
    { id: 'cascade_rockfall', label: '🪨 Cascade Rockfall', cls: 'rockfall_landslide' },
    { id: 'joint_fracture', label: '⚡ Rail Fracture', cls: 'track_fracture' },
    { id: 'animal_herd', label: '🐾 Animal Herd', cls: 'animal_intrusion' },
    { id: 'train_approach', label: '🚆 Train Approach', cls: 'train_movement' },
    { id: 'unknown_event', label: '❓ Unknown Event', cls: null },
];

export default function CommandCenter({ api }) {
    const [detection, setDetection] = useState(null);
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [kpis, setKpis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [wsAlerts, setWsAlerts] = useState([]);
    const [wsConnected, setWsConnected] = useState(false);
    const audioCtxRef = useRef(null);

    const loadKpis = useCallback(async () => {
        try {
            const res = await fetch(`${api}/kpis`);
            setKpis(await res.json());
        } catch (e) { console.error(e); }
    }, [api]);

    useEffect(() => {
        loadKpis();
        // WebSocket live alerts
        if (socket) {
            socket.on('connect', () => setWsConnected(true));
            socket.on('disconnect', () => setWsConnected(false));
            socket.on('alert_event', (data) => {
                setWsAlerts(prev => [data, ...prev].slice(0, 10));
                loadKpis();
            });
            setWsConnected(socket.connected);
        }
        return () => {
            socket?.off('alert_event');
        };
    }, [loadKpis]);

    const runDetection = async (cls = null, scenarioId = null) => {
        setLoading(true);
        try {
            let url = `${api}/detect`;
            let body = cls ? JSON.stringify({ class: cls }) : '{}';

            if (scenarioId) {
                url = `${api}/simulation/trigger`;
                body = JSON.stringify({ scenario: scenarioId });
            }

            const res = await fetch(url, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
            });
            const data = await res.json();
            if (data.error) { alert(data.error); return; }
            setDetection(data);
            setEvents(prev => [data.decision, ...prev].slice(0, 20));
            loadKpis();
        } catch (e) { alert('Detection failed: ' + e.message); }
        finally { setLoading(false); }
    };

    // Audio playback via Web Audio API
    const playAudio = useCallback(async (incidentId) => {
        try {
            const res = await fetch(`${api}/audio/${incidentId}`);
            const { audio_b64 } = await res.json();
            const binary = atob(audio_b64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

            if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
            const ctx = audioCtxRef.current;
            const buf = await ctx.decodeAudioData(bytes.buffer);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(ctx.destination);
            src.start();
        } catch (e) {
            console.error('Audio playback failed:', e);
        }
    }, [api]);

    const healthColor = (v) => v >= 80 ? 'green' : v >= 50 ? 'amber' : 'red';

    return (
        <div>
            {/* WS Status badge */}
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: '0.7rem', padding: '3px 8px', borderRadius: 20,
                    background: wsConnected ? 'var(--green-50)' : 'var(--bg-secondary)',
                    color: wsConnected ? 'var(--green-600)' : 'var(--text-muted)',
                    border: `1px solid ${wsConnected ? 'var(--green-200)' : 'var(--border)'}`,
                }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: wsConnected ? '#22c55e' : '#94a3b8' }} />
                    WebSocket {wsConnected ? 'Live' : 'Disconnected'}
                </span>
                {wsAlerts.length > 0 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--red-500)', fontWeight: 600 }}>
                        🚨 {wsAlerts.length} live push alert{wsAlerts.length > 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <button className="btn btn-danger" onClick={() => alert('⚠️ EMERGENCY BRAKE COMMAND SENT')}>
                    🔴 Emergency Stop
                </button>
                <button className="btn btn-success" onClick={() => alert('✅ All sections marked clear')}>
                    ✅ All Clear
                </button>
                <button className="btn btn-primary" onClick={() => runDetection()} disabled={loading}>
                    🔄 {loading ? 'Detecting...' : 'Run Detection'}
                </button>
                {SIMULATION_SCENARIOS.map(s => (
                    <button key={s.id} className="btn btn-outline" onClick={() => runDetection(s.cls, s.id)} disabled={loading}>
                        ▶ {s.label}
                    </button>
                ))}
            </div>

            {/* KPI Strip */}
            <div className="kpi-grid">
                {kpis ? (
                    <>
                        <KpiCard value={`${kpis.track_health.value}%`} label="Track Health"
                            trend={kpis.track_health.trend} direction="up"
                            color={healthColor(kpis.track_health.value)}
                            tooltip="Average Track Health Index across all 8 block sections" />
                        <KpiCard value={`${kpis.detection_accuracy.value}%`} label="Detection Accuracy"
                            trend={kpis.detection_accuracy.trend} direction="up" color="blue"
                            tooltip="ML model classification accuracy (updated by operator feedback)" />
                        <KpiCard value={`${kpis.response_time.value}s`} label="Response Time"
                            trend={Math.abs(kpis.response_time.trend)} direction="down" color="cyan"
                            tooltip="Average time from signal capture to decision output" />
                        <KpiCard value={kpis.active_threats.value} label="Active Threats"
                            color={kpis.active_threats.value > 0 ? 'red' : 'green'}
                            tooltip="Number of unresolved P1/P2 incidents" />
                        <KpiCard value={`${kpis.system_uptime.value}%`} label="System Uptime"
                            trend={kpis.system_uptime.trend} direction="up" color="green"
                            tooltip="DAS pipeline availability in last 30 days" />
                        <KpiCard value={kpis.events_today.value} label="Events Today"
                            trend={kpis.events_today.trend} direction="up" color="blue"
                            tooltip="Total detections processed today" />
                    </>
                ) : (
                    Array(6).fill(0).map((_, i) => (
                        <div className="kpi-card" key={i}>
                            <div className="loading-skeleton" style={{ height: 40, marginBottom: 8 }} />
                            <div className="loading-skeleton" style={{ height: 12, width: '60%', margin: '0 auto' }} />
                        </div>
                    ))
                )}
            </div>

            {/* Live Track Infrastructure Map & Frequency Analyzer */}
            <div style={{ marginBottom: 24 }}>
                <AdvancedMap api={api} events={events} onEventClick={setSelectedEvent} />
            </div>

            {/* Event Details Modal */}
            {selectedEvent && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
                    background: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        background: '#ffffff', width: '450px', borderRadius: '12px',
                        border: `2px solid ${selectedEvent.severity === 'P1_CRITICAL' ? '#ef4444' : '#f59e0b'}`,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: selectedEvent.severity === 'P1_CRITICAL' ? '#fef2f2' : '#fffbeb',
                            borderBottom: '1px solid #e2e8f0'
                        }}>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem', letterSpacing: '0.5px' }}>
                                🚨 ANOMALY DETECTED
                            </div>
                            <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.8rem', borderColor: '#cbd5e1', color: '#475569' }} onClick={() => setSelectedEvent(null)}>Close</button>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Event Classification</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: selectedEvent.severity === 'P1_CRITICAL' ? '#dc2626' : '#d97706' }}>
                                    {(selectedEvent.event || selectedEvent.class_name || 'Unknown').replace(/_/g, ' ').toUpperCase()}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Severity</div>
                                    <div style={{
                                        display: 'inline-block', padding: '4px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 700,
                                        background: selectedEvent.severity === 'P1_CRITICAL' ? '#fee2e2' : '#fef3c7',
                                        color: selectedEvent.severity === 'P1_CRITICAL' ? '#dc2626' : '#d97706',
                                        border: `1px solid ${selectedEvent.severity === 'P1_CRITICAL' ? '#fca5a5' : '#fcd34d'}`
                                    }}>
                                        {selectedEvent.severity?.replace('_', ' ')}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Confidence</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
                                        {((selectedEvent.confidence || 0) * 100).toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Location:</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>KM {selectedEvent.km} ({selectedEvent.section})</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Timestamp:</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{selectedEvent.time}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Layout */}
            <div className="grid-2">
                {/* Signal Analysis */}
                <div className="card">
                    <div className="card-title">📡 Signal Intelligence</div>
                    {detection ? (
                        <SignalPanel detection={detection} onPlayAudio={playAudio} />
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: 12 }}>📡</div>
                            Click <b style={{ color: 'var(--blue-600)' }}>Run Detection</b> or a simulation scenario to analyze a signal
                        </div>
                    )}
                </div>

                {/* Live Push Alerts + Active Incidents */}
                <div className="card">
                    <div className="card-title">🚨 Active Incidents
                        {wsAlerts.length > 0 && (
                            <span style={{
                                marginLeft: 8, fontSize: '0.65rem', padding: '1px 6px',
                                background: 'var(--red-500)', color: 'white', borderRadius: 10,
                            }}>{wsAlerts.length} LIVE</span>
                        )}
                    </div>
                    {/* WebSocket real-time alerts */}
                    {wsAlerts.slice(0, 3).map((ws, i) => (
                        <AlertCard key={i}
                            severity={ws.decision?.severity}
                            title={`🔴 LIVE: ${ws.prediction?.class_label || ws.prediction?.class_name}`}
                            detail={`${ws.decision?.section} KM ${ws.decision?.km}`}
                            subDetail={ws.decision?.incident_id}
                            active={true}
                            onClick={() => setSelectedEvent({ ...ws.decision, event: ws.prediction?.class_label, confidence: ws.prediction?.confidence })}
                        />
                    ))}
                    {events.filter(e => e.severity !== 'NORMAL').length > 0 ? (
                        events.filter(e => e.severity !== 'NORMAL').slice(0, 4).map((e, i) => (
                            <AlertCard key={i}
                                severity={e.severity}
                                title={`${e.severity?.replace('_', ' ')} — ${e.action}`}
                                detail={`${e.section} KM ${e.km}`}
                                subDetail={e.incident_id}
                                active={true}
                                onClick={() => setSelectedEvent(e)}
                            />
                        ))
                    ) : wsAlerts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 30, color: 'var(--green-500)' }}>
                            <div style={{ fontSize: '1.5rem' }}>✓</div>
                            <div style={{ fontSize: '0.85rem', marginTop: 8, color: 'var(--text-muted)' }}>No active incidents</div>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Event Feed */}
            {events.length > 0 && (
                <div className="card">
                    <div className="card-title">📋 Live Event Feed</div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Section</th><th>KM</th><th>Severity</th><th>Action</th><th>Incident ID</th><th>Audio</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.slice(0, 10).map((e, i) => (
                                <tr key={i}
                                    style={{ cursor: 'pointer', background: e.severity === 'P1_CRITICAL' ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}
                                    onClick={() => setSelectedEvent(e)}
                                    className="hover-highlight"
                                >
                                    <td>{e.section}</td>
                                    <td>{e.km}</td>
                                    <td><span className={`badge ${e.severity?.includes('P1') ? 'p1' : e.severity?.includes('P2') ? 'p2' : e.severity?.includes('P3') ? 'p3' : 'normal'}`}>{e.severity?.replace('_', ' ')}</span></td>
                                    <td>{e.action}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{e.incident_id}</td>
                                    <td>
                                        {e.incident_id && (
                                            <button
                                                className="btn btn-outline"
                                                style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                                                onClick={(ev) => {
                                                    ev.stopPropagation(); // prevent row click from opening modal if play button is clicked
                                                    playAudio(e.incident_id);
                                                }}
                                            >▶ Play</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}



/* ──── Canvas Waveform ──── */
const WaveCanvas = memo(function WaveCanvas({ data, color = '#2b7fff', height = 110 }) {
    const ref = useRef(null);
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas || !data?.length) return;
        const W = canvas.width, H = canvas.height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, W, H);

        // Normalize
        const mn = Math.min(...data), mx = Math.max(...data), rng = (mx - mn) || 1;
        const norm = v => H / 2 - ((v - mn) / rng - 0.5) * (H * 0.84);
        const step = W / (data.length - 1);

        // Solid waveform stroke
        ctx.beginPath();
        data.forEach((v, i) => { const x = i * step, y = norm(v); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.0;
        ctx.stroke();
    }, [data, color]);
    return <canvas ref={ref} width={640} height={height} style={{ width: '100%', height, display: 'block' }} />;
});

/* ──── Canvas FFT Spectrum ──── */
const FftCanvas = memo(function FftCanvas({ freqs, mags, color = '#00a8cc', height = 100 }) {
    const ref = useRef(null);
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas || !mags?.length) return;
        const W = canvas.width, H = canvas.height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, W, H);

        // Baseline
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, H - 1);
        ctx.lineTo(W, H - 1);
        ctx.stroke();

        const maxMag = Math.max(...mags) || 1, n = mags.length;
        // If color is amber/orange, draw denser bars like an area chart
        const isHazardColor = color.includes('ff95') || color.includes('f59e');
        const barW = isHazardColor ? Math.max(1.5, W / n + 1) : Math.max(1.0, W / n);

        ctx.fillStyle = color;
        mags.forEach((m, i) => {
            const x = (i / n) * W, bh = Math.max(0, (m / maxMag) * (H - 4));
            if (bh > 0) ctx.fillRect(x, H - 1 - bh, isHazardColor ? barW : Math.max(0.5, barW - 0.5), bh);
        });
    }, [freqs, mags, color]);
    return <canvas ref={ref} width={640} height={height} style={{ width: '100%', height, display: 'block' }} />;
});

/* ──── Signal Panel Sub-component ──── */
const SignalPanel = memo(function SignalPanel({ detection, onPlayAudio }) {
    const { prediction, signal, decision, anomaly } = detection;
    const waveData = signal?.waveform || [];
    const fftFreqs = signal?.fft_freqs || [];
    const fftMags = signal?.fft_mags || [];

    const sevColor = SEVERITY_COLORS[decision?.severity] || 'var(--green-500)';
    const isHazard = decision?.severity && decision.severity !== 'NORMAL';

    // Web Audio API Synthetic Emergency Alarm
    useEffect(() => {
        if (!isHazard) return;

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // 800Hz beep
        oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.2); // Alternating pitch

        // Pulsing volume for alarm effect
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);

        return () => {
            if (audioCtx.state !== 'closed') {
                audioCtx.close();
            }
        };
    }, [isHazard, detection]); // Re-trigger beep if detection updates while in hazard state

    return (
        <div>
            {/* Anomaly badge */}
            {anomaly?.is_anomaly && (
                <div style={{
                    background: '#fffbeb', border: '1px solid #fcd34d',
                    borderRadius: 6, padding: '12px 16px', marginBottom: 16,
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                    <span style={{ fontSize: '1rem' }}>⚠️</span>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#d97706' }}>
                            Anomaly Detected — Unknown Acoustic Event
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: 2 }}>
                            Score: {anomaly.anomaly_score} · Outside training distribution
                        </div>
                    </div>
                </div>
            )}

            {/* Dark signal charts container */}
            <div style={{
                background: '#040d18', // Exactly matching AdvancedMap canvas bg
                border: isHazard ? '1px solid #ef4444' : '1px solid #1e3a5f',
                borderRadius: 6,
                padding: '16px 16px 12px',
                marginBottom: 14,
                boxShadow: isHazard ? '0 0 15px rgba(239, 68, 68, 0.2)' : 'none',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
            }} className={isHazard ? 'emergency-pulse' : ''}>

                {/* Waveform */}
                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', letterSpacing: 1, fontFamily: 'monospace' }}>WAVEFORM</span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '2px 7px', borderRadius: 10,
                                background: isHazard ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                                border: isHazard ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(16,185,129,0.4)',
                                fontSize: '0.58rem', color: isHazard ? '#f87171' : '#10b981', fontWeight: 600,
                            }}>
                                {isHazard && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 6px #ef4444' }} />}
                                {isHazard ? '⚡ Disturbance' : '✓ Nominal'}
                            </span>
                        </div>
                    </div>
                    <WaveCanvas data={waveData} color={isHazard ? '#ef4444' : '#3b82f6'} height={110} />
                </div>

                {/* FFT */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', letterSpacing: 1, fontFamily: 'monospace' }}>FFT SPECTRUM</span>
                        <span style={{ fontSize: '0.6rem', color: '#475569', fontFamily: 'monospace' }}>0 Hz → 8000 Hz</span>
                    </div>
                    <FftCanvas freqs={fftFreqs} mags={fftMags} color={isHazard ? '#f59e0b' : '#3b82f6'} height={100} />
                </div>
            </div>

            {/* Classification result */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: 14, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: sevColor }}>
                        {prediction.icon} {prediction.class_label}
                    </div>
                    {/* Audio playback button */}
                    {decision?.incident_id && (
                        <button
                            className="btn btn-primary"
                            style={{ fontSize: '0.72rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => onPlayAudio(decision.incident_id)}
                        >
                            ▶ Play Audio
                        </button>
                    )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                    Confidence: <b style={{ color: 'var(--text-primary)' }}>{(prediction.confidence * 100).toFixed(1)}%</b>
                </div>
                <div>
                    {Object.entries(prediction.probabilities)
                        .sort(([, a], [, b]) => b - a)
                        .map(([cls, prob]) => (
                            <ProbabilityBar key={cls}
                                label={EVENT_LABELS[cls] || cls}
                                value={prob}
                                isHighlight={cls === prediction.class_name} />
                        ))}
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes sirenPulse {
                        0% { box-shadow: 0 0 10px rgba(239, 68, 68, 0.2); }
                        50% { box-shadow: 0 0 35px rgba(239, 68, 68, 0.6); border-color: #ef4444; }
                        100% { box-shadow: 0 0 10px rgba(239, 68, 68, 0.2); }
                    }
                    .emergency-pulse {
                        animation: sirenPulse 1.5s infinite;
                    }
                    `
                }} />
            </div>
        </div >
    );
});
