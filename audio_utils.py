"""
SonicRail – Audio Utilities
Basic audio loading and normalization.
"""
import numpy as np
import os


def load_audio(filepath, sr=22050, duration=3.0):
    """Load audio file using soundfile for high speed."""
    import soundfile as sf
    import numpy as np

    signal, file_sr = sf.read(filepath)
    
    # If stereo, mix down to mono
    if len(signal.shape) > 1:
        signal = np.mean(signal, axis=1)

    # Ensure fixed duration for standard lengths
    target_len = int(sr * duration)
    if len(signal) > target_len:
        signal = signal[:target_len]
    elif len(signal) < target_len:
        signal = np.pad(signal, (0, target_len - len(signal)), mode='constant')

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
