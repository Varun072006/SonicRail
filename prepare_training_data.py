"""
SonicRail – Prepare Training Data
Process audio files and extract features into a training dataset.
"""
import os
import numpy as np
from config import DATA_RAW_DIR, DATA_PROCESSED_DIR, EVENT_CLASSES, SAMPLE_RATE
from feature_extraction import extract_features, get_feature_names
from audio_utils import load_audio, normalize_signal


def prepare_data():
    print("=" * 60)
    print("  SonicRail – Preparing Training Data")
    print("=" * 60)

    X, y = [], []
    class_names = EVENT_CLASSES

    for class_idx, cls in enumerate(class_names):
        cls_dir = os.path.join(DATA_RAW_DIR, cls)
        if not os.path.exists(cls_dir):
            print(f"  ⚠ Skipping {cls}: directory not found")
            continue

        files = [f for f in os.listdir(cls_dir) if f.endswith(".wav")]
        for f in files:
            filepath = os.path.join(cls_dir, f)
            try:
                signal = load_audio(filepath, sr=SAMPLE_RATE)
                signal = normalize_signal(signal)
                features = extract_features(signal, SAMPLE_RATE)

                if not np.any(np.isnan(features)) and not np.any(np.isinf(features)):
                    X.append(features)
                    y.append(class_idx)
            except Exception as e:
                print(f"  ⚠ Error processing {f}: {e}")

        print(f"  ✓ {cls}: {sum(1 for yi in y if yi == class_idx)} samples")

    X = np.array(X)
    y = np.array(y)
    feature_names = get_feature_names()

    # Save
    output_path = os.path.join(DATA_PROCESSED_DIR, "features.npz")
    np.savez(output_path, X=X, y=y, class_names=class_names, feature_names=feature_names)

    print(f"\n  Dataset: {X.shape[0]} samples, {X.shape[1]} features")
    print(f"  Saved: {output_path}")
    return X, y


if __name__ == "__main__":
    prepare_data()
