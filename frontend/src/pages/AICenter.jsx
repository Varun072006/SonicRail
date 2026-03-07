import { useState, useRef, useEffect } from 'react';
import { SectionHeader } from '../components/UIComponents';
import { Send, FileText, Bot, User, Loader2 } from 'lucide-react';

export default function AICenter({ api }) {
    const [messages, setMessages] = useState([
        { role: 'assistant', text: "Hello! I am the SonicRail AI Co-Pilot. I have direct access to real-time track stress levels, active incidents, and maintenance schedules. How can I assist you today?" }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);

    const [reportIncidentId, setReportIncidentId] = useState('');
    const [reportText, setReportText] = useState('');
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    const chatEndRef = useRef(null);

    // Auto-scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input.trim();
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setIsThinking(true);

        try {
            const res = await fetch(`${api}/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg })
            });

            const data = await res.json();

            if (data.error || data.response.includes('Error communicating')) {
                setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ Connection Error: Please ensure Ollama is running locally and the 'llama3' model is installed. (${data.error || data.response})`, error: true }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', text: data.response }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', text: "⚠️ Network Error: Could not reach the SonicRail API Server.", error: true }]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleGenerateReport = async () => {
        setIsGeneratingReport(true);
        setReportText('');
        try {
            // Mocking incident data fetch for the sake of the demo
            const incidentData = {
                incident_id: reportIncidentId || "INC-TEST-001",
                type: "P1_CRITICAL Hazard",
                classification: "Rockfall Detected",
                confidence: 0.94,
                timestamp: new Date().toISOString()
            };

            const res = await fetch(`${api}/ai/generate-report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ incident: incidentData })
            });

            const data = await res.json();
            setReportText(data.report || data.error);
        } catch (error) {
            setReportText("⚠️ Error connecting to server to generate report.");
        } finally {
            setIsGeneratingReport(false);
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) minmax(400px, 1.2fr)', gap: '24px', height: 'calc(100vh - 140px)' }}>

            {/* Llama 3 Co-Pilot Chat */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
                <SectionHeader icon="🧠" title="Railway Co-Pilot (Powered by Llama 3)" />
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0', marginBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                    {messages.map((m, i) => (
                        <div key={i} style={{ display: 'flex', gap: '12px', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: m.role === 'user' ? 'var(--blue-600)' : 'var(--slate-800)', color: 'white'
                            }}>
                                {m.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                            </div>
                            <div style={{
                                maxWidth: '75%', padding: '12px 16px', borderRadius: '12px', fontSize: '0.9rem', lineHeight: '1.5',
                                background: m.role === 'user' ? 'var(--blue-600)' : m.error ? 'var(--red-900)' : 'var(--bg-secondary)',
                                color: m.role === 'user' ? 'white' : m.error ? 'var(--red-100)' : 'var(--text-primary)',
                                border: m.role === 'user' ? 'none' : m.error ? '1px solid var(--red-500)' : '1px solid var(--border)',
                                borderTopRightRadius: m.role === 'user' ? '4px' : '12px',
                                borderTopLeftRadius: m.role === 'assistant' ? '4px' : '12px'
                            }}>
                                {m.text.split('\n').map((line, j) => <div key={j} style={{ minHeight: line ? 'auto' : '1rem' }}>{line}</div>)}
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--slate-800)', color: 'white' }}>
                                <Bot size={18} />
                            </div>
                            <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '12px', borderTopLeftRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Loader2 size={16} className="spinner" style={{ color: 'var(--blue-500)' }} />
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Co-Pilot is analyzing track telemetry...</span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about track stress, incidents, or SOPs..."
                        style={{ flex: 1, padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem' }}
                        disabled={isThinking}
                    />
                    <button type="submit" className="btn btn-primary" style={{ padding: '0 24px', borderRadius: '8px' }} disabled={isThinking || !input.trim()}>
                        <Send size={18} />
                    </button>
                </form>
            </div>

            {/* Automated Reporting Engine */}
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <SectionHeader icon="📑" title="Automated Report Generation" />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6' }}>
                    Generate formal incident reports instantly using Generative AI. The agent will pull the specific incident telemtry and cross-reference it with the Predictive Maintenance engine to suggest repair actions.
                </p>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                    <input
                        type="text"
                        placeholder="Incident ID (e.g. INC-TEST-001)"
                        value={reportIncidentId}
                        onChange={(e) => setReportIncidentId(e.target.value)}
                        style={{ flex: 1, padding: '12px 16px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem' }}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={handleGenerateReport}
                        disabled={isGeneratingReport}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        {isGeneratingReport ? <Loader2 size={16} className="spinner" /> : <FileText size={16} />}
                        {isGeneratingReport ? 'Generating Draft...' : 'Generate Official Report'}
                    </button>
                </div>

                <div style={{
                    flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '24px', overflowY: 'auto',
                    fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '0.95rem', lineHeight: '1.7', color: 'var(--text-primary)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }}>
                    {isGeneratingReport ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)' }}>
                            <Loader2 size={32} className="spinner" style={{ color: 'var(--blue-500)' }} />
                            <span>Llama 3 is analyzing telemetry metrics and drafting the executive summary...</span>
                        </div>
                    ) : reportText ? (
                        <div style={{ padding: '10px' }}>
                            <h3 style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.8rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>Incident Post-Mortem</h3>
                            {reportText.split('\n').filter(line => line.trim() !== '').map((line, i) => (
                                <p key={i} style={{ marginBottom: '1.2em', textAlign: 'justify' }}>{line}</p>
                            ))}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center' }}>
                            <FileText size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                            <span>No report generated yet.<br />Enter an Incident ID and click Generate.</span>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
