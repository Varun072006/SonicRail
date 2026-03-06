"""
SonicRail – Signal Processing
STFT, mel spectrogram, FFT, and signal analysis utilities.
"""
import numpy as np


def compute_mel_spectrogram(signal, sr, n_mels=64, n_fft=2048, hop_length=512):
    """Compute mel spectrogram."""
    import librosa
    mel = librosa.feature.melspectrogram(y=signal, sr=sr, n_mels=n_mels,
                                         n_fft=n_fft, hop_length=hop_length)
    mel_db = librosa.power_to_db(mel, ref=np.max)
    return mel_db


def compute_fft(signal, sr):
    """Compute FFT magnitude spectrum."""
    n = len(signal)
    fft_vals = np.fft.rfft(signal)
    fft_mags = np.abs(fft_vals) / n
    fft_freqs = np.fft.rfftfreq(n, d=1.0 / sr)
    return fft_freqs, fft_mags


def compute_signal_energy(signal):
    """Compute RMS energy of a signal."""
    return float(np.sqrt(np.mean(signal ** 2)))
