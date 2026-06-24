import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff } from 'lucide-react';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      toast.error('Invalid reset link');
      navigate('/forgot-password');
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    if (password !== confirm) return toast.error('Passwords do not match');

    setLoading(true);
    try {
      await API.post('/auth/reset-password', { token, password });
      toast.success('Password reset successfully! Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed — link may have expired');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow" />
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:'var(--space-3)', color:'var(--primary)', opacity:0.85 }}><Lock size={42} strokeWidth={1.5} /></div>
          <h1 className="auth-title" style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--space-2)' }}>Reset Password</h1>
          <p className="auth-subtitle text-muted" style={{ fontSize: '0.875rem' }}>Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
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
                autoFocus
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
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>← Back to Sign In</Link>
          </p>
        </form>
      </div>
      <style>{`
        .auth-page { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:var(--space-6); position:relative; background:var(--bg-base); padding-top:96px; }
        .auth-glow { position:fixed; inset:0; background:radial-gradient(ellipse 60% 50% at 50% 0%,rgba(108,99,255,.12) 0%,transparent 70%); pointer-events:none; }
        .auth-card { position:relative; width:100%; max-width:440px; background:var(--gradient-card); border:1px solid var(--border); border-radius:var(--radius-xl); padding:var(--space-10); box-shadow:var(--shadow-lg),var(--shadow-glow); animation:slideUp .4s ease; }
        @media(max-width:480px){
          .auth-page { padding: var(--space-4) var(--space-3) var(--space-6); padding-top: 80px; }
          .auth-card { padding: var(--space-6) var(--space-4); border-radius: var(--radius-lg); }
          .auth-title { font-size: 1.35rem !important; }
        }
      `}</style>
    </div>
  );
};

export default ResetPassword;
