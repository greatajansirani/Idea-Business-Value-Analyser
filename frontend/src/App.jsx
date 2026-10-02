import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './context/authStore.js'
import LoginPage      from './pages/LoginPage.jsx'
import RegisterPage   from './pages/RegisterPage.jsx'
import DashboardPage  from './pages/DashboardPage.jsx'
import NewIdeaPage    from './pages/NewIdeaPage.jsx'
import IdeaDetailPage from './pages/IdeaDetailPage.jsx'
import ROIPage        from './pages/ROIPage.jsx'
import ScenarioPage   from './pages/ScenarioPage.jsx'
import VisualsPage    from './pages/VisualsPage.jsx'
import ReportsPage    from './pages/ReportsPage.jsx'
import ChatPage       from './pages/ChatPage.jsx'
import Layout         from './components/layout/Layout.jsx'

const Private = ({children}) => useAuthStore(s=>s.token) ? children : <Navigate to="/login" replace />
const Public  = ({children}) => !useAuthStore(s=>s.token) ? children : <Navigate to="/dashboard" replace />

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ style:{ fontFamily:'DM Sans,sans-serif', fontSize:14 }, success:{ iconTheme:{ primary:'#4F46E5', secondary:'#fff' } } }} />
      <Routes>
        <Route path="/"         element={<Navigate to="/dashboard" replace />} />
        <Route path="/login"    element={<Public><LoginPage /></Public>} />
        <Route path="/register" element={<Public><RegisterPage /></Public>} />
        <Route path="/"         element={<Private><Layout /></Private>}>
          <Route path="dashboard"           element={<DashboardPage />} />
          <Route path="ideas/new"           element={<NewIdeaPage />} />
          <Route path="ideas/:id"           element={<IdeaDetailPage />} />
          <Route path="ideas/:id/roi"       element={<ROIPage />} />
          <Route path="ideas/:id/scenarios" element={<ScenarioPage />} />
          <Route path="ideas/:id/visuals"   element={<VisualsPage />} />
          <Route path="ideas/:id/reports"   element={<ReportsPage />} />
          <Route path="ideas/:id/chat"      element={<ChatPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
