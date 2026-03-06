"""
SonicRail – Model Training (Enhanced v2.0)
Trains RF/SVM classifier + Anomaly Detector; optionally trains CRNN if PyTorch available.

Usage:
    python train.py           # Classical RF/SVM + Anomaly Detector
    python train.py --deep    # Also train CRNN (requires PyTorch)
"""
import os
import sys
import json
import numpy as np
import joblib
from datetime import datetime
from sklearn.model_selection import train_test_split
from config import DATA_PROCESSED_DIR, MODELS_DIR, EVENT_LABELS, EVENT_CLASSES
from model import SonicRailClassifier
from anomaly_detector import AnomalyDetector


def train(train_deep=False):
    print("=" * 60)
    print("  SonicRail – Training ML Pipeline v2.0")
    print("=" * 60)

    # ──── Load Features ────
    features_path = os.path.join(DATA_PROCESSED_DIR, "features.npz")
    data = np.load(features_path, allow_pickle=True)
    X, y = data["X"], data["y"]
    class_names = list(data["class_names"]) if "class_names" in data else EVENT_CLASSES
    class_labels = [EVENT_LABELS.get(c, c) for c in class_names]

    print(f"  Dataset: {X.shape[0]} samples, {X.shape[1]} features")
    print(f"  Classes: {', '.join(class_names)}")

    # ──── Clean Data ────
    mask = ~(np.isnan(X).any(axis=1) | np.isinf(X).any(axis=1))
    X, y = X[mask], y[mask]

    # ──── Train/Test Split ────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"  Train: {len(X_train)}, Test: {len(X_test)}")

    # ──────────────────────────────────────────────────────────
    # 1. Classical Classifier (RF + SVM)
    # ──────────────────────────────────────────────────────────
    print("\n  [1/3] Training Classical Classifier (RF + SVM)...")
    classifier = SonicRailClassifier()
    cv_results = classifier.train(X_train, y_train, class_names)
    print(f"    RF CV:   {cv_results['rf_cv']['mean']:.4f} ± {cv_results['rf_cv']['std']:.4f}")
    print(f"    SVM CV:  {cv_results['svm_cv']['mean']:.4f} ± {cv_results['svm_cv']['std']:.4f}")
    print(f"    Selected: {cv_results['selected']}")

    eval_results = classifier.evaluate(X_test, y_test, class_labels)
    print(f"    Test Accuracy: {eval_results['accuracy']:.4f}")

    model_path = os.path.join(MODELS_DIR, "sonic_rail_model.pkl")
    joblib.dump(classifier, model_path)
    print(f"    ✓ Model saved: {model_path}")

    # ──────────────────────────────────────────────────────────
    # 2. Anomaly Detector (Isolation Forest)
    # ──────────────────────────────────────────────────────────
    print("\n  [2/3] Training Anomaly Detector (Isolation Forest)...")
    # Train on "normal" classes: normal_ambient + train_movement
    normal_class_indices = [
        i for i, cn in enumerate(class_names)
        if cn in ("normal_ambient", "train_movement")
    ]
    if normal_class_indices:
        normal_mask_train = np.isin(y_train, normal_class_indices)
        X_normal = X_train[normal_mask_train]
    else:
        X_normal = X_train  # fallback: train on all

    anomaly_detector = AnomalyDetector()
    anomaly_detector.fit(X_normal)
    anomaly_detector.save()
    print(f"    ✓ Anomaly Detector saved")

    # ──────────────────────────────────────────────────────────
    # 3. Optional: CRNN Deep Learning Model
    # ──────────────────────────────────────────────────────────
    crnn_metrics = {}
    if train_deep:
        print("\n  [3/3] Training CRNN Deep Learning Model...")
        from deep_model import CRNNClassifier, is_torch_available
        if not is_torch_available():
            print("    ⚠ PyTorch not installed — skipping CRNN training.")
            print("    Install with: pip install torch torchvision torchaudio")
        else:
            # Load mel spectrogram features
            mel_path = os.path.join(DATA_PROCESSED_DIR, "mel_features.npz")
            if not os.path.exists(mel_path):
                print("    ⚠ Mel spectrogram features not found. Run prepare_training_data.py first.")
            else:
                mel_data = np.load(mel_path, allow_pickle=True)
                X_mel, y_mel = mel_data["X"], mel_data["y"]
                X_mel_train, X_mel_test, y_mel_train, y_mel_test = train_test_split(
                    X_mel, y_mel, test_size=0.2, random_state=42, stratify=y_mel
                )
                crnn = CRNNClassifier(n_classes=len(class_names))
                crnn_metrics = crnn.train_model(X_mel_train, y_mel_train, class_names=class_names, epochs=30)
                crnn.save()
                print(f"    ✓ CRNN model saved | best_acc={crnn_metrics.get('best_train_acc', '?')}")
    else:
        print("\n  [3/3] CRNN training skipped (pass --deep to enable)")

    # ──────────────────────────────────────────────────────────
    # Save Metrics
    # ──────────────────────────────────────────────────────────
    selected_key = "rf" if "Random" in cv_results["selected"] else "svm"
    metrics = {
        "model_name": cv_results["selected"],
        "accuracy": eval_results["accuracy"],
        "cv_mean": cv_results[f"{selected_key}_cv"]["mean"],
        "cv_std": cv_results[f"{selected_key}_cv"]["std"],
        "n_features": X.shape[1],
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "training_date": datetime.now().isoformat(),
        "confusion_matrix": eval_results["confusion_matrix"],
        "classification_report": eval_results["classification_report"],
        "feature_importance": eval_results["feature_importance"],
        "roc_data": eval_results["roc_data"],
        # New v2.0 fields
        "rf_cv": cv_results["rf_cv"],
        "svm_cv": cv_results["svm_cv"],
        "anomaly_detector": {
            "model": "Isolation Forest",
            "trained_on": int(X_normal.shape[0]),
            "threshold": anomaly_detector.threshold,
        },
        "crnn": crnn_metrics if crnn_metrics else {"status": "not_trained"},
        "pipeline_version": "2.0",
    }

    metrics_path = os.path.join(MODELS_DIR, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"\n  ✓ Metrics saved: {metrics_path}")

    print("=" * 60)
    print(f"  Training complete! Accuracy: {eval_results['accuracy']:.4f}")
    print("=" * 60)

    return classifier


if __name__ == "__main__":
    deep = "--deep" in sys.argv
    train(train_deep=deep)
