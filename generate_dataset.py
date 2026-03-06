"""
SonicRail – Synthetic Dataset Generator (Enhanced v2.0)
Generates DAS-simulated audio for 5 threat classes with augmentation.
- 200 samples/class → 1,000 total (5x previous size)
- Per-sample augmentation: noise injection, amplitude jitter, time-stretch
"""
import os
import numpy as np
import soundfile as sf
from config import DATA_RAW_DIR, SAMPLE_RATE, DURATION, EVENT_CLASSES

SAMPLES_PER_CLASS = 200

# ──────────────────────────────────────────────────────────────
# Signal Generators
# ──────────────────────────────────────────────────────────────

def generate_train_movement(sr, duration):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Low-frequency rumble with joint rhythm
    signal = 0.5 * np.sin(2 * np.pi * 40 * t) + 0.3 * np.sin(2 * np.pi * 80 * t)
    # Doppler-like modulation
    signal += 0.15 * np.sin(2 * np.pi * 160 * t) * np.sin(2 * np.pi * 2 * t)
    # Rail joint clicks with slight irregularity
    click_freq = np.random.uniform(4.5, 5.5)
    signal += 0.2 * np.sin(2 * np.pi * click_freq * t) * np.sin(2 * np.pi * 120 * t)
    signal += 0.05 * np.random.randn(len(t))
    return signal


def generate_animal_intrusion(sr, duration):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    signal = np.zeros_like(t)
    # Periodic impulses (footsteps) with random timing variation
    step_interval = int(sr * np.random.uniform(0.35, 0.55))
    for i in range(0, len(t), step_interval):
        pulse_len = min(int(sr * 0.05), len(t) - i)
        freq = np.random.uniform(150, 280)
        signal[i:i + pulse_len] = 0.6 * np.sin(2 * np.pi * freq * t[:pulse_len])
    # Add body weight vibration
    signal += 0.1 * np.sin(2 * np.pi * 30 * t) * (np.random.randn(len(t)) * 0.1)
    signal += 0.08 * np.random.randn(len(t))
    return signal


def generate_rockfall_landslide(sr, duration):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Broadband burst with exponential decay
    decay = np.random.uniform(1.5, 4.0)
    burst = np.random.randn(len(t)) * np.exp(-t * decay)
    low_freq = 0.4 * np.sin(2 * np.pi * np.random.uniform(20, 50) * t) * np.exp(-t * 2)
    # Secondary smaller bursts (debris)
    debris_pos = int(sr * np.random.uniform(0.5, 1.2))
    debris = np.zeros_like(t)
    if debris_pos < len(t):
        t2 = t[debris_pos:]
        debris[debris_pos:] = 0.4 * np.random.randn(len(t2)) * np.exp(-t2 * 5)
    signal = burst + low_freq + debris
    return signal


def generate_track_fracture(sr, duration):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Sharp crack at random position + resonant ringing
    crack_pos = int(sr * np.random.uniform(0.1, 0.5))
    signal = np.zeros_like(t)
    crack_len = min(np.random.randint(80, 150), len(t) - crack_pos)
    signal[crack_pos:crack_pos + crack_len] = np.random.randn(crack_len)
    # Metallic resonance at 2–5 kHz
    ring_freq = np.random.uniform(2500, 4500)
    ringing = 0.5 * np.sin(2 * np.pi * ring_freq * t) * np.exp(-t * np.random.uniform(3, 7))
    signal += ringing
    signal += 0.03 * np.random.randn(len(t))
    return signal


def generate_normal_ambient(sr, duration):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    signal = 0.1 * np.random.randn(len(t))
    signal += 0.05 * np.sin(2 * np.pi * 50 * t)   # 50 Hz power hum
    signal += 0.02 * np.sin(2 * np.pi * 100 * t)  # harmonic
    # Occasional wind gust
    if np.random.random() < 0.3:
        gust_start = np.random.randint(0, len(t) // 2)
        gust_len = int(sr * np.random.uniform(0.2, 0.6))
        gust_len = min(gust_len, len(t) - gust_start)
        signal[gust_start:gust_start + gust_len] += 0.15 * np.random.randn(gust_len)
    return signal


GENERATORS = {
    "train_movement": generate_train_movement,
    "animal_intrusion": generate_animal_intrusion,
    "rockfall_landslide": generate_rockfall_landslide,
    "track_fracture": generate_track_fracture,
    "normal_ambient": generate_normal_ambient,
}


# ──────────────────────────────────────────────────────────────
# Augmentation helpers
# ──────────────────────────────────────────────────────────────

def augment_signal(signal, sr):
    """Apply random augmentation to a signal."""
    # Amplitude jitter (±30%)
    signal = signal * np.random.uniform(0.7, 1.3)

    # Additive noise (SNR 20–40 dB)
    snr_db = np.random.uniform(20, 40)
    signal_power = np.mean(signal ** 2)
    noise_power = signal_power / (10 ** (snr_db / 10))
    signal = signal + np.sqrt(noise_power) * np.random.randn(len(signal))

    # Random DC offset
    signal = signal + np.random.uniform(-0.02, 0.02)

    return signal


def normalize(signal):
    """Normalize to [-1, 1] safely."""
    peak = np.max(np.abs(signal))
    if peak > 0:
        signal = signal / peak
    return signal * np.random.uniform(0.8, 1.0)


# ──────────────────────────────────────────────────────────────
# Dataset generation
# ──────────────────────────────────────────────────────────────

def generate_dataset():
    print("=" * 60)
    print("  SonicRail – Generating Enhanced Synthetic Dataset v2.0")
    print(f"  {SAMPLES_PER_CLASS} samples/class × {len(EVENT_CLASSES)} classes = "
          f"{SAMPLES_PER_CLASS * len(EVENT_CLASSES)} total")
    print("=" * 60)

    total = 0
    for cls in EVENT_CLASSES:
        cls_dir = os.path.join(DATA_RAW_DIR, cls)
        os.makedirs(cls_dir, exist_ok=True)
        gen_fn = GENERATORS[cls]

        for i in range(SAMPLES_PER_CLASS):
            dur_var = DURATION + np.random.uniform(-0.3, 0.3)
            signal = gen_fn(SAMPLE_RATE, dur_var)

            # Apply augmentation to 70% of samples
            if np.random.random() < 0.7:
                signal = augment_signal(signal, SAMPLE_RATE)

            signal = normalize(signal)

            filepath = os.path.join(cls_dir, f"{cls}_{i + 1:03d}.wav")
            sf.write(filepath, signal, SAMPLE_RATE)
            total += 1

        print(f"  ✓ {cls}: {SAMPLES_PER_CLASS} samples")

    print(f"\n  Total: {total} audio samples generated")
    print(f"  Output: {DATA_RAW_DIR}")
    return total


if __name__ == "__main__":
    generate_dataset()
