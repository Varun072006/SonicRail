"""
SonicRail – ML Model
Dual-model classifier (Random Forest + SVM) with auto-selection.
"""
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import cross_val_score


class SonicRailClassifier:
    def __init__(self):
        self.scaler = StandardScaler()
        self.rf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
        self.svm = SVC(kernel='rbf', probability=True, random_state=42)
        self.best_model = None
        self.best_name = None
        self.class_names = None

    def train(self, X_train, y_train, class_names=None):
        self.class_names = class_names
        X_scaled = self.scaler.fit_transform(X_train)

        # Train both
        self.rf.fit(X_scaled, y_train)
        self.svm.fit(X_scaled, y_train)

        # Cross-validate
        rf_scores = cross_val_score(self.rf, X_scaled, y_train, cv=5)
        svm_scores = cross_val_score(self.svm, X_scaled, y_train, cv=5)

        # Auto-select best
        if rf_scores.mean() >= svm_scores.mean():
            self.best_model = self.rf
            self.best_name = "Random Forest"
        else:
            self.best_model = self.svm
            self.best_name = "SVM (RBF Kernel)"

        return {
            "rf_cv": {"mean": rf_scores.mean(), "std": rf_scores.std()},
            "svm_cv": {"mean": svm_scores.mean(), "std": svm_scores.std()},
            "selected": self.best_name,
        }

    def evaluate(self, X_test, y_test, class_labels=None):
        X_scaled = self.scaler.transform(X_test)
        y_pred = self.best_model.predict(X_scaled)

        acc = accuracy_score(y_test, y_pred)
        cm = confusion_matrix(y_test, y_pred)

        report = classification_report(y_test, y_pred,
            target_names=class_labels, output_dict=True, zero_division=0)

        # Feature importance (RF only)
        fi = None
        if hasattr(self.best_model, 'feature_importances_'):
            fi = self.best_model.feature_importances_.tolist()

        # ROC data
        roc_data = {}
        try:
            from sklearn.preprocessing import label_binarize
            from sklearn.metrics import roc_curve, auc
            y_bin = label_binarize(y_test, classes=range(len(class_labels)))
            y_score = self.best_model.predict_proba(X_scaled)
            for i, label in enumerate(class_labels):
                fpr, tpr, _ = roc_curve(y_bin[:, i], y_score[:, i])
                roc_data[str(i)] = {
                    "fpr": fpr.tolist(),
                    "tpr": tpr.tolist(),
                    "auc": float(auc(fpr, tpr)),
                }
        except Exception:
            pass

        return {
            "accuracy": acc,
            "confusion_matrix": cm.tolist(),
            "classification_report": report,
            "feature_importance": fi,
            "roc_data": roc_data,
        }

    def predict(self, features):
        X_scaled = self.scaler.transform(features.reshape(1, -1))
        pred_idx = self.best_model.predict(X_scaled)[0]
        proba = self.best_model.predict_proba(X_scaled)[0]
        return {
            "class_index": int(pred_idx),
            "class_name": self.class_names[pred_idx] if self.class_names else str(pred_idx),
            "confidence": float(proba[pred_idx]),
            "probabilities": {
                self.class_names[i] if self.class_names else str(i): float(p)
                for i, p in enumerate(proba)
            },
        }
