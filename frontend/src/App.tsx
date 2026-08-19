import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import RoleSelectionPage from './pages/RoleSelectionPage';
import InterviewPage from './pages/InterviewPage';
import AdminCandidateListPage from './pages/admin/AdminCandidateListPage';
import AdminCandidateDetailPage from './pages/admin/AdminCandidateDetailPage';

import { AdminLoginPage } from './pages/auth/AdminLoginPage';
import { TJILoginPage } from './pages/auth/TJILoginPage';
import { NTJILoginPage } from './pages/auth/NTJILoginPage';
import { HRLoginPage } from './pages/auth/HRLoginPage';
import { GDLoginPage } from './pages/auth/GDLoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { CandidateLoginPage } from './pages/auth/CandidateLoginPage';
import MicTestPage from './pages/MicTestPage';
import GestureSystem from './components/GestureSystem';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      {/* Global Interactive 3D Gesture & Shortcut Suite */}
      <GestureSystem enableCursorTrail={true} />

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/signup" element={<RegisterPage />} />
        <Route path="/login" element={<CandidateLoginPage />} />
        <Route path="/login/candidate" element={<CandidateLoginPage />} />
        <Route path="/test-mic" element={<MicTestPage />} />
        <Route path="/mic-test" element={<MicTestPage />} />
        <Route path="/login/tji" element={<TJILoginPage />} />
        <Route path="/tji" element={<TJILoginPage />} />
        <Route path="/login/ntji" element={<NTJILoginPage />} />
        <Route path="/ntji" element={<NTJILoginPage />} />
        <Route path="/login/gd" element={<GDLoginPage />} />
        <Route path="/gd" element={<GDLoginPage />} />
        <Route path="/login/hr" element={<HRLoginPage />} />
        <Route path="/hr" element={<HRLoginPage />} />
        <Route path="/hr-round" element={<HRLoginPage />} />
        <Route path="/login/admin" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminCandidateListPage />} />
        <Route path="/admin/candidates" element={<AdminCandidateListPage />} />
        <Route path="/candidates" element={<AdminCandidateListPage />} />
        <Route path="/admin/candidate/:id" element={<AdminCandidateDetailPage />} />
        <Route path="/admin/candidates/:id" element={<AdminCandidateDetailPage />} />
        <Route path="/roles" element={<RoleSelectionPage />} />
        <Route path="/interview" element={<InterviewPage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
