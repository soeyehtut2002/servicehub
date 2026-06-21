import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, Key } from 'lucide-react';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Please enter your email');
    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
      toast.success('OTP generated! Check the backend console.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return toast.error('Please enter the 6-digit OTP code');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    if (password !== confirm) return toast.error('Passwords do not match');

    setLoading(true);
    try {
      await API.post('/auth/reset-password', {
        email: email.trim(),
        otp: otp.trim(),
        password
      });
      toast.success('Password reset successfully! Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed — invalid or expired OTP code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: 'var(--space-6)' }}>
        <div className="card" style={{ padding: 'var(--space-8)' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-3)', color: 'var(--primary)', opacity: 0.85 }}>
              {sent ? <Lock size={42} strokeWidth={1.5} /> : <Key size={42} strokeWidth={1.5} />}
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
              {sent ? 'Reset Password' : 'Forgot Password'}
            </h1>
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>
              {sent ? 'Enter the OTP code and your new password below' : 'Enter your email and we\'ll send an OTP code'}
            </p>
          </div>

          {sent ? (
            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div className="form-group">
                <label className="form-label">6-Digit OTP Code</label>
                <input
                  type="text"
                  className="input"
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="input"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: 44 }}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}>
                    {showPass ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input"
                  placeholder="Repeat your password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
              </div>

              {password && confirm && password !== confirm && (
                <div className="alert alert-error" style={{ fontSize: '0.8rem', padding: 'var(--space-3)' }}>
                  Passwords do not match
                </div>
              )}

              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? 'Resetting...' : '🔑 Reset Password'}
              </button>

              <div className="alert alert-info" style={{ fontSize: '0.8rem', marginTop: 'var(--space-2)' }}>
                💡 Look in your backend terminal for the 6-digit OTP code, then enter it above.
              </div>

              <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                <button type="button" onClick={() => setSent(false)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                  ← Back to Email Input
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? 'Sending...' : '📧 Send OTP Code'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Remember your password?{' '}
                <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign In</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
