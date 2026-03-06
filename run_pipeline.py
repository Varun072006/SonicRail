"""
SonicRail – Complete Pipeline Runner
Generates dataset, extracts features, trains model, and starts the dashboard.
"""
import os
import sys

def main():
    print()
    print("╔══════════════════════════════════════════════════════════╗")
    print("║              🚆  SonicRail Pipeline  🚆                ║")
    print("║      National Track Safety Intelligence System          ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print()

    # Step 1: Generate Dataset
    print("[1/3] Generating synthetic DAS dataset...")
    from generate_dataset import generate_dataset
    generate_dataset()
    print()

    # Step 2: Extract Features
    print("[2/3] Extracting acoustic features...")
    from prepare_training_data import prepare_data
    prepare_data()
    print()

    # Step 3: Train Model
    print("[3/3] Training ML classifier...")
    from train import train
    train()
    print()

    print("╔══════════════════════════════════════════════════════════╗")
    print("║              ✅  Pipeline Complete  ✅                  ║")
    print("║                                                        ║")
    print("║  Next steps:                                           ║")
    print("║    1. python api_server.py    (start API on :5001)     ║")
    print("║    2. cd frontend && npm run dev  (React on :3000)     ║")
    print("║    3. Open http://localhost:3000                       ║")
    print("╚══════════════════════════════════════════════════════════╝")


if __name__ == "__main__":
    main()
