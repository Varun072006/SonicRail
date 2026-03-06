import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon (Leaflet + Vite issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ──── Delhi–Agra Corridor Coordinates ────
// Each block section is represented by a series of lat/lng points along the track.
// These are real approximate coordinates along the Delhi–Agra railway corridor.
const TRACK_COORDS = [
    [28.6445, 77.2167], // NDLS (New Delhi)
    [28.5879, 77.2510], // NZM (Hazrat Nizamuddin)
    [28.4089, 77.3178], // FDB (Faridabad)
    [28.1435, 77.3244], // Ballabgarh
    [28.1504, 77.3215], // PWL (Palwal)
    [27.8957, 77.5197], // Kosi Kalan
    [27.4924, 77.6737], // MTJ (Mathura)
    [27.1591, 77.9868], // Runkata
    [27.1591, 78.0578], // AGC (Agra Cantt)
];

const STATIONS = [
    { name: "New Delhi", code: "NDLS", km: 0, coords: [28.6445, 77.2167] },
    { name: "Hazrat Nizamuddin", code: "NZM", km: 5, coords: [28.5879, 77.2510] },
    { name: "Faridabad", code: "FDB", km: 15, coords: [28.4089, 77.3178] },
    { name: "Palwal", code: "PWL", km: 25, coords: [28.1504, 77.3215] },
    { name: "Mathura Junction", code: "MTJ", km: 35, coords: [27.4924, 77.6737] },
    { name: "Agra Cantt", code: "AGC", km: 50, coords: [27.1591, 78.0578] },
];

// Block section midpoints for health markers
const SECTION_MIDPOINTS = [
    { id: "BS-1", name: "NDLS–NZM Block", coords: [28.6162, 77.2338] },
    { id: "BS-2", name: "NZM–FDB Block", coords: [28.4984, 77.2844] },
    { id: "BS-3", name: "FDB–Ballabgarh", coords: [28.2762, 77.3211] },
    { id: "BS-4", name: "Ballabgarh–PWL", coords: [28.1469, 77.3229] },
    { id: "BS-5", name: "PWL–Kosi Kalan", coords: [28.0231, 77.4221] },
    { id: "BS-6", name: "Kosi Kalan–MTJ", coords: [27.6941, 77.5967] },
    { id: "BS-7", name: "MTJ–Runkata", coords: [27.3258, 77.8303] },
    { id: "BS-8", name: "Runkata–AGC", coords: [27.1591, 78.0223] },
];

function healthColor(h) {
    if (h >= 80) return '#22c55e';
    if (h >= 50) return '#f59e0b';
    return '#ef4444';
}

function healthStatus(h) {
    if (h >= 80) return '🟢 GOOD';
    if (h >= 50) return '🟡 CAUTION';
    return '🔴 DANGER';
}

// ──── Pulsing hazard marker icon ────
function pulseIcon(color) {
    return L.divIcon({
        className: '',
        html: `<div style="
            width:20px;height:20px;border-radius:50%;
            background:${color};
            border:3px solid white;
            box-shadow:0 0 0 4px ${color}44;
            animation:pulse_map 1.5s infinite;
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
    });
}

// ──── Map auto-fit helper ────
function MapFit() {
    const map = useMap();
    useEffect(() => {
        map.fitBounds([
            [27.1591, 77.2167],
            [28.6445, 78.0578],
        ], { padding: [40, 40] });
    }, [map]);
    return null;
}

export default function GeoRailMap({ api }) {
    const [trackHealth, setTrackHealth] = useState(null);
    const [liveEvents, setLiveEvents] = useState([]);
    const [showRisk, setShowRisk] = useState(false);
    const [showHazards, setShowHazards] = useState(true);
    const intervalRef = useRef(null);

    const loadHealth = async () => {
        try {
            const res = await fetch(`${api}/track-health`);
            const data = await res.json();
            setTrackHealth(data);
        } catch (e) { /* silent */ }
    };

    const loadEvents = async () => {
        try {
            const res = await fetch(`${api}/events`);
            const data = await res.json();
            // Only the last 5 non-normal events for map markers
            const hazards = data.filter(e => e.severity !== 'NORMAL').slice(0, 5);
            setLiveEvents(hazards);
        } catch (e) { /* silent */ }
    };

    useEffect(() => {
        loadHealth();
        loadEvents();
        intervalRef.current = setInterval(() => { loadHealth(); loadEvents(); }, 5000);
        return () => clearInterval(intervalRef.current);
    }, [api]);

    // Section color segments
    const getSectionColor = (sid) => {
        if (!trackHealth) return '#3b82f6';
        const section = trackHealth.sections?.find(s => s.id === sid);
        return healthColor(section?.health ?? 100);
    };

    // Build colored polyline segments between TRACK_COORDS pairs
    const segmentColors = [
        '#3b82f6', '#3b82f6', '#3b82f6', '#3b82f6',
        '#3b82f6', '#3b82f6', '#3b82f6', '#3b82f6',
    ];

    const sections = trackHealth?.sections || [];
    const overallHealth = trackHealth?.overall ?? 100;

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>🗺️ GeoRail Live Map</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Delhi–Agra Corridor · 50 km · 8 Block Sections · Real‑time monitoring
                    </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                        className={`btn ${showHazards ? 'btn-danger' : 'btn-outline'}`}
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => setShowHazards(v => !v)}
                    >
                        🚨 {showHazards ? 'Hide' : 'Show'} Hazard Markers
                    </button>
                    <button
                        className={`btn ${showRisk ? 'btn-primary' : 'btn-outline'}`}
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => setShowRisk(v => !v)}
                    >
                        🌡️ {showRisk ? 'Hide' : 'Show'} Risk Overlay
                    </button>
                    <button className="btn btn-outline" style={{ fontSize: '0.75rem' }} onClick={() => { loadHealth(); loadEvents(); }}>
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {/* Overall health bar */}
            <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                            Overall Corridor Health Index (THI)
                        </div>
                        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                            <div style={{
                                width: `${overallHealth}%`,
                                height: '100%',
                                background: healthColor(overallHealth),
                                borderRadius: 8,
                                transition: 'width 0.5s ease',
                            }} />
                        </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1.4rem', color: healthColor(overallHealth) }}>
                        {overallHealth}%
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        {[['#22c55e', '🟢 Normal'], ['#f59e0b', '🟡 Caution'], ['#ef4444', '🔴 Critical']].map(([c, l]) => (
                            <span key={l} style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                {l}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Map */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
                <style>{`
                    @keyframes pulse_map {
                        0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
                        70%  { box-shadow: 0 0 0 12px rgba(239,68,68,0); }
                        100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
                    }
                    .leaflet-container { z-index: 1; }
                `}</style>
                <MapContainer
                    center={[27.9, 77.6]}
                    zoom={9}
                    style={{ height: '520px', width: '100%' }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapFit />

                    {/* Track polyline — full corridor */}
                    <Polyline
                        positions={TRACK_COORDS}
                        color="#1d4ed8"
                        weight={4}
                        opacity={0.7}
                    />

                    {/* Section health colored overlays */}
                    {trackHealth && sections.map((sec, i) => {
                        const start = TRACK_COORDS[i];
                        const end = TRACK_COORDS[i + 1];
                        if (!start || !end) return null;
                        return (
                            <Polyline
                                key={sec.id}
                                positions={[start, end]}
                                color={healthColor(sec.health)}
                                weight={7}
                                opacity={0.8}
                            >
                                <Popup>
                                    <div style={{ minWidth: 180 }}>
                                        <div style={{ fontWeight: 700 }}>{sec.name}</div>
                                        <div style={{ color: healthColor(sec.health), fontWeight: 600 }}>
                                            {healthStatus(sec.health)} — {sec.health}%
                                        </div>
                                        <div style={{ fontSize: 12, marginTop: 4 }}>
                                            KM {sec.km_start}–{sec.km_end}
                                        </div>
                                    </div>
                                </Popup>
                            </Polyline>
                        );
                    })}

                    {/* Station markers */}
                    {STATIONS.map(st => (
                        <CircleMarker
                            key={st.code}
                            center={st.coords}
                            radius={8}
                            color="#1d4ed8"
                            fillColor="#ffffff"
                            fillOpacity={1}
                            weight={2}
                        >
                            <Popup>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{st.name}</div>
                                    <div style={{ fontSize: 12, color: '#666' }}>
                                        Code: {st.code} · KM {st.km}
                                    </div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    ))}

                    {/* Risk overlay circles */}
                    {showRisk && sections.map((sec, i) => {
                        const mid = SECTION_MIDPOINTS[i];
                        if (!mid) return null;
                        const risk = 100 - sec.health;
                        return (
                            <CircleMarker
                                key={`risk-${sec.id}`}
                                center={mid.coords}
                                radius={risk > 0 ? Math.sqrt(risk) * 4 : 5}
                                color={healthColor(sec.health)}
                                fillColor={healthColor(sec.health)}
                                fillOpacity={risk > 0 ? 0.25 : 0}
                                weight={0}
                            />
                        );
                    })}

                    {/* Live hazard event markers */}
                    {showHazards && liveEvents.map((ev, i) => {
                        // Map section ID to coordinate
                        const sIdx = parseInt(ev.section?.replace('BS-', '') || '1') - 1;
                        const mid = SECTION_MIDPOINTS[sIdx];
                        if (!mid) return null;
                        const color = ev.severity?.includes('P1') ? '#ef4444' :
                            ev.severity?.includes('P2') ? '#f59e0b' : '#3b82f6';
                        return (
                            <Marker
                                key={i}
                                position={[mid.coords[0] + (i * 0.02), mid.coords[1] + (i * 0.01)]}
                                icon={pulseIcon(color)}
                            >
                                <Popup>
                                    <div style={{ minWidth: 180 }}>
                                        <div style={{ fontWeight: 700, color }}>
                                            {ev.icon} {ev.event}
                                        </div>
                                        <div style={{ fontSize: 12, marginTop: 4 }}>
                                            <b>Section:</b> {ev.section} · KM {ev.km}<br />
                                            <b>Time:</b> {ev.time}<br />
                                            <b>Confidence:</b> {(ev.confidence * 100).toFixed(1)}%<br />
                                            <b>Severity:</b> {ev.severity?.replace('_', ' ')}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>

            {/* Section health grid */}
            <div className="grid-4" style={{ marginBottom: 16 }}>
                {sections.map(sec => (
                    <div className="card" key={sec.id} style={{ padding: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{sec.id}</div>
                            <div style={{
                                fontSize: '0.68rem', fontWeight: 600, padding: '2px 6px',
                                borderRadius: 4, background: `${healthColor(sec.health)}22`,
                                color: healthColor(sec.health),
                            }}>
                                {sec.health}%
                            </div>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                            {sec.name}
                        </div>
                        <div style={{ background: 'var(--bg-secondary)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                            <div style={{
                                width: `${sec.health}%`, height: '100%',
                                background: healthColor(sec.health), borderRadius: 4,
                                transition: 'width 0.5s',
                            }} />
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>
                            KM {sec.km_start}–{sec.km_end}
                            {sec.station && <span style={{ color: 'var(--blue-600)', marginLeft: 4 }}>• {sec.station}</span>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Live hazard events list */}
            {liveEvents.length > 0 && (
                <div className="card">
                    <div className="card-title">🚨 Live Hazard Events on Map</div>
                    <table className="data-table">
                        <thead>
                            <tr><th>Time</th><th>Event</th><th>Section</th><th>KM</th><th>Severity</th><th>Confidence</th></tr>
                        </thead>
                        <tbody>
                            {liveEvents.map((ev, i) => (
                                <tr key={i}>
                                    <td style={{ fontFamily: 'monospace' }}>{ev.time}</td>
                                    <td>{ev.icon} {ev.event}</td>
                                    <td>{ev.section}</td>
                                    <td>{ev.km}</td>
                                    <td>
                                        <span className={`badge ${ev.severity?.includes('P1') ? 'p1' : ev.severity?.includes('P2') ? 'p2' : 'p3'}`}>
                                            {ev.severity?.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td>{(ev.confidence * 100).toFixed(1)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
