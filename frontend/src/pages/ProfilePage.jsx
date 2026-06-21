import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const BASE_URL = 'http://localhost:5000';

const ProfilePage = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', location: '', bio: '' });

  const avatarRef = useRef();
  const galleryRef = useRef();

  const fetchProfile = async () => {
    try {
      const res = await API.get('/auth/me');
      setProfile(res.data.user);
      setForm({
        name: res.data.user.name || '',
        phone: res.data.user.phone || '',
        location: res.data.user.location || '',
        bio: res.data.user.bio || '',
      });
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await API.put('/auth/profile', form);
      setProfile(res.data.user);
      // Update auth context
      login(res.data.user, localStorage.getItem('token'));
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const res = await API.post('/profile/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(prev => ({ ...prev, avatar_url: res.data.user.avatar_url }));
      toast.success('Avatar updated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload avatar');
    }
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const fd = new FormData();
    files.forEach(f => fd.append('images', f));
    try {
      const res = await API.post('/profile/gallery', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(prev => ({ ...prev, gallery_urls: res.data.gallery_urls }));
      toast.success(`${files.length} image(s) added to gallery`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload gallery images');
    }
  };

  const handleDeleteGallery = async (index) => {
    if (!confirm('Remove this photo from gallery?')) return;
    try {
      const res = await API.delete(`/profile/gallery/${index}`);
      setProfile(prev => ({ ...prev, gallery_urls: res.data.gallery_urls }));
      toast.success('Photo removed');
    } catch (err) {
      toast.error('Failed to remove photo');
    }
  };

  const avatarSrc = profile?.avatar_url
    ? (profile.avatar_url.startsWith('/uploads') ? `${BASE_URL}${profile.avatar_url}` : profile.avatar_url)
    : null;

  const galleryFull = (profile?.gallery_urls?.length || 0) >= 10;

  if (loading) return <div className="spinner-container" style={{ minHeight: '100vh' }}><div className="spinner" /></div>;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="container">
          <div className="flex-between">
            <div>

              <p className="text-muted mt-2">Manage your personal information and gallery</p>
            </div>
            <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button>
          </div>
        </div>
      </div>

      <div className="container section-sm">
        <div className="profile-layout">

          {/* ── Left: Avatar + Info ──────────────────────────────────────── */}
          <div className="profile-sidebar-card">
            {/* Avatar */}
            <div className="avatar-wrap">
              {avatarSrc
                ? <img src={avatarSrc} alt="Avatar" className="profile-avatar-img" />
                : <div className="profile-avatar-placeholder">{profile?.name?.[0]?.toUpperCase()}</div>
              }
              <button className="avatar-edit-btn" onClick={() => avatarRef.current?.click()} title="Change avatar">✏️</button>
            </div>
            <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />

            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.3rem' }}>{profile?.name}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginTop: 4 }}>{profile?.email}</p>
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
                <span className="badge badge-primary">{profile?.role}</span>
                {profile?.account_type && <span className="badge badge-muted">{profile.account_type}</span>}
                {profile?.is_verified && <span className="badge badge-success">✓ Verified</span>}
              </div>
            </div>

            {profile?.bio && (
              <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, padding: 'var(--space-4)', background: 'rgba(255,255,255,.04)', borderRadius: 'var(--radius-md)', marginTop: 'var(--space-4)' }}>
                {profile.bio}
              </p>
            )}

            {profile?.location && (
              <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>📍 {profile.location}</p>
            )}
            {profile?.phone && (
              <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>📞 {profile.phone}</p>
            )}
          </div>

          {/* ── Right: Edit Form + Gallery ───────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

            {/* Edit Form */}
            <div className="card" style={{ padding: 'var(--space-6)' }}>
              <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-5)' }}>✏️ Edit Information</h3>
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="profile-form-row">
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="input" placeholder="+1 234 567 8900" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input className="input" placeholder="City, Country" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Bio</label>
                  <textarea className="textarea" placeholder="Tell others about yourself..." rows={3} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : '💾 Save Changes'}</button>
                </div>
              </form>
            </div>

            {/* Gallery */}
            <div className="card" style={{ padding: 'var(--space-6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                <h3 style={{ fontWeight: 700 }}>🖼️ Photo Gallery <span style={{ fontSize: '.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>({profile?.gallery_urls?.length || 0}/10)</span></h3>
                {!galleryFull && (
                  <button className="btn btn-outline btn-sm" onClick={() => galleryRef.current?.click()}>+ Add Photos</button>
                )}
              </div>
              <input ref={galleryRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleGalleryUpload} />

              {(!profile?.gallery_urls || profile.gallery_urls.length === 0) ? (
                <div className="empty-state" style={{ minHeight: 120 }}>
                  <div className="empty-icon" style={{ fontSize: '2rem' }}>📷</div>
                  <p>No photos yet. Add up to 10 photos to showcase your work.</p>
                  <button className="btn btn-outline mt-4" onClick={() => galleryRef.current?.click()}>Upload Photos</button>
                </div>
              ) : (
                <div className="gallery-grid">
                  {profile.gallery_urls.map((url, i) => (
                    <div key={i} className="gallery-item">
                      <img
                        src={url.startsWith('/uploads') ? `${BASE_URL}${url}` : url}
                        alt={`Gallery ${i + 1}`}
                      />
                      <button className="gallery-delete" onClick={() => handleDeleteGallery(i)} title="Remove">✕</button>
                    </div>
                  ))}
                  {!galleryFull && (
                    <div className="gallery-add" onClick={() => galleryRef.current?.click()}>
                      <span style={{ fontSize: '1.5rem' }}>+</span>
                      <span style={{ fontSize: '.75rem' }}>Add Photo</span>
                    </div>
                  )}
                </div>
              )}
              {galleryFull && (
                <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>
                  Gallery is full (10/10). Remove photos to add new ones.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .profile-layout { display:grid; grid-template-columns:300px 1fr; gap:var(--space-8); align-items:start; }
        .profile-sidebar-card { background:var(--gradient-card); border:1px solid var(--border); border-radius:var(--radius-xl); padding:var(--space-8); display:flex; flex-direction:column; gap:var(--space-4); align-items:center; position:sticky; top:88px; }
        .avatar-wrap { position:relative; display:inline-block; }
        .profile-avatar-img { width:110px; height:110px; border-radius:50%; object-fit:cover; border:3px solid var(--primary); }
        .profile-avatar-placeholder { width:110px; height:110px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; font-size:2.5rem; font-weight:800; color:#fff; }
        .avatar-edit-btn { position:absolute; bottom:4px; right:4px; background:var(--bg-card); border:1px solid var(--border); border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-size:.85rem; cursor:pointer; transition:var(--transition); }
        .avatar-edit-btn:hover { background:var(--primary); border-color:var(--primary); }
        .gallery-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(100px,1fr)); gap:var(--space-3); }
        .gallery-item { position:relative; aspect-ratio:1; border-radius:var(--radius-md); overflow:hidden; border:1px solid var(--border); }
        .gallery-item img { width:100%; height:100%; object-fit:cover; transition:var(--transition); }
        .gallery-item:hover img { transform:scale(1.05); }
        .gallery-delete { position:absolute; top:4px; right:4px; background:rgba(0,0,0,.7); color:#fff; border:none; border-radius:50%; width:22px; height:22px; font-size:.7rem; cursor:pointer; display:flex; align-items:center; justify-content:center; opacity:0; transition:var(--transition); }
        .gallery-item:hover .gallery-delete { opacity:1; }
        .gallery-add { aspect-ratio:1; border-radius:var(--radius-md); border:2px dashed var(--border); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; cursor:pointer; color:var(--text-muted); transition:var(--transition); }
        .gallery-add:hover { border-color:var(--primary); color:var(--primary-light); }
        .profile-form-row { display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4); }
        @media(max-width:900px){.profile-layout{grid-template-columns:1fr;} .profile-sidebar-card{position:static;}}
        @media(max-width:576px){
          .profile-form-row { grid-template-columns:1fr; gap:var(--space-3); }
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;
