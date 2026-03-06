"""
SonicRail – Detector
Loads trained ML model and runs real-time detection on audio files.
"""
import os
import random
import numpy as np
import joblib
from config import (
    MODELS_DIR, DATA_RAW_DIR, EVENT_CLASSES, EVENT_LABELS,
    BLOCK_SECTIONS, SAMPLE_RATE,
)
from feature_extraction import extract_features
from audio_utils import load_audio, normalize_signal


class Detector:
    def __init__(self):
        model_path = os.path.join(MODELS_DIR, "sonic_rail_model.pkl")
        self.classifier = None
        if os.path.exists(model_path):
            try:
                self.classifier = joblib.load(model_path)
            except Exception as e:
                print(f"Failed to load model: {e}")

    def detect_random(self):
        """Pick a random audio file and classify it."""
        cls = random.choice(EVENT_CLASSES)
        return self._detect_from_class(cls)

    def detect_class(self, target_class):
        """Detect from a specific class."""
        return self._detect_from_class(target_class)

    def _detect_from_class(self, cls):
        cls_dir = os.path.join(DATA_RAW_DIR, cls)
        if not os.path.exists(cls_dir):
            return {"success": False, "error": f"No data for class: {cls}"}

        files = [f for f in os.listdir(cls_dir) if f.endswith(".wav")]
        if not files:
            return {"success": False, "error": f"No audio files for class: {cls}"}

        filepath = os.path.join(cls_dir, random.choice(files))

        try:
            signal = load_audio(filepath, sr=SAMPLE_RATE)
            signal = normalize_signal(signal)
            features = extract_features(signal, SAMPLE_RATE)

            pred = self.classifier.predict(features)
            pred["class_label"] = EVENT_LABELS.get(pred["class_name"], pred["class_name"])

            section = random.choice(BLOCK_SECTIONS)
            km = round(random.uniform(section["km_start"], section["km_end"]), 1)

            return {
                "success": True,
                "prediction": pred,
                "section": section,
                "km_position": km,
                "signal": signal,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
