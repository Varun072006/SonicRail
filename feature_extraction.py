"""
SonicRail – Feature Extraction (Enhanced v2.0)
Extracts 31-dim MFCC feature vector (RF/SVM path) AND Mel spectrograms (CNN path).
"""
import numpy as np


def extract_features(signal, sr, n_mfcc=13):
    """Extract 31-dimensional feature vector for classical ML (RF/SVM)."""
    import librosa

    # MFCC (13 means + 13 stds = 26 features)
    mfccs = librosa.feature.mfcc(y=signal, sr=sr, n_mfcc=n_mfcc)
    mfcc_mean = np.mean(mfccs, axis=1)
    mfcc_std = np.std(mfccs, axis=1)

    # Spectral features (5 features)
    spectral_centroid = np.mean(librosa.feature.spectral_centroid(y=signal, sr=sr))
    spectral_bandwidth = np.mean(librosa.feature.spectral_bandwidth(y=signal, sr=sr))
    spectral_rolloff = np.mean(librosa.feature.spectral_rolloff(y=signal, sr=sr))
    zcr = np.mean(librosa.feature.zero_crossing_rate(y=signal))
    rms = np.mean(librosa.feature.rms(y=signal))

    features = np.concatenate([
        mfcc_mean, mfcc_std,
        [spectral_centroid, spectral_bandwidth, spectral_rolloff, zcr, rms]
    ])
    return features


def extract_mel_spectrogram(signal, sr, n_mels=64, n_fft=2048, hop_length=512, fixed_length=128):
    """
    Extract 2-D Mel spectrogram for CNN/CRNN input.
    Returns array of shape (n_mels, fixed_length) → (64, 128) by default.
    """
    import librosa
    mel = librosa.feature.melspectrogram(
        y=signal, sr=sr, n_mels=n_mels, n_fft=n_fft, hop_length=hop_length
    )
    mel_db = librosa.power_to_db(mel, ref=np.max)
    # Normalize to [-1, 1]
    mel_db = (mel_db - mel_db.mean()) / (mel_db.std() + 1e-8)

    # Pad or trim to fixed time length
    if mel_db.shape[1] < fixed_length:
        mel_db = np.pad(mel_db, ((0, 0), (0, fixed_length - mel_db.shape[1])), mode='constant')
    else:
        mel_db = mel_db[:, :fixed_length]

    return mel_db.astype(np.float32)


def get_feature_names(n_mfcc=13):
    """Get feature names for the 31-dimensional vector."""
    names = []
    for i in range(n_mfcc):
        names.append(f"mfcc_{i + 1}_mean")
    for i in range(n_mfcc):
        names.append(f"mfcc_{i + 1}_std")
    names.extend(["spectral_centroid", "spectral_bandwidth", "spectral_rolloff", "zcr", "rms"])
    return names
