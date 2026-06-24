import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { Building2, Briefcase } from 'lucide-react';

const ACCOUNT_TYPES = [
  {
    value: 'freelancer',
    Icon: Briefcase,
    label: 'Freelancer',
    desc: 'Solo provider — one booking per time slot, no double-booking',
  },
  {
    value: 'business',
    Icon: Building2,
    label: 'Business',
    desc: 'Company or team — flexible scheduling with parallel bookings',
  },
];

const Register = () => {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'customer',
    phone: '', location: '', account_type: '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    if (form.role === 'provider' && !form.account_type) {
      return setError('Please select an account type for your provider account');
    }

    setLoading(true);
    try {
      const payload = { ...form };
      if (form.role !== 'provider') delete payload.account_type;
      const res = await API.post('/auth/register', payload);
      login(res.data.user, res.data.token);
      toast.success(`Welcome, ${res.data.user.name}!`);
      const routes = { customer: '/', provider: '/dashboard/provider', admin: '/dashboard/admin' };
      navigate(routes[res.data.user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow" />
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" className="auth-logo">ServiceHub</Link>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join thousands of users on ServiceHub</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input name="name" className="input" placeholder="John Doe" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input name="email" type="email" className="input" placeholder="john@example.com" value={form.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input name="password" type="password" className="input" placeholder="Min. 6 characters" value={form.password} onChange={handleChange} required />
          </div>

          {/* Role selector */}
          <div className="form-group">
            <label className="form-label">I am a...</label>
            <div className="role-selector">
              {['customer', 'provider'].map((role) => (
                <button
                  key={role} type="button"
                  className={`role-btn ${form.role === role ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, role, account_type: '' })}
                >
                  {role === 'customer' ? 'Customer' : 'Service Provider'}
                </button>
              ))}
            </div>
          </div>

          {/* Account type selector — only for providers */}
          {form.role === 'provider' && (
            <div className="form-group">
              <label className="form-label">Account Type <span style={{color:'var(--error)'}}>*</span></label>
              <div className="account-type-grid">
                {ACCOUNT_TYPES.map((at) => (
                  <button
                    key={at.value} type="button"
                    className={`account-type-btn ${form.account_type === at.value ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, account_type: at.value })}
                  >
                    <span className="at-icon"><at.Icon size={22} strokeWidth={1.5} /></span>
                    <span className="at-label">{at.label}</span>
                    <span className="at-desc">{at.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone (optional)</label>
              <input name="phone" className="input" placeholder="+1 234 567 8900" value={form.phone} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Location (optional)</label>
              <input name="location" className="input" placeholder="New York, NY" value={form.location} onChange={handleChange} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        <p className="auth-footer">Already have an account? <Link to="/login" className="text-primary-color">Sign in</Link></p>
      </div>
      <style>{`
        .auth-page { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:var(--space-6); position:relative; background:var(--bg-base); padding-top:96px; }
        .auth-glow { position:fixed; inset:0; background:radial-gradient(ellipse 60% 50% at 50% 0%,rgba(108,99,255,.12) 0%,transparent 70%); pointer-events:none; }
        .auth-card { position:relative; width:100%; max-width:520px; background:var(--gradient-card); border:1px solid var(--border); border-radius:var(--radius-xl); padding:var(--space-10); box-shadow:var(--shadow-lg),var(--shadow-glow); animation:slideUp .4s ease; }
        .auth-header { text-align:center; margin-bottom:var(--space-8); }
        .auth-logo { font-size:1.4rem; font-weight:900; color:var(--text-primary); display:inline-block; margin-bottom:var(--space-4); }
        .auth-title { font-size:1.8rem; font-weight:800; margin-bottom:var(--space-2); }
        .auth-subtitle { color:var(--text-secondary); font-size:.9rem; }
        .auth-form { display:flex; flex-direction:column; gap:var(--space-4); margin-top:var(--space-6); }
        .role-selector { display:grid; grid-template-columns:1fr 1fr; gap:var(--space-3); }
        .role-btn { padding:12px; border-radius:var(--radius-md); font-size:.875rem; font-weight:600; background:var(--bg-input); border:1px solid var(--border); color:var(--text-secondary); cursor:pointer; transition:var(--transition); }
        .role-btn.active { background:rgba(108,99,255,.2); border-color:var(--primary); color:var(--primary-light); }
        .role-btn:hover:not(.active) { border-color:var(--border-hover); color:var(--text-primary); }
        .account-type-grid { display:flex; flex-direction:column; gap:var(--space-2); }
        .account-type-btn { display:grid; grid-template-columns:2rem 1fr; grid-template-rows:auto auto; column-gap:var(--space-3); padding:var(--space-4); border-radius:var(--radius-md); background:var(--bg-input); border:1px solid var(--border); color:var(--text-secondary); cursor:pointer; transition:var(--transition); text-align:left; }
        .account-type-btn.active { background:rgba(108,99,255,.15); border-color:var(--primary); color:var(--text-primary); }
        .account-type-btn:hover:not(.active) { border-color:var(--border-hover); color:var(--text-primary); }
        .at-icon { font-size:1.4rem; grid-row:1/3; display:flex; align-items:center; }
        .at-label { font-weight:700; font-size:.9rem; }
        .at-desc { font-size:.75rem; color:var(--text-muted); margin-top:2px; }
        .form-row { display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4); }
        .auth-footer { text-align:center; margin-top:var(--space-6); font-size:.875rem; color:var(--text-secondary); }
        @media(max-width:520px){
          .auth-page { padding: var(--space-4) var(--space-3) var(--space-6); padding-top: 80px; }
          .auth-card { padding: var(--space-6) var(--space-4); border-radius: var(--radius-lg); }
          .auth-title { font-size: 1.5rem; }
          .auth-header { margin-bottom: var(--space-5); }
          .form-row { grid-template-columns: 1fr; gap: var(--space-4); }
        }
        @media(max-width:400px){
          .role-selector { grid-template-columns: 1fr; gap: var(--space-2); }
        }
      `}</style>
    </div>
  );
};

export default Register;
