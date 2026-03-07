"""
SonicRail – Prediction Engine v2.0
Enhanced THI formula + 7-day health forecast + persistent state.
"""
import os
import json
import random
from config import BLOCK_SECTIONS, EVENT_SEVERITY, MODELS_DIR


STATE_PATH = os.path.join(MODELS_DIR, "track_health_state.json")


class PredictionEngine:
    def __init__(self):
        self.section_health = {}
        self.section_event_counts = {}   # count per class per section
        self.events_history = []
        self._init_health()
        self._load_state()

    def _init_health(self):
        for section in BLOCK_SECTIONS:
            sid = section["id"]
            self.section_health[sid] = {"health": 100.0, "events": 0, "last_event": None}
            self.section_event_counts[sid] = {}

    # ──────────────────────────────────────────────────────────
    # State persistence
    # ──────────────────────────────────────────────────────────

    def _load_state(self):
        if os.path.exists(STATE_PATH):
            try:
                with open(STATE_PATH) as f:
                    saved = json.load(f)
                for sid, data in saved.items():
                    if sid in self.section_health:
                        self.section_health[sid].update(data)
            except Exception:
                pass

    def _save_state(self):
        import threading
        def worker():
            try:
                os.makedirs(MODELS_DIR, exist_ok=True)
                with open(STATE_PATH, "w") as f:
                    json.dump(self.section_health, f, indent=2)
            except Exception:
                pass
        threading.Thread(target=worker, daemon=True).start()

    # ──────────────────────────────────────────────────────────
    # Event ingestion
    # ──────────────────────────────────────────────────────────

    def add_event(self, event):
        self.events_history.append(event)
        sid = event["section_id"]
        if sid not in self.section_health:
            return

        sev = event.get("severity", "NORMAL")
        conf = event.get("confidence", 0.5)
        cls_name = event.get("class_name", "")

        # ── Enhanced THI Formula ──────────────────────────────
        # Base severity penalty (weighted by confidence)
        base_penalty = {"P1_CRITICAL": 15, "P2_WARNING": 8, "P3_ADVISORY": 3, "NORMAL": 0}.get(sev, 0)
        confidence_factor = 0.5 + 0.5 * conf
        severity_penalty = base_penalty * confidence_factor

        # Rockfall-specific degradation (structural risk)
        rockfall_penalty = 5.0 if cls_name == "rockfall_landslide" else 0.0

        # Event frequency factor: more events → faster degradation
        counts = self.section_event_counts[sid]
        counts[cls_name] = counts.get(cls_name, 0) + 1
        freq_penalty = min(counts.get(cls_name, 0) * 0.2, 5.0)

        # Small noise to simulate environmental variation
        noise = random.gauss(0, 1.0)

        # Natural recovery over time (5.0 per event if section is clear)
        recovery = 5.0 if sev == "NORMAL" else 0.0

        total_change = -severity_penalty - rockfall_penalty - freq_penalty + recovery + noise

        self.section_health[sid]["health"] = max(0.0, min(100.0,
            self.section_health[sid]["health"] + total_change))
        self.section_health[sid]["events"] += 1
        self.section_health[sid]["last_event"] = cls_name

        # Save state every 10 events
        if len(self.events_history) % 10 == 0:
            self._save_state()

    # ──────────────────────────────────────────────────────────
    # Health queries
    # ──────────────────────────────────────────────────────────

    def get_track_health(self):
        result = {}
        for sid, data in self.section_health.items():
            h = data["health"]
            status = "GOOD" if h >= 80 else "CAUTION" if h >= 50 else "DANGER"
            color = "#22c55e" if h >= 80 else "#f59e0b" if h >= 50 else "#ef4444"
            result[sid] = {"health": round(h, 1), "status": status, "color": color,
                           "events": data["events"], "last_event": data.get("last_event")}
        return result

    def get_overall_health(self):
        healths = [d["health"] for d in self.section_health.values()]
        return round(sum(healths) / len(healths), 1) if healths else 100.0

    def get_health_forecast(self):
        """
        7-day projected health per section using linear extrapolation.
        Returns: {sid: [day0, day1, ..., day6]}
        """
        forecast = {}
        for section in BLOCK_SECTIONS:
            sid = section["id"]
            current = self.section_health[sid]["health"]
            events_today = self.section_health[sid]["events"]

            # Estimate daily degradation rate based on event frequency
            daily_rate = min(events_today * 0.5, 8.0)  # max 8% per day
            recovery_rate = 1.5  # natural recovery if no events

            # Project 7 days (assume 70% of today's rate going forward, with recovery)
            net_change = -daily_rate * 0.7 + recovery_rate
            days = []
            h = current
            for d in range(7):
                h = min(100.0, max(0.0, h + net_change + random.gauss(0, 0.5)))
                days.append(round(h, 1))
            forecast[sid] = days
        return forecast

    def get_risk_heatmap(self):
        heatmap = []
        for section in BLOCK_SECTIONS:
            sid = section["id"]
            h = self.section_health[sid]["health"]
            base_risk = 100 - h
            risks = []
            for hour in range(24):
                time_factor = 1.2 if 0 <= hour <= 5 else 0.8 if 6 <= hour <= 18 else 1.0
                risk = min(100, max(0, base_risk * time_factor + random.uniform(-5, 5)))
                risks.append(round(risk, 1))
            heatmap.append({"section": sid, "risks": risks})
        return heatmap

    def get_maintenance_queue(self):
        queue = []
        for section in BLOCK_SECTIONS:
            sid = section["id"]
            h = self.section_health[sid]["health"]
            if h < 80:
                urgency = "CRITICAL" if h < 50 else "HIGH"
                issue = "Multiple hazard detections" if h < 50 else "Declining health index"
                action = "Immediate inspection" if h < 50 else "Schedule maintenance"
                queue.append({
                    "section": sid, "health": round(h, 1),
                    "urgency": urgency, "issue": issue, "action": action,
                })
        return sorted(queue, key=lambda x: x["health"])

    def get_predictive_alerts(self):
        alerts = []
        for section in BLOCK_SECTIONS:
            sid = section["id"]
            h = self.section_health[sid]["health"]
            if h < 60:
                alerts.append({
                    "section": sid,
                    "urgency": "IMMEDIATE" if h < 40 else "SCHEDULED",
                    "message": f"THI dropped to {round(h, 1)}% — infrastructure integrity at risk",
                    "recommended_action": "Deploy track inspection team within 2 hours" if h < 40
                        else "Schedule inspection within 24 hours",
                })
        return alerts

    def get_trend_data(self):
        trends = {}
        for section in BLOCK_SECTIONS:
            sid = section["id"]
            trends[sid] = [random.randint(0, 8) for _ in range(7)]
        return trends
