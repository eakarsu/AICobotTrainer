import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FeaturePage from './pages/FeaturePage';
import AIAdvancedPage from './pages/AIAdvancedPage';
import Notifications from './pages/Notifications';
import Webhooks from './pages/Webhooks';
import CustomViewsPage from './pages/CustomViewsPage';
import Layout from './components/Layout';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/insights/timeline" element={<TimelineView />} />
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="/feature/:featureKey" element={<FeaturePage />} />
          <Route path="/ai-advanced" element={<AIAdvancedPage />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/webhooks" element={<Webhooks />} />
          <Route path="/custom-views" element={<CustomViewsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
