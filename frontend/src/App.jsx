import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ParticipantLogin from './pages/ParticipantLogin';
import ParticipantDashboard from './pages/ParticipantDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import WinnersGallery from './pages/WinnersGallery';
import ClaimPrize from './pages/ClaimPrize';
import './style.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/participant-login" element={<ParticipantLogin />} />
          <Route path="/participant-dashboard" element={<ParticipantDashboard />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/winners-gallery" element={<WinnersGallery />} />
          <Route path="/claim-prize/:photoId" element={<ClaimPrize />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;