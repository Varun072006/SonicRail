import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line } from 'recharts';
import { KpiCard, SectionHeader } from '../components/UIComponents';

export default function AICenter({ api }) {
    const [metrics, setMetrics] = useState(null);
    const [anomalyStats, setAnomalyStats] = useState(null);
    const [fbStats, setFbStats] = useState(null);

    useEffect(() => {
        fetch(`${api}/model-metrics`).then(r => r.json()).then(setMetrics).catch(console.error);
        fetch(`${api}/anomaly-status`).then(r => r.json()).then(setAnomalyStats).catch(console.error);
        fetch(`${api}/feedback/stats`).then(r => r.json()).then(setFbStats).catch(console.error);
    }, [api]);

    if (!metrics) return (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🧠</div>
            Run <code style={{ background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 4 }}>python run_pipeline.py</code> to train the model first.
        </div>
    );

    const acc = (metrics.accuracy * 100).toFixed(1);
    const cvMean = (metrics.cv_mean * 100).toFixed(1);
    const cvStd = (metrics.cv_std * 100).toFixed(1);
    const classLabels = metrics.class_labels || [];

    const fiData = (metrics.feature_importance || [])
        .map((v, i) => ({ name: `F${i + 1}`, value: v }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 15);

    const rocData = metrics.roc_data || {};
    const rfAcc = metrics.rf_cv ? (metrics.rf_cv.mean * 100).toFixed(1) : null;
    const svmAcc = metrics.svm_cv ? (metrics.svm_cv.mean * 100).toFixed(1) : null;

    return (
        <div>
            {/* Model Card */}
            <SectionHeader icon="🪪" title="Model Card" />
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', marginBottom: 24 }}>
                <KpiCard value={metrics.model_name?.split(' ')[0] || '—'} label="Algorithm" color="blue" />
                <KpiCard value={`${acc}%`} label="Accuracy" color="green" />
                <KpiCard value={`${cvMean}% ± ${cvStd}%`} label="CV Score" color="cyan" />
                <KpiCard value={metrics.n_features || 31} label="Features" color="blue" />
                <KpiCard value={metrics.training_samples || '—'} label="Train Samples" color="amber" />
                <KpiCard value={metrics.training_date?.slice(0, 10) || '—'} label="Training Date" color="blue" />
            </div>

            {/* Model Comparison: RF vs SVM */}
            {rfAcc && svmAcc && (
                <>
                    <SectionHeader icon="⚖️" title="Model Comparison: Classical vs Deep Learning" />
                    <div className="grid-3" style={{ marginBottom: 24 }}>
                        {/* Random Forest */}
                        <div className="card" style={{ borderTop: '3px solid var(--blue-500)' }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>🌲</div>
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>Random Forest</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--blue-600)', marginBottom: 8 }}>{rfAcc}%</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                Cross-val accuracy · 100 estimators<br />
                                Feature importance available<br />
                                Fast inference · Interpretable
                            </div>
                            {metrics.model_name?.includes('Forest') && (
                                <div style={{ marginTop: 8, fontSize: '0.7rem', color: 'var(--green-600)', fontWeight: 600 }}>✓ SELECTED (auto)</div>
                            )}
                        </div>
                        {/* SVM */}
                        <div className="card" style={{ borderTop: '3px solid var(--cyan-500)' }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>⚙️</div>
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>SVM (RBF Kernel)</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--cyan-600)', marginBottom: 8 }}>{svmAcc}%</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                Cross-val accuracy · RBF kernel<br />
                                High-dimensional margin<br />
                                Good for small datasets
                            </div>
                            {metrics.model_name?.includes('SVM') && (
                                <div style={{ marginTop: 8, fontSize: '0.7rem', color: 'var(--green-600)', fontWeight: 600 }}>✓ SELECTED (auto)</div>
                            )}
                        </div>
                        {/* CRNN */}
                        <div className="card" style={{ borderTop: '3px solid var(--purple-500, #a855f7)', opacity: metrics.crnn?.best_train_acc ? 1 : 0.75 }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>🧠</div>
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>CNN + BiLSTM (CRNN)</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#a855f7', marginBottom: 8 }}>
                                {metrics.crnn?.best_train_acc ? `${(metrics.crnn.best_train_acc * 100).toFixed(1)}%` : '—'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                Mel Spectrogram input (64×128)<br />
                                3× CNN blocks + 2× BiLSTM layers<br />
                                Expected: 92–96% with large dataset
                            </div>
                            <div style={{ marginTop: 8, fontSize: '0.7rem', color: '#a855f7' }}>
                                {metrics.crnn?.best_train_acc ? '✓ Trained' : '⚙ Run with --deep flag'}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Anomaly Detector */}
            <SectionHeader icon="🔍" title="Anomaly Detection Layer" />
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="grid-2">
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Unknown Event Detection</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12 }}>
                            An <b>Isolation Forest</b> model sits before the classifier and flags sounds
                            that are outside the training distribution — catching events like heavy rain,
                            machinery, construction, or falling debris that the classifier has never seen.
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: 12, borderRadius: 'var(--radius-sm)', lineHeight: 2 }}>
                            Audio → Features → Anomaly Detector<br />
                            {'  '}↓ Unknown → ⚠️ ALERT: Unidentified Event<br />
                            {'  '}↓ Known   → Classifier → Decision
                        </div>
                    </div>
                    <div>
                        {anomalyStats ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {[
                                    ['Model', anomalyStats.model_type || '—'],
                                    ['Estimators', anomalyStats.n_estimators],
                                    ['Contamination', `${(anomalyStats.contamination * 100).toFixed(0)}%`],
                                    ['Threshold', anomalyStats.threshold?.toFixed(4) ?? '—'],
                                    ['Evaluated', anomalyStats.total_evaluated],
                                    ['Anomalies', anomalyStats.anomalies_detected],
                                    ['Anomaly Rate', `${(anomalyStats.anomaly_rate * 100).toFixed(1)}%`],
                                    ['Status', anomalyStats.model_loaded ? '✅ Loaded' : '⏳ Not loaded'],
                                ].map(([k, v]) => (
                                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                                        <span style={{ fontWeight: 600 }}>{v}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                Anomaly detector not loaded — run python run_pipeline.py
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Self-Learning Feedback */}
            <SectionHeader icon="🔁" title="Self-Learning System" />
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="grid-2">
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Operator Feedback Loop</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                            Operators can mark each alert as <b style={{ color: 'var(--green-600)' }}>✔ Correct</b> or{' '}
                            <b style={{ color: 'var(--red-500)' }}>✖ False Alarm</b> from the Incident Manager.
                            Feedback is logged to <code>feedback_log.json</code> and can be used to periodically
                            retrain the classifier on real-world corrections — improving accuracy over time.
                        </div>
                    </div>
                    <div>
                        {fbStats && (
                            <>
                                <div style={{ marginBottom: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
                                        <span>Confirmed Correct</span>
                                        <b style={{ color: 'var(--green-600)' }}>{fbStats.confirmed} / {fbStats.total_feedback}</b>
                                    </div>
                                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, height: 10 }}>
                                        <div style={{
                                            width: `${fbStats.confirmed_rate * 100}%`, height: '100%',
                                            background: 'var(--green-500)', borderRadius: 8, transition: 'width 0.5s',
                                        }} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <div style={{ background: 'var(--green-50)', border: '1px solid var(--green-200)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--green-600)' }}>{fbStats.confirmed}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--green-600)' }}>Confirmed</div>
                                    </div>
                                    <div style={{ background: 'var(--red-50, #fef2f2)', border: '1px solid var(--red-200, #fecaca)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--red-500)' }}>{fbStats.false_alarms}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--red-500)' }}>False Alarms</div>
                                    </div>
                                </div>
                            </>
                        )}
                        {(!fbStats || fbStats.total_feedback === 0) && (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                No feedback submitted yet. Use the Incident Manager to confirm or flag detections.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Classic ML metrics */}
            <div className="grid-2" style={{ marginBottom: 24 }}>
                {/* Confusion Matrix */}
                <div className="card">
                    <div className="card-title">🎯 Confusion Matrix</div>
                    {metrics.confusion_matrix && (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table" style={{ fontSize: '0.75rem' }}>
                                <thead>
                                    <tr>
                                        <th style={{ background: 'transparent' }}></th>
                                        {classLabels.map((label, i) => (
                                            <th key={i} style={{ textAlign: 'center', fontSize: '0.65rem' }}>
                                                {metrics.class_icons?.[i]} {label.split(' ')[0]}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {metrics.confusion_matrix.map((row, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600, fontSize: '0.7rem' }}>{metrics.class_icons?.[i]} {classLabels[i]?.split(' ')[0]}</td>
                                            {row.map((val, j) => {
                                                const isCorrect = i === j;
                                                const maxVal = Math.max(...metrics.confusion_matrix.flat());
                                                const intensity = val / maxVal;
                                                return (
                                                    <td key={j} style={{
                                                        textAlign: 'center', fontWeight: isCorrect ? 700 : 400,
                                                        background: isCorrect ? `rgba(37, 99, 235, ${intensity * 0.25})` : `rgba(239, 68, 68, ${intensity * 0.1})`,
                                                        color: isCorrect ? 'var(--blue-600)' : 'var(--text-primary)',
                                                    }}>{val}</td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Classification Report */}
                <div className="card">
                    <div className="card-title">📊 Classification Report</div>
                    {metrics.classification_report && (
                        <div>
                            <table className="data-table">
                                <thead>
                                    <tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1-Score</th><th>Support</th></tr>
                                </thead>
                                <tbody>
                                    {classLabels.map((label, i) => {
                                        const rep = metrics.classification_report[label] || {};
                                        return (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{metrics.class_icons?.[i]} {label}</td>
                                                <td>{rep.precision?.toFixed(3)}</td>
                                                <td>{rep.recall?.toFixed(3)}</td>
                                                <td>{rep['f1-score']?.toFixed(3)}</td>
                                                <td>{rep.support}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div style={{ textAlign: 'center', marginTop: 12 }}>
                                Overall Accuracy: <span style={{ color: 'var(--green-500)', fontWeight: 700, fontSize: '1.2rem' }}>{acc}%</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 24 }}>
                {/* Feature Importance */}
                {fiData.length > 0 && (
                    <div className="card">
                        <div className="card-title">📊 Feature Importance (Top 15)</div>
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={fiData} layout="vertical" margin={{ left: 30 }}>
                                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} width={40} />
                                <Tooltip />
                                <Bar dataKey="value" fill="var(--blue-500)" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* ROC Curves */}
                {Object.keys(rocData).length > 0 && (
                    <div className="card">
                        <div className="card-title">📈 ROC Curves</div>
                        <ResponsiveContainer width="100%" height={350}>
                            <LineChart>
                                <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                                <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                                <Tooltip />
                                <Line data={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} dataKey="y" stroke="var(--border)"
                                    strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                                {Object.entries(rocData).map(([cls, rd], i) => {
                                    const colors = ['#3b82f6', '#f59e0b', '#ef4444', '#22c55e', '#a855f7'];
                                    const lineData = rd.fpr?.map((f, j) => ({ x: f, y: rd.tpr[j] })) || [];
                                    return (
                                        <Line key={cls} data={lineData} dataKey="y"
                                            name={`${classLabels[i] || cls} (AUC=${rd.auc?.toFixed(3)})`}
                                            stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />
                                    );
                                })}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

        </div>
    );
}
