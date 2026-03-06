"""
SonicRail – Central Configuration
All paths, parameters, railway hierarchy, event classes, and UI constants.
"""
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ──── Paths ────
DATA_DIR = os.path.join(BASE_DIR, "data")
DATA_RAW_DIR = os.path.join(DATA_DIR, "raw")
DATA_PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
MODELS_DIR = os.path.join(BASE_DIR, "models")

for d in [DATA_DIR, DATA_RAW_DIR, DATA_PROCESSED_DIR, MODELS_DIR]:
    os.makedirs(d, exist_ok=True)

# ──── Audio Parameters ────
SAMPLE_RATE = 22050
DURATION = 3.0
N_MFCC = 13
N_FFT = 2048
HOP_LENGTH = 512

# ──── Event Classes ────
EVENT_CLASSES = [
    "train_movement",
    "animal_intrusion",
    "rockfall_landslide",
    "track_fracture",
    "normal_ambient",
]

EVENT_LABELS = {
    "train_movement": "Train Movement",
    "animal_intrusion": "Animal Intrusion",
    "rockfall_landslide": "Rockfall / Landslide",
    "track_fracture": "Track Fracture",
    "normal_ambient": "Normal / Ambient",
}

EVENT_ICONS = {
    "train_movement": "🚆",
    "animal_intrusion": "🐾",
    "rockfall_landslide": "🪨",
    "track_fracture": "⚡",
    "normal_ambient": "✅",
}

EVENT_SEVERITY = {
    "train_movement": "NORMAL",
    "animal_intrusion": "P2_WARNING",
    "rockfall_landslide": "P1_CRITICAL",
    "track_fracture": "P1_CRITICAL",
    "normal_ambient": "NORMAL",
}

# ──── Alert Tiers ────
ALERT_TIERS = {
    "P1_CRITICAL": {"color": "#ef4444", "label": "P1 – CRITICAL", "response": "IMMEDIATE"},
    "P2_WARNING": {"color": "#f59e0b", "label": "P2 – WARNING", "response": "URGENT"},
    "P3_ADVISORY": {"color": "#3b82f6", "label": "P3 – ADVISORY", "response": "ROUTINE"},
    "NORMAL": {"color": "#22c55e", "label": "NORMAL", "response": "LOG ONLY"},
}

# ──── Railway Hierarchy ────
RAILWAY_ZONE = "Northern Railway"
RAILWAY_DIVISION = "Delhi Division"
RAILWAY_SECTION = "Delhi–Agra Corridor"

STATIONS = [
    {"name": "New Delhi", "code": "NDLS", "km": 0},
    {"name": "Hazrat Nizamuddin", "code": "NZM", "km": 5},
    {"name": "Faridabad", "code": "FDB", "km": 15},
    {"name": "Palwal", "code": "PWL", "km": 25},
    {"name": "Mathura Junction", "code": "MTJ", "km": 35},
    {"name": "Agra Cantt", "code": "AGC", "km": 50},
]

BLOCK_SECTIONS = [
    {"id": "BS-1", "name": "NDLS–NZM Block", "km_start": 0, "km_end": 6, "station": "NDLS"},
    {"id": "BS-2", "name": "NZM–FDB Block", "km_start": 6, "km_end": 12, "station": "NZM"},
    {"id": "BS-3", "name": "FDB–Ballabgarh", "km_start": 12, "km_end": 18, "station": "FDB"},
    {"id": "BS-4", "name": "Ballabgarh–PWL", "km_start": 18, "km_end": 24, "station": "PWL"},
    {"id": "BS-5", "name": "PWL–Kosi Kalan", "km_start": 24, "km_end": 30},
    {"id": "BS-6", "name": "Kosi Kalan–MTJ", "km_start": 30, "km_end": 36, "station": "MTJ"},
    {"id": "BS-7", "name": "MTJ–Runkata", "km_start": 36, "km_end": 44},
    {"id": "BS-8", "name": "Runkata–AGC", "km_start": 44, "km_end": 50, "station": "AGC"},
]

INCIDENT_STATUSES = ["DETECTED", "ACKNOWLEDGED", "INVESTIGATING", "RESOLVED"]

# ──── Model ────
MODEL_PATH = os.path.join(MODELS_DIR, "sonic_rail_model.pkl")
FEATURES_PATH = os.path.join(DATA_PROCESSED_DIR, "features.npz")
