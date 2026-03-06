"""
SonicRail – Deep Learning Model (CRNN: CNN + BiLSTM)
Architecture: Mel Spectrogram → CNN → BiLSTM → Dense → Softmax

This module provides a PyTorch-based CRNN classifier.
Falls back gracefully to a stub if PyTorch is not installed.

Usage:
    classifier = CRNNClassifier(n_classes=5)
    classifier.train_model(X_specs, y_labels)
    result = classifier.predict(mel_spec_array)
"""
import os
import numpy as np

CRNN_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "models", "crnn_model.pt"
)

# ──────────────────────────────────────────────────────────────
# Check PyTorch availability
# ──────────────────────────────────────────────────────────────
TORCH_AVAILABLE = False
try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader, TensorDataset
    TORCH_AVAILABLE = True
except ImportError:
    pass


# ──────────────────────────────────────────────────────────────
# PyTorch CRNN Architecture (only defined if PyTorch available)
# ──────────────────────────────────────────────────────────────
if TORCH_AVAILABLE:
    class _CRNNNet(nn.Module):
        """
        CNN + BiLSTM hybrid for acoustic event classification.
        Input: (batch, 1, n_mels=64, time=128)
        """
        def __init__(self, n_classes=5, n_mels=64):
            super().__init__()

            # CNN Feature Extractor
            self.cnn = nn.Sequential(
                # Block 1
                nn.Conv2d(1, 32, kernel_size=(3, 3), padding=1),
                nn.BatchNorm2d(32),
                nn.ReLU(),
                nn.MaxPool2d((2, 2)),
                nn.Dropout2d(0.15),

                # Block 2
                nn.Conv2d(32, 64, kernel_size=(3, 3), padding=1),
                nn.BatchNorm2d(64),
                nn.ReLU(),
                nn.MaxPool2d((2, 2)),
                nn.Dropout2d(0.15),

                # Block 3
                nn.Conv2d(64, 128, kernel_size=(3, 3), padding=1),
                nn.BatchNorm2d(128),
                nn.ReLU(),
                nn.MaxPool2d((2, 2)),
                nn.Dropout2d(0.15),
            )

            # After 3x MaxPool2d(2,2) on (64, 128): → (8, 16)
            cnn_out_freq = n_mels // 8     # = 8
            cnn_out_time = 128 // 8        # = 16
            lstm_input_size = 128 * cnn_out_freq  # 1024

            # BiLSTM Temporal Encoder
            self.lstm = nn.LSTM(
                input_size=lstm_input_size,
                hidden_size=128,
                num_layers=2,
                batch_first=True,
                bidirectional=True,
                dropout=0.3,
            )

            # Classifier head
            self.classifier = nn.Sequential(
                nn.Linear(256, 128),  # 128 * 2 bidirectional
                nn.ReLU(),
                nn.Dropout(0.4),
                nn.Linear(128, n_classes),
            )

        def forward(self, x):
            # x: (B, 1, F, T)
            x = self.cnn(x)               # (B, 128, F', T')
            B, C, F, T = x.shape
            x = x.permute(0, 3, 1, 2)    # (B, T', C, F')
            x = x.reshape(B, T, C * F)   # (B, T', features)
            x, _ = self.lstm(x)           # (B, T', 256)
            x = x[:, -1, :]              # last time step
            return self.classifier(x)     # (B, n_classes)


class CRNNClassifier:
    """
    High-level wrapper for the CNN+BiLSTM classifier.
    Works with numpy arrays; handles PyTorch internals internally.
    """

    def __init__(self, n_classes=5, n_mels=64, device=None):
        self.n_classes = n_classes
        self.n_mels = n_mels
        self.class_names = None
        self.is_trained = False
        self.metrics = {}

        if TORCH_AVAILABLE:
            self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
            self.net = _CRNNNet(n_classes=n_classes, n_mels=n_mels).to(self.device)
        else:
            self.device = "cpu"
            self.net = None

    @property
    def available(self):
        return TORCH_AVAILABLE

    # ──────────────────────────────────────────────────────────
    # Training
    # ──────────────────────────────────────────────────────────

    def train_model(self, X_specs, y_labels, class_names=None,
                    epochs=30, batch_size=32, lr=1e-3):
        """
        Train on mel spectrograms.
        X_specs: np.array of shape (N, n_mels, time)
        y_labels: np.array of integer class indices
        """
        if not TORCH_AVAILABLE:
            print("  [CRNN] PyTorch not available — skipping deep learning training.")
            return {}

        self.class_names = class_names
        X_t = torch.FloatTensor(X_specs).unsqueeze(1).to(self.device)
        y_t = torch.LongTensor(y_labels).to(self.device)

        dataset = TensorDataset(X_t, y_t)
        loader = DataLoader(dataset, batch_size=batch_size, shuffle=True, drop_last=True)

        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(self.net.parameters(), lr=lr, weight_decay=1e-4)
        scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

        print(f"  [CRNN] Training on {self.device} | {epochs} epochs | {len(X_specs)} samples")

        best_acc = 0.0
        for epoch in range(epochs):
            self.net.train()
            total_loss, correct, total = 0.0, 0, 0
            for xb, yb in loader:
                optimizer.zero_grad()
                out = self.net(xb)
                loss = criterion(out, yb)
                loss.backward()
                nn.utils.clip_grad_norm_(self.net.parameters(), 1.0)
                optimizer.step()
                total_loss += loss.item() * len(xb)
                correct += (out.argmax(1) == yb).sum().item()
                total += len(xb)
            scheduler.step()
            acc = correct / total
            if acc > best_acc:
                best_acc = acc
            if (epoch + 1) % 5 == 0:
                print(f"    Epoch {epoch + 1:3d}/{epochs} | loss={total_loss / total:.4f} | acc={acc:.4f}")

        self.is_trained = True
        self.metrics = {"best_train_acc": round(best_acc, 4), "epochs": epochs}
        return self.metrics

    # ──────────────────────────────────────────────────────────
    # Inference
    # ──────────────────────────────────────────────────────────

    def predict(self, mel_spec):
        """
        Predict class for a single mel spectrogram.
        mel_spec: np.array of shape (n_mels, time)
        """
        if not TORCH_AVAILABLE or not self.is_trained:
            return None

        self.net.eval()
        with torch.no_grad():
            x = torch.FloatTensor(mel_spec).unsqueeze(0).unsqueeze(0).to(self.device)
            logits = self.net(x)
            probs = torch.softmax(logits, dim=1).cpu().numpy()[0]
        pred_idx = int(np.argmax(probs))
        return {
            "class_index": pred_idx,
            "class_name": self.class_names[pred_idx] if self.class_names else str(pred_idx),
            "confidence": round(float(probs[pred_idx]), 4),
            "probabilities": {
                (self.class_names[i] if self.class_names else str(i)): round(float(p), 4)
                for i, p in enumerate(probs)
            },
        }

    # ──────────────────────────────────────────────────────────
    # Persistence
    # ──────────────────────────────────────────────────────────

    def save(self, path=None):
        if not TORCH_AVAILABLE or not self.is_trained:
            return
        path = path or CRNN_MODEL_PATH
        os.makedirs(os.path.dirname(path), exist_ok=True)
        torch.save({
            "state_dict": self.net.state_dict(),
            "class_names": self.class_names,
            "n_classes": self.n_classes,
            "n_mels": self.n_mels,
            "metrics": self.metrics,
        }, path)
        print(f"  [CRNN] Model saved to {path}")

    def load(self, path=None):
        if not TORCH_AVAILABLE:
            return False
        path = path or CRNN_MODEL_PATH
        if not os.path.exists(path):
            return False
        data = torch.load(path, map_location=self.device)
        self.n_classes = data["n_classes"]
        self.n_mels = data["n_mels"]
        self.class_names = data["class_names"]
        self.metrics = data.get("metrics", {})
        self.net = _CRNNNet(n_classes=self.n_classes, n_mels=self.n_mels).to(self.device)
        self.net.load_state_dict(data["state_dict"])
        self.net.eval()
        self.is_trained = True
        return True


def is_torch_available():
    return TORCH_AVAILABLE
