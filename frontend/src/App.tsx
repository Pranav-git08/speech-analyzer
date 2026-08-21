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
import { RegisterPage } from './pages/auth/RegisterPage';
import { CandidateLoginPage } from './pages/auth/CandidateLoginPage';
import { AptitudeRoundPage } from './pages/AptitudeRoundPage';
import { AdminGDPage } from './pages/admin/AdminGDPage';
import { GDCandidatePortalPage } from './pages/GDCandidatePortalPage';
import MicTestPage from './pages/MicTestPage';
import GestureSystem from './components/GestureSystem';
import { VirtualEmailInbox } from './components/VirtualEmailInbox';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      {/* Global Interactive 3D Gesture & Shortcut Suite */}
      <GestureSystem enableCursorTrail={true} />
      
      {/* Global Virtual Email Inbox for Demo purposes */}
      <VirtualEmailInbox />

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/signup" element={<RegisterPage />} />
        <Route path="/login" element={<CandidateLoginPage />} />
        <Route path="/login/candidate" element={<CandidateLoginPage />} />
        <Route path="/aptitude" element={<AptitudeRoundPage />} />
        <Route path="/aptitude-round" element={<AptitudeRoundPage />} />
        <Route path="/test-mic" element={<MicTestPage />} />
        <Route path="/mic-test" element={<MicTestPage />} />
        <Route path="/login/tji" element={<TJILoginPage />} />
        <Route path="/tji" element={<TJILoginPage />} />
        <Route path="/login/ntji" element={<NTJILoginPage />} />
        <Route path="/ntji" element={<NTJILoginPage />} />
        <Route path="/login/gd" element={<GDCandidatePortalPage />} />
        <Route path="/gd" element={<GDCandidatePortalPage />} />
        <Route path="/gd-cohort" element={<GDCandidatePortalPage />} />
        <Route path="/login/hr" element={<HRLoginPage />} />
        <Route path="/hr" element={<HRLoginPage />} />
        <Route path="/hr-round" element={<HRLoginPage />} />
        <Route path="/login/admin" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminCandidateListPage />} />
        <Route path="/admin/gd" element={<AdminGDPage />} />
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
