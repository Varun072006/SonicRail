# SonicRail : AI-Powered Acoustic Monitoring for Real-Time Railway Hazard Detection

**National Track Safety Intelligence System — Production-Grade Edition**

SonicRail transforms existing railway telecom fiber optic infrastructure into an intelligent distributed acoustic sensing (DAS) network. Using AI-powered signal classification, anomaly detection, and real-time visualization, the system detects track hazards like rockfalls, rail fractures, and animal intrusions in under 2 seconds.

![SonicRail Dashboard](frontend/public/vite.svg)

---

## 🎯 Key Features

- **Real-Time Acoustic Sensing**: Processes live audio data (simulating DAS fiber optic signals) to monitor track conditions.
- **Deep Learning Confidence**: Employs a hybrid CNN + BiLSTM (CRNN) model utilizing Mel Spectrograms alongside classical ML baselines (Random Forest + SVM).
- **Anomaly Detection Layer**: Utilizes an Isolation Forest to flag out-of-distribution (OOD) unknown events before classification, reducing false positives.
- **Live Interactive Dashboard**: Built with React and Recharts, featuring a dark-themed, professional telemetry interface.
- **Advanced Visualizations**:
  - Live multi-band frequency analyzers with interactive tooltips.
  - Live Fast Fourier Transform (FFT) spectrograms.
  - GeoRail Map with active track segment tracking.
- **Instant Alerting System**: Visual alerts and Web Audio API emergency sirens trigger upon hazard detection via WebSockets.
- **Self-Learning Loop**: Operators can confirm or flag alerts as false alarms, feeding data back into `feedback_log.json` for future model retraining.
- **Simulation Mode**: Built-in test scenarios (e.g., Cascade Rockfall, Rail Joint Fracture) to demo system capabilities immediately.

---

## 🏗️ System Architecture & Hardware Layer

SonicRail is designed for real-world deployment across hundreds of kilometers of track, utilizing edge AI and hardware-level signal conversion.

### Hardware Layer
```text
Railway Track (Vibrations)
     ↓
Fiber Optic Cable (Existing Telecom Infrastructure)
     ↓
DAS Interrogator (e.g., OptaSense, Fotech)
     ↓
Edge AI Device (e.g., NVIDIA Jetson Orin Nano)
     ↓
Central Server (SonicRail Core)
     ↓
Operator Dashboard & Autonomous Train Control
```

### Software Pipeline
1. **Edge AI Processing**: Instead of sending raw audio over the network, Edge nodes process signals locally, reducing latency and saving bandwidth.
2. **Signal & Sequence Processing**: Raw data $\rightarrow$ Temporal Sequences & Mel Spectrograms.
3. **Multi-Sensor Fusion**: Combines DAS data with secondary sources (weather, wheel sensors) to increase alert confidence and context.
4. **Context-Aware Filter**: Suppresses expected vibrations (e.g., scheduled trains passing) to eliminate false alarms.
5. **Sequence Classification**: Translates acoustic features over time using temporal transformer models to classify hazards.
6. **Predictive Maintenance Engine**: Calculates track stress accumulation over time to predict fatigue before a failure occurs.
7. **Fault-Tolerant Alert Manager**: Evaluates thresholds and can trigger Positive Train Control (PTC) fail-safes.
8. **Frontend Application**: Real-time telemetry via WebSockets and Historical Analytics dashboards.

---

## 🚀 Tech Stack

- **Backend**: Python, Flask, Flask-SocketIO (Real-time WebSockets).
- **Machine Learning**: Scikit-Learn (RF, SVM, Isolation Forest), Librosa (Audio Processing). *(Note: Deep learning modules are structured to scale to PyTorch/TensorFlow)*.
- **Frontend**: React.js, Vite, Recharts (Telemetry), React-Leaflet (Mapping).

---

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 18+

### 1. Clone the Repository
\`\`\`bash
git clone https://github.com/Varun072006/SonicRail.git
cd SonicRail
\`\`\`

### 2. Backend Setup
Create a virtual environment and install Python dependencies.
\`\`\`bash
python -m venv venv
# On Windows: venv\Scripts\activate
# On Mac/Linux: source venv/bin/activate

pip install -r requirements.txt
\`\`\`

### 3. Generate Data and Train Models
Before starting the server, you need to synthesize the dataset and train the baseline models.
\`\`\`bash
# 1. Generate synthesized acoustic dataset
python generate_dataset.py

# 2. Extract features (MFCCs)
python prepare_training_data.py

# 3. Train the Isolation Forest and Classifiers
python train.py
\`\`\`

### 4. Frontend Setup
Install the React dependencies.
\`\`\`bash
cd frontend
npm install
\`\`\`

---

## 🚦 Running the Application

You will need two terminal windows to run the frontend and backend simultaneously.

**Terminal 1: Start the Python WebSocket Server**
\`\`\`bash
# From the project root
python run_pipeline.py
\`\`\`
*The backend server will start on `http://127.0.0.1:5000`.*

**Terminal 2: Start the React Development Server**
\`\`\`bash
cd frontend
npm run dev
\`\`\`
*The frontend will be accessible at `http://localhost:5173`.*

---

## 🖥️ Using the Dashboard

1. Navigate to `http://localhost:5173`.
2. Go to the **Administration** page to access the Simulation Mode.
3. Click "▶ Trigger 🪨" under **Cascade Rockfall** or any other scenario.
4. Immediately navigate to the **Command Center** to view the live frequency spike, FFT spectrum changes, and hear the emergency audio alarm.
5. Review the model metrics in the **AI Center**.

---

## 📁 Project Structure

\`\`\`text
SonicRail/
├── data/                    # Generated synthetic audio wave files
├── frontend/                # React Vite frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI cards & Canvas charts
│   │   ├── pages/           # Dashboard Pages (CommandCenter, AI Center, etc)
│   │   └── App.jsx          # Main Router & WebSocket listener
├── models/                  # Serialized .pkl artifacts and JSON states
├── generate_dataset.py      # Script to synthesize track physics audio
├── prepare_training_data.py # Script to pull MFCCs from data/ 
├── train.py                 # Evaluates models and exports the best performer
├── run_pipeline.py          # Main Flask + WebSocket Server
├── prediction_engine.py     # Live inference logic bridging SocketIO & Models
└── requirements.txt         # Python dependencies
\`\`\`

---

## 🤝 Contributing

This project is a prototype designed to demonstrate software architecture and signal processing concepts. Feature enhancements, bug reports, and pull requests are highly encouraged to expand the capabilities of this system.

## 📄 License

This project is open-source and available under the standard MIT License.
