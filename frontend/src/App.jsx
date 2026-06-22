import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { LangProvider } from './context/LangContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

import Home                from './pages/Home';
import Services            from './pages/Services';
import ServiceDetail       from './pages/ServiceDetail';
import Login               from './pages/Login';
import Register            from './pages/Register';
import ForgotPassword      from './pages/ForgotPassword';
import ResetPassword       from './pages/ResetPassword';
import CustomerDashboard   from './pages/CustomerDashboard';
import ProviderDashboard   from './pages/ProviderDashboard';
import ProviderSchedulePage from './pages/ProviderSchedulePage';
import AdminDashboard      from './pages/AdminDashboard';
import ProfilePage         from './pages/ProfilePage';
import ViewProfilePage     from './pages/ViewProfilePage';
import ChatPage            from './pages/ChatPage';

function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>
          <SocketProvider>
            <BrowserRouter>
              <Navbar />

              <Routes>
                {/* Public Routes */}
                <Route path="/"             element={<Home />} />
                <Route path="/services"     element={<Services />} />
                <Route path="/services/:id" element={<ServiceDetail />} />
                <Route path="/login"        element={<Login />} />
                <Route path="/register"     element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password"  element={<ResetPassword />} />

                {/* Customer Routes */}
                <Route path="/dashboard/customer" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <CustomerDashboard />
                  </ProtectedRoute>
                } />

                {/* Provider Routes */}
                <Route path="/dashboard/provider" element={
                  <ProtectedRoute allowedRoles={['provider']}>
                    <ProviderDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/provider/schedule/:serviceId" element={
                  <ProtectedRoute allowedRoles={['provider']}>
                    <ProviderSchedulePage />
                  </ProtectedRoute>
                } />

                {/* Admin Routes */}
                <Route path="/dashboard/admin" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />

                {/* Profile (all authenticated roles) */}
                <Route path="/profile" element={
                  <ProtectedRoute allowedRoles={['customer', 'provider', 'admin']}>
                    <ProfilePage />
                  </ProtectedRoute>
                } />

                {/* View another user's profile (read-only) */}
                <Route path="/profile/:id" element={
                  <ProtectedRoute allowedRoles={['customer', 'provider', 'admin']}>
                    <ViewProfilePage />
                  </ProtectedRoute>
                } />

                {/* Chat — conversation list */}
                <Route path="/chat" element={
                  <ProtectedRoute allowedRoles={['customer', 'provider', 'admin']}>
                    <ChatPage />
                  </ProtectedRoute>
                } />

                {/* Chat — specific conversation */}
                <Route path="/chat/:userId" element={
                  <ProtectedRoute allowedRoles={['customer', 'provider', 'admin']}>
                    <ChatPage />
                  </ProtectedRoute>
                } />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>

              {/* Global Toast Notifications */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3500,
                  style: {
                    background: '#FFFFFF',
                    color: '#0C1A2E',
                    border: '1px solid #BAE6FD',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    boxShadow: '0 8px 32px rgba(14,165,233,0.15)',
                  },
                  success: { iconTheme: { primary: '#0EA5E9', secondary: '#fff' } },
                  error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
                }}
              />
            </BrowserRouter>
          </SocketProvider>
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  );
}

export default App;
