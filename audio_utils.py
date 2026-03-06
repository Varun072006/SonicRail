"""
SonicRail – Audio Utilities
Basic audio loading and normalization.
"""
import numpy as np
import os


def load_audio(filepath, sr=22050, duration=3.0):
    """Load audio file using librosa."""
    import librosa
    signal, _ = librosa.load(filepath, sr=sr, duration=duration)
    return signal


def normalize_signal(signal):
    """Normalize signal to [-1, 1] range."""
    peak = np.max(np.abs(signal))
    if peak > 0:
        return signal / peak
    return signal


def get_audio_files(directory, extension=".wav"):
    """Get all audio files in a directory."""
    files = []
    if os.path.exists(directory):
        for f in os.listdir(directory):
            if f.endswith(extension):
                files.append(os.path.join(directory, f))
    return sorted(files)
