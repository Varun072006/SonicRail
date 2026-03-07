import { useState, useEffect, useRef, useCallback } from 'react';

// ──── DAS Frequency Analyser Canvas ────────────────────────────────────────
// Multi-colored waveform chart with spike detection + annotations + interactive tooltips
function FrequencyAnalyserCanvas({ events, onEventClick }) {
    const canvasRef = useRef(null);
    const frameRef = useRef(null);
    const offsetRef = useRef(0);
    const hoveredSpikeRef = useRef(null);
    const [hoverPos, setHoverPos] = useState(null);

    // Seeded random so traces look stable between renders
    const seededRand = useCallback((seed) => {
        let s = seed;
        return () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }, []);

    const handleMouseMove = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        // Calculate logical coordinates assuming CSS matches width/height attrs
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        setHoverPos({
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        });
    };

    const handleMouseLeave = () => setHoverPos(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', handleMouseLeave);

        // Logical dimensions
        const W = canvas.width;
        const H = canvas.height;

        // Chart margins
        const ML = 42;   // left  (Y-axis labels)
        const MR = 10;   // right
        const MT = 22;   // top
        const MB = 28;   // bottom (X-axis labels)
        const CW = W - ML - MR;
        const CH = H - MT - MB;

        // Y-axis range (μm/m)
        const Y_MAX = 900;
        const Y_MIN = -200;
        const Y_RANGE = Y_MAX - Y_MIN;

        const toY = (val) => MT + CH - ((val - Y_MIN) / Y_RANGE) * CH;
        const toX = (km) => ML + (km / 50) * CW;

        // Active hazards
        const hazards = events.filter(e => e.severity !== 'NORMAL');

        // Pre-build spike positions from hazards or random seeds
        const spikes = hazards.length > 0
            ? hazards.map((e, i) => ({
                _rawEvent: e,
                km: e.km ?? (10 + i * 12),
                amp: 500 + Math.random() * 350,
                label: (e.event || e.class_name || 'Spike').replace(/_/g, ' '),
                color: e.severity === 'P1_CRITICAL' ? '#ef4444' : '#f59e0b',
            }))
            : [];  // no spikes in normal mode

        // Trace definitions: 3 overlapping bands
        const traces = [
            { color: '#22c55e', alpha: 0.85, baseAmp: 60, noiseAmp: 40, spikeScale: 0.70, freq: 0.08 },
            { color: '#facc15', alpha: 0.90, baseAmp: 80, noiseAmp: 55, spikeScale: 0.85, freq: 0.06 },
            { color: '#38bdf8', alpha: 0.80, baseAmp: 50, noiseAmp: 35, spikeScale: 0.65, freq: 0.10 },
        ];

        const draw = () => {
            ctx.clearRect(0, 0, W, H);

            // ── Background ─────────────────────────────────────────
            ctx.fillStyle = '#040d18';
            ctx.fillRect(0, 0, W, H);

            // ── Grid ───────────────────────────────────────────────
            const yGridLines = [-200, 0, 100, 200, 400, 600, 800, 900];
            ctx.setLineDash([2, 4]);
            ctx.lineWidth = 0.5;
            yGridLines.forEach(val => {
                const y = toY(val);
                ctx.beginPath();
                ctx.moveTo(ML, y);
                ctx.lineTo(ML + CW, y);
                ctx.strokeStyle = val === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)';
                ctx.stroke();

                // Y-axis label
                ctx.fillStyle = val === 0 ? '#94a3b8' : '#475569';
                ctx.font = '8px monospace';
                ctx.textAlign = 'right';
                ctx.fillText(val.toString(), ML - 4, y + 3);
            });

            // Vertical grid (every 10 km)
            for (let km = 0; km <= 50; km += 10) {
                const x = toX(km);
                ctx.beginPath();
                ctx.moveTo(x, MT);
                ctx.lineTo(x, MT + CH);
                ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                ctx.stroke();
            }
            ctx.setLineDash([]);

            // ── Axes ───────────────────────────────────────────────
            ctx.strokeStyle = '#1e3a5f';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ML, MT);
            ctx.lineTo(ML, MT + CH);
            ctx.lineTo(ML + CW, MT + CH);
            ctx.stroke();

            // X labels
            ctx.fillStyle = '#475569';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            for (let km = 0; km <= 50; km += 10) {
                ctx.fillText(km, toX(km), MT + CH + 12);
            }
            // X-axis title
            ctx.fillStyle = '#334155';
            ctx.font = '7px monospace';
            ctx.fillText('Length (km)', ML + CW / 2, H - 2);

            // Y-axis title (rotated)
            ctx.save();
            ctx.translate(8, MT + CH / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillStyle = '#334155';
            ctx.font = '7px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Amplitude (μm/m)', 0, 0);
            ctx.restore();

            // ── Waveform Traces ────────────────────────────────────
            const scroll = offsetRef.current;

            traces.forEach(({ color, alpha, baseAmp, noiseAmp, spikeScale, freq }) => {
                const rng = seededRand(freq * 10000 + scroll * 3.7);
                ctx.beginPath();
                ctx.strokeStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
                ctx.lineWidth = 1.2;

                let first = true;
                for (let px = 0; px <= CW; px += 1) {
                    const km = (px / CW) * 50;

                    // Base noise floor
                    let amp = baseAmp + (rng() - 0.5) * noiseAmp;
                    amp += Math.sin((px + scroll * 2) * freq) * (baseAmp * 0.4);

                    // Add spike contributions from hazards
                    spikes.forEach(spike => {
                        const dist = Math.abs(spike.km - km);
                        if (dist < 2.5) {
                            const shape = Math.exp(-(dist * dist) / 1.2);  // Gaussian peak
                            amp += spike.amp * spikeScale * shape * (0.7 + rng() * 0.6);
                        }
                    });

                    // Small random spikes for realism even in normal mode
                    if (rng() > 0.994) amp += 80 + rng() * 120;

                    const x = ML + px;
                    const y = toY(amp);

                    if (first) { ctx.moveTo(x, y); first = false; }
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            });

            // ── Spike Annotations (red circle + arrow + label) ─────
            let hoveredSpike = null;

            spikes.forEach((spike, i) => {
                const x = toX(spike.km);
                const peakAmp = spike.amp * 0.85;
                const y = toY(peakAmp);

                // Check collision with mouse hover
                if (hoverPos) {
                    const dx = hoverPos.x - x;
                    const dy = hoverPos.y - y;
                    if (Math.sqrt(dx * dx + dy * dy) < 25) {
                        hoveredSpike = spike;
                    }
                }

                // Pulsing red circle — radius oscillates
                const pulse = 14 + Math.sin(scroll * 0.15 + i) * 3;

                // Red dashed circle (like reference image)
                ctx.beginPath();
                ctx.arc(x, y, pulse + 4, 0, Math.PI * 2);
                ctx.strokeStyle = spike.color;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([3, 3]);
                ctx.stroke();
                ctx.setLineDash([]);

                // Filled inner dot
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fillStyle = spike.color;
                ctx.fill();

                // Arrow line to label
                const labelX = x + (i % 2 === 0 ? 28 : -28);
                const labelY = y - 28;
                ctx.beginPath();
                ctx.moveTo(x + (i % 2 === 0 ? 16 : -16), y - 8);
                ctx.lineTo(labelX, labelY + 4);
                ctx.strokeStyle = spike.color;
                ctx.lineWidth = 1;
                ctx.stroke();

                // Label background
                const labelText = spike.label;
                ctx.font = 'bold 8px sans-serif';
                const tw = ctx.measureText(labelText).width + 8;
                const lx = i % 2 === 0 ? labelX - 2 : labelX - tw + 2;
                ctx.fillStyle = 'rgba(0,0,0,0.75)';
                ctx.fillRect(lx, labelY - 11, tw, 13);
                ctx.strokeStyle = spike.color;
                ctx.lineWidth = 0.8;
                ctx.strokeRect(lx, labelY - 11, tw, 13);

                // Label text
                ctx.fillStyle = spike.color;
                ctx.textAlign = 'left';
                ctx.fillText(labelText, lx + 4, labelY + 0);

                // Small amplitude badge below
                ctx.fillStyle = '#94a3b8';
                ctx.font = '7px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`${Math.round(peakAmp)} μm / m`, x, y + pulse + 16);
            });

            // ── Interactive Hover Tooltip ──────────────────────────
            if (hoveredSpike) {
                hoveredSpikeRef.current = hoveredSpike;
                const hx = toX(hoveredSpike.km);
                const hy = toY(hoveredSpike.amp * 0.85);

                const tooltipW = 150;
                const tooltipH = 50;
                let tx = hx + 15;
                let ty = hy - 15;

                // Keep tooltip on screen
                if (tx + tooltipW > W) tx = hx - tooltipW - 15;
                if (ty + tooltipH > H) ty = H - tooltipH - 10;
                if (ty < MT) ty = MT + 10;

                // Tooltip background
                ctx.fillStyle = 'rgba(11, 20, 30, 0.95)';
                ctx.beginPath();
                ctx.roundRect(tx, ty, tooltipW, tooltipH, 6);
                ctx.fill();
                ctx.strokeStyle = hoveredSpike.color;
                ctx.lineWidth = 1;
                ctx.stroke();

                // Tooltip text
                ctx.fillStyle = '#f8fafc';
                ctx.textAlign = 'left';
                ctx.font = 'bold 9px sans-serif';
                ctx.fillText(`Causal Area: KM ${hoveredSpike.km} `, tx + 10, ty + 16);

                ctx.fillStyle = hoveredSpike.color;
                ctx.font = '8px monospace';
                ctx.fillText(`Event: ${hoveredSpike.label} `, tx + 10, ty + 30);

                ctx.fillStyle = '#94a3b8';
                ctx.fillText(`Disturbance Peak: ${Math.round(hoveredSpike.amp)} μm / m`, tx + 10, ty + 42);
            } else {
                hoveredSpikeRef.current = null;
            }

            // ── Scan-line (animated vertical cursor) ───────────────
            const scanX = ML + ((scroll * 1.2) % CW);
            const scanGrad = ctx.createLinearGradient(scanX, MT, scanX, MT + CH);
            scanGrad.addColorStop(0, 'rgba(56,189,248,0)');
            scanGrad.addColorStop(0.5, 'rgba(56,189,248,0.15)');
            scanGrad.addColorStop(1, 'rgba(56,189,248,0)');
            ctx.fillStyle = scanGrad;
            ctx.fillRect(scanX - 1, MT, 2, CH);

            // ── Chart Title ────────────────────────────────────────
            ctx.fillStyle = '#64748b';
            ctx.font = '7px monospace';
            ctx.textAlign = 'left';
            ctx.fillText('FREQ: 0–8000 Hz  |  GAIN: AUTO', ML + 4, MT + 12);

            // ── Hazard band highlight ──────────────────────────────
            if (spikes.length === 0) {
                ctx.fillStyle = 'rgba(34,197,94,0.06)';
                ctx.fillRect(ML, toY(200), CW, toY(-200) - toY(200));
            }

            offsetRef.current += 0.6;
            frameRef.current = requestAnimationFrame(draw);
        };

        draw();
        return () => cancelAnimationFrame(frameRef.current);
    }, [events, seededRand]);

    return (
        <div style={{
            flex: 1, position: 'relative',
            background: '#040d18',
            border: '1px solid #1e3a5f',
            borderRadius: 6,
            overflow: 'hidden',
            minHeight: 0,
        }}>
            <canvas
                ref={canvasRef}
                width={680}
                height={220}
                style={{ width: '100%', height: '100%', display: 'block', cursor: hoverPos && hoveredSpikeRef.current ? 'pointer' : 'default' }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={() => hoveredSpikeRef.current && onEventClick && onEventClick(hoveredSpikeRef.current._rawEvent)}
            />
        </div>
    );
}



export default function AdvancedMap({ api, events, onEventClick }) {
    const [health, setHealth] = useState(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        fetch(`${api}/track-health`)
            .then(r => r.json())
            .then(setHealth)
            .catch(console.error);
    }, [api]);

    // Live Mic Stream - Auto-scrolling frequency wave
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationId;
        let p = 0;

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.beginPath();
            ctx.moveTo(0, canvas.height / 2);

            const activeHazards = events.filter(e => e.severity !== 'NORMAL' && e.status !== 'RESOLVED');

            for (let i = 0; i < canvas.width; i += 2) {
                // Map screen X to KM (0 to 50)
                const km = (i / canvas.width) * 50;

                // Base ambient noise
                let amp = 5 + Math.random() * 8;
                let isHazard = false;

                // Check if this location has an active hazard
                for (let e of activeHazards) {
                    const dist = Math.abs(e.km - km);
                    if (dist < 1.5) { // 1.5km radius of disturbance
                        // Intense spike
                        amp += (1.5 - dist) * 40 * Math.random();
                        isHazard = true;
                    }
                }

                const y = canvas.height / 2 + (Math.sin(p + i * 0.05) * amp) * (Math.random() > 0.5 ? 1 : -1);
                ctx.lineTo(i, y);
            }

            ctx.strokeStyle = activeHazards.length > 0 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(16, 185, 129, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Draw baseline
            ctx.beginPath();
            ctx.moveTo(0, canvas.height / 2);
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();

            p += 0.2;
            animationId = requestAnimationFrame(draw);
        };

        draw();
        return () => cancelAnimationFrame(animationId);
    }, [events]);

    if (!health) return <div className="loading-skeleton" style={{ height: 400 }} />;

    // Map SVG coordinates to KM
    const trackPoints = [
        { km: 0, x: 50, y: 150 },
        { km: 15, x: 250, y: 80 },
        { km: 35, x: 550, y: 220 },
        { km: 50, x: 750, y: 150 }
    ];

    // Simple Catmull-Rom or Bezier interpolation strategy for 0-50km
    const getPosAtKm = (km) => {
        // Find segment
        for (let i = 0; i < trackPoints.length - 1; i++) {
            const p1 = trackPoints[i];
            const p2 = trackPoints[i + 1];
            if (km >= p1.km && km <= p2.km) {
                const t = (km - p1.km) / (p2.km - p1.km);
                // Linear interpolation for simplicity but looks map-like
                const x = p1.x + (p2.x - p1.x) * t;
                const y = p1.y + (p2.y - p1.y) * t;
                return { x, y };
            }
        }
        return { x: 50, y: 150 };
    };

    // Construct SVG path string
    const dPath = `M 50 150 Q 150 40 250 80 T 550 220 T 750 150`;

    // Re-evaluate positions based on exact Bezier path is complex, 
    // we will use straight segmented polylines with rounded joints for absolute precision.
    // Generate a perfectly smooth sinusoidal track layout
    const precisePathPoints = [];
    for (let i = 0; i <= 50; i += 0.5) { // Higher resolution
        let x = 50 + (i / 50) * 700;
        let y = 140 + Math.sin(i * 0.12) * 80;
        precisePathPoints.push({ km: i, x, y });
    }

    const getPrecisePos = (km) => {
        const floor = Math.floor(km * 2) / 2;
        const ceil = Math.ceil(km * 2) / 2;
        if (floor === ceil || ceil > 50) {
            const index = precisePathPoints.findIndex(p => p.km === floor);
            return precisePathPoints[index > -1 ? index : precisePathPoints.length - 1];
        }
        const p1 = precisePathPoints.find(p => p.km === floor) || precisePathPoints[0];
        const p2 = precisePathPoints.find(p => p.km === ceil) || precisePathPoints[precisePathPoints.length - 1];
        const t = km - floor;
        return {
            x: p1.x + (p2.x - p1.x) * t,
            y: p1.y + (p2.y - p1.y) * t
        };
    };

    // Construct a smooth SVG cubic bezier path through the points
    const drawSmoothPath = (points) => {
        if (!points.length) return "";
        let path = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            path += ` L ${points[i].x} ${points[i].y}`; // At 0.5 res, lines look rounded
        }
        return path;
    };
    const dPrecisePath = drawSmoothPath(precisePathPoints);

    return (
        <div style={{
            background: '#0a111e', // Dark advanced dashboard look
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            position: 'relative',
            color: 'white',
            border: '1px solid #1e293b',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)',
            marginBottom: 24
        }}>
            {/* Header / Title overlay */}
            <div style={{
                position: 'absolute', top: 16, left: 16, zIndex: 10,
                display: 'flex', gap: 12, alignItems: 'center'
            }}>
                <div style={{ fontWeight: 700, letterSpacing: 1, fontSize: '0.85rem', color: '#cbd5e1' }}>
                    TRACK TOPOLOGY MAP
                </div>
                <div style={{ padding: '2px 8px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderRadius: 4, fontSize: '0.65rem', border: '1px solid #059669', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, background: '#10b981', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #10b981' }}></span>
                    LIVE TELEMETRY
                </div>
            </div>

            {/* Geographical-style Grid Background */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                backgroundSize: '20px 20px', zIndex: 0
            }} />

            <div style={{ display: 'flex', height: 420 }}>
                {/* 2D Track Map Area */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    <svg width="100%" height="100%" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                        <defs>
                            <linearGradient id="trackGrad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
                            </linearGradient>
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Neon Track Line */}
                        {/* 1. Underlying large glow */}
                        <path d={dPrecisePath} fill="none" stroke="#0ea5e9" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" filter="url(#glow)" />
                        {/* 2. Core bright trace */}
                        <path d={dPrecisePath} fill="none" stroke="url(#trackGrad)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        {/* 3. Center white highlight */}
                        <path d={dPrecisePath} fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />

                        {/* Stations */}
                        {health.stations.map(st => {
                            const pos = getPrecisePos(st.km);
                            return (
                                <g key={st.code} transform={`translate(${pos.x}, ${pos.y})`}>
                                    <circle r="9" fill="#0f172a" stroke="#0ea5e9" strokeWidth="3" filter="url(#glow)" />
                                    <circle r="3" fill="#fff" />
                                    <text y="-22" x="0" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="800" letterSpacing="0.5">{st.name.toUpperCase()}</text>
                                    <text y="-10" x="0" textAnchor="middle" fill="#94a3b8" fontSize="9">KM {st.km}</text>
                                </g>
                            );
                        })}

                        {/* Events overlay */}
                        {events.filter(e => e.status !== 'RESOLVED').map((e, i) => {
                            const pos = getPrecisePos(e.km);
                            const isHazard = e.severity !== 'NORMAL';
                            const isTrain = e.class_name === 'train_movement';
                            const color = e.severity === 'P1_CRITICAL' ? '#ef4444' : '#f59e0b';

                            return (
                                <g key={i}
                                    transform={`translate(${pos.x}, ${pos.y})`}
                                    onClick={() => isHazard && onEventClick && onEventClick(e)}
                                    style={{ cursor: isHazard ? 'pointer' : 'default' }}>
                                    {isHazard ? (
                                        <>
                                            <circle r="26" fill={color} opacity="0.2">
                                                <animate attributeName="r" values="8; 40; 8" dur="2s" repeatCount="indefinite" />
                                                <animate attributeName="opacity" values="0.6; 0; 0.6" dur="2s" repeatCount="indefinite" />
                                            </circle>
                                            <circle r="20" fill="none" stroke={color} strokeWidth="2" opacity="0.8">
                                                <animate attributeName="r" values="8; 25; 8" dur="1s" repeatCount="indefinite" />
                                            </circle>
                                            <circle r="12" fill={color} stroke="#fff" strokeWidth="2.5" filter="url(#glow)" />
                                            <text y="-28" x="20" textAnchor="middle" fill={color} fontSize="14" fontWeight="800" filter="url(#glow)" letterSpacing="0.5">{(e.class_label || e.class_name || 'UNKNOWN').toUpperCase()}</text>
                                        </>
                                    ) : isTrain ? (
                                        <g>
                                            <rect x="-10" y="-10" width="20" height="20" rx="4" fill="#3b82f6" stroke="#fff" strokeWidth="1" filter="url(#glow)">
                                                <animate attributeName="y" values="-12; -8; -12" dur="0.8s" repeatCount="indefinite" />
                                            </rect>
                                            <text y="5" x="0" textAnchor="middle" fontSize="12">🚆</text>
                                        </g>
                                    ) : (
                                        <circle r="6" fill="#10b981" />
                                    )}
                                </g>
                            );
                        })}
                    </svg>
                </div>

                {/* Right Panel: DAS Frequency Analyser — Redesigned v2.0 */}
                <div style={{
                    width: '42%', background: '#060d1a',
                    borderLeft: '1px solid #1e3a5f', padding: '16px 16px 12px', zIndex: 10,
                    display: 'flex', flexDirection: 'column', gap: 0,
                }}>
                    {/* Panel header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', letterSpacing: 1 }}>
                                DAS FREQUENCY ANALYSER
                            </div>
                            <div style={{ fontSize: '0.6rem', color: '#475569', marginTop: 2 }}>
                                Distributed Acoustic Sensing · Amplitude vs Length
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: '0.58rem', color: '#64748b', fontFamily: 'monospace' }}>0–8 kHz</span>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '2px 7px', borderRadius: 10,
                                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
                                fontSize: '0.58rem', color: '#f87171', fontWeight: 600,
                            }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 6px #ef4444' }} />
                                LIVE
                            </span>
                        </div>
                    </div>

                    {/* Canvas chart area */}
                    <FrequencyAnalyserCanvas events={events} onEventClick={onEventClick} />

                    {/* Legend */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                        {[
                            { color: '#22c55e', label: 'Baseline Ambient' },
                            { color: '#facc15', label: 'Primary Band' },
                            { color: '#38bdf8', label: 'Secondary Band' },
                        ].map(({ color, label }) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.6rem', color: '#94a3b8' }}>
                                <div style={{ width: 18, height: 2, background: color, borderRadius: 1 }} />
                                {label}
                            </div>
                        ))}
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <div style={{ flex: 1, padding: '8px 10px', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 6 }}>
                            <div style={{ fontSize: '0.58rem', color: '#64748b', marginBottom: 2 }}>AVG AMPLITUDE</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
                                {events.filter(e => e.severity !== 'NORMAL').length > 0 ? '412 μm/m' : '87 μm/m'}
                            </div>
                        </div>
                        <div style={{ flex: 1, padding: '8px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6 }}>
                            <div style={{ fontSize: '0.58rem', color: '#64748b', marginBottom: 2 }}>PEAK SPIKE</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f87171', fontFamily: 'monospace' }}>
                                {events.filter(e => e.severity !== 'NORMAL').length > 0 ? '864 μm/m' : '143 μm/m'}
                            </div>
                        </div>
                        <div style={{ flex: 1, padding: '8px 10px', background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 6 }}>
                            <div style={{ fontSize: '0.58rem', color: '#64748b', marginBottom: 2 }}>SPIKES DETECTED</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#facc15', fontFamily: 'monospace' }}>
                                {events.filter(e => e.severity !== 'NORMAL').length}
                            </div>
                        </div>
                    </div>

                    {/* Active spike alerts */}
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 80, overflowY: 'auto' }}>
                        {events.filter(e => e.severity !== 'NORMAL').slice(0, 4).map((e, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '4px 8px', borderRadius: 5,
                                background: e.severity === 'P1_CRITICAL' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.10)',
                                border: `1px solid ${e.severity === 'P1_CRITICAL' ? 'rgba(239,68,68,0.35)' : 'rgba(245,158,11,0.3)'}`,
                            }}>
                                <span style={{ fontSize: '0.65rem' }}>⚡</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: e.severity === 'P1_CRITICAL' ? '#f87171' : '#fbbf24' }}>
                                        AMPLITUDE SPIKE — {(e.event || e.class_name || '').replace(/_/g, ' ').toUpperCase()}
                                    </div>
                                    <div style={{ fontSize: '0.58rem', color: '#64748b' }}>
                                        KM {e.km} · {e.section} · {e.time}
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: '0.56rem', fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                                    background: e.severity === 'P1_CRITICAL' ? '#ef4444' : '#f59e0b', color: '#fff',
                                }}>
                                    {e.severity?.replace('_', ' ')}
                                </span>
                            </div>
                        ))}
                        {events.filter(e => e.severity !== 'NORMAL').length === 0 && (
                            <div style={{ fontSize: '0.62rem', color: '#22c55e', textAlign: 'center', padding: '6px 0', fontFamily: 'monospace' }}>
                                ✓ No anomalous amplitude spikes detected
                            </div>
                        )}
                    </div>
                </div>

            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes pulseDot {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.3; transform: scale(0.8); }
                    100% { opacity: 1; transform: scale(1); }
                }
                .live-dot {
                    animation: pulseDot 1s infinite;
                }
            `}} />
        </div>
    );
}
