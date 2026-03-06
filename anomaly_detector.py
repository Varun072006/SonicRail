"""
SonicRail – Anomaly Detector (Unknown Event Detection)
Uses Isolation Forest to detect sounds outside the training distribution.
Architecture:
    Audio → Features → Anomaly Detector
        ↓ Unknown → ALERT: Unidentified Acoustic Event
        ↓ Known   → Classifier
"""
import os
import numpy as np
import joblib


ANOMALY_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "models", "anomaly_detector.pkl"
)


class AnomalyDetector:
    """Isolation Forest-based anomaly detector for out-of-distribution acoustic events."""

    # Contamination: expected fraction of anomalies in the dataset
    CONTAMINATION = 0.05

    def __init__(self):
        self.model = None
        self.threshold = None
        self.stats = {
            "total_evaluated": 0,
            "anomalies_detected": 0,
            "last_score": None,
        }

    # ──────────────────────────────────────────────────────────
    # Training
    # ──────────────────────────────────────────────────────────

    def fit(self, X_normal):
        """
        Train on 'normal' feature vectors (normal ambient + train movement).
        X_normal: numpy array of shape (n_samples, n_features)
        """
        from sklearn.ensemble import IsolationForest
        self.model = IsolationForest(
            n_estimators=200,
            contamination=self.CONTAMINATION,
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(X_normal)
        # Compute threshold on training data (5th percentile of anomaly scores)
        scores = self.model.score_samples(X_normal)
        self.threshold = float(np.percentile(scores, 5))
        print(f"  [AnomalyDetector] Trained on {len(X_normal)} samples | threshold={self.threshold:.4f}")
        return self

    # ──────────────────────────────────────────────────────────
    # Inference
    # ──────────────────────────────────────────────────────────

    def predict(self, features):
        """
        Evaluate a single feature vector.
        Returns dict: {is_anomaly, anomaly_score, confidence}
        """
        if self.model is None:
            return {"is_anomaly": False, "anomaly_score": 0.0, "confidence": 1.0}

        x = np.array(features).reshape(1, -1)
        score = float(self.model.score_samples(x)[0])
        is_anomaly = bool(score < self.threshold)

        self.stats["total_evaluated"] += 1
        if is_anomaly:
            self.stats["anomalies_detected"] += 1
        self.stats["last_score"] = round(score, 4)

        # Normalize score to [0,1] confidence (higher = more normal)
        confidence = float(np.clip((score - self.threshold) / (abs(self.threshold) + 1e-8) + 0.5, 0, 1))

        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": round(score, 4),
            "confidence": round(confidence, 4),
        }

    def get_stats(self):
        total = self.stats["total_evaluated"]
        anomalies = self.stats["anomalies_detected"]
        return {
            "model_type": "Isolation Forest",
            "n_estimators": 200 if self.model else 0,
            "contamination": self.CONTAMINATION,
            "threshold": round(self.threshold, 4) if self.threshold is not None else None,
            "total_evaluated": total,
            "anomalies_detected": anomalies,
            "anomaly_rate": round(anomalies / total, 4) if total > 0 else 0.0,
            "last_score": self.stats["last_score"],
            "model_loaded": self.model is not None,
        }

    # ──────────────────────────────────────────────────────────
    # Persistence
    # ──────────────────────────────────────────────────────────

    def save(self, path=None):
        path = path or ANOMALY_MODEL_PATH
        os.makedirs(os.path.dirname(path), exist_ok=True)
        joblib.dump({"model": self.model, "threshold": self.threshold}, path)
        print(f"  [AnomalyDetector] Saved to {path}")

    def load(self, path=None):
        path = path or ANOMALY_MODEL_PATH
        if not os.path.exists(path):
            return False
        data = joblib.load(path)
        self.model = data["model"]
        self.threshold = data["threshold"]
        return True
