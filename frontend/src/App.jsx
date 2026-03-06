import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Home from './pages/Home';
import CommandCenter from './pages/CommandCenter';
import TrackHealth from './pages/TrackHealth';
import IncidentManager from './pages/IncidentManager';
import Analytics from './pages/Analytics';
import AICenter from './pages/AICenter';
import Administration from './pages/Administration';
import GeoRailMap from './pages/GeoRailMap';
import './index.css';

const API = '/api';
const WS_URL = 'http://localhost:5001';

// Global WebSocket instance shared across pages
export let socket = null;

function App() {
  const socketRef = useRef(null);

  useEffect(() => {
    // Connect WebSocket once on app mount
    socketRef.current = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socket = socketRef.current;

    socketRef.current.on('connect', () => {
      console.log('[SonicRail WS] Connected:', socketRef.current.id);
    });
    socketRef.current.on('disconnect', () => {
      console.log('[SonicRail WS] Disconnected');
    });

    return () => {
      socketRef.current?.disconnect();
      socket = null;
    };
  }, []);

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Header />
          <div className="page-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/command" element={<CommandCenter api={API} />} />
              <Route path="/health" element={<TrackHealth api={API} />} />
              <Route path="/map" element={<GeoRailMap api={API} />} />
              <Route path="/incidents" element={<IncidentManager api={API} />} />
              <Route path="/analytics" element={<Analytics api={API} />} />
              <Route path="/ai" element={<AICenter api={API} />} />
              <Route path="/admin" element={<Administration api={API} />} />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
