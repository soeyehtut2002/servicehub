import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { resolveUploadUrl } from '../config';
import { X, Megaphone, Check } from 'lucide-react';

const AdPopup = () => {
  const [ad, setAd] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAd = async () => {
      try {
        // Check local storage for suppression
        const suppressUntil = localStorage.getItem('servicehub_ad_suppress_until');
        if (suppressUntil && new Date().getTime() < parseInt(suppressUntil)) {
          return; // Suppressed
        }

        const res = await API.get('/ads/active');
        if (res.data && res.data.ad) {
          setAd(res.data.ad);
          // Show popup after a small delay (800ms) for premium feel
          setTimeout(() => setVisible(true), 800);
        }
      } catch (err) {
        console.error('Failed to load active advertisement:', err.message);
      }
    };

    fetchAd();
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      // Set suppression in local storage for 3 days (259200000 ms)
      const suppressTime = new Date().getTime() + 3 * 24 * 60 * 60 * 1000;
      localStorage.setItem('servicehub_ad_suppress_until', suppressTime.toString());
    }
    setVisible(false);
  };

  const handleCtaClick = () => {
    handleClose();
    if (ad && ad.cta_url) {
      if (ad.cta_url.startsWith('http')) {
        window.open(ad.cta_url, '_blank', 'noopener,noreferrer');
      } else {
        navigate(ad.cta_url);
      }
    }
  };

  if (!ad || !visible) return null;

  return (
    <div className="ad-overlay" onClick={handleClose}>
      <div className="ad-modal" onClick={e => e.stopPropagation()}>
        {/* Close Button */}
        <button className="ad-close-btn" onClick={handleClose} aria-label="Close ad">
          <X size={16} strokeWidth={2.5} />
        </button>

        {/* Ad Image */}
        <div className="ad-image-container">
          <img src={resolveUploadUrl(ad.image_url)} alt={ad.title} className="ad-image" />
          <div className="ad-category-badge">Sponsored</div>
        </div>

        {/* Ad Content */}
        <div className="ad-body">
          {/* Header row with logo, title */}
          <div className="ad-header-row">
            {ad.logo_url ? (
              <img src={resolveUploadUrl(ad.logo_url)} alt="" className="ad-logo" />
            ) : (
              <div className="ad-logo-placeholder">
                <Megaphone size={16} />
              </div>
            )}
            <div className="ad-header-text">
              <h3 className="ad-title">{ad.title}</h3>
              {ad.description && <p className="ad-desc">{ad.description}</p>}
            </div>
          </div>

          {/* CTA and Don't Show Option */}
          <div className="ad-footer">
            <button className="ad-checkbox-container" onClick={() => setDontShowAgain(v => !v)}>
              <div className={`ad-checkbox ${dontShowAgain ? 'checked' : ''}`}>
                {dontShowAgain && <Check size={10} strokeWidth={3} />}
              </div>
              <span className="ad-checkbox-label">Don't show again for 3 days</span>
            </button>

            <button className="btn btn-primary ad-cta-btn" onClick={handleCtaClick}>
              {ad.cta_text || 'Learn More'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .ad-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 10, 20, 0.65);
          backdrop-filter: blur(5px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
          animation: adFadeIn 0.25s ease;
        }

        .ad-modal {
          width: 90%;
          max-width: 380px;
          background: var(--gradient-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg), var(--shadow-glow);
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
          animation: adScaleIn 0.38s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .ad-close-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(10, 10, 20, 0.55);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition);
          z-index: 10;
        }
        .ad-close-btn:hover {
          background: rgba(239, 68, 68, 0.9);
          border-color: transparent;
        }

        .ad-image-container {
          width: 100%;
          height: 140px;
          position: relative;
          background: #000;
        }
        .ad-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .ad-category-badge {
          position: absolute;
          bottom: 8px;
          left: 12px;
          background: rgba(10, 10, 20, 0.7);
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .ad-body {
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .ad-header-row {
          display: flex;
          gap: var(--space-3);
          align-items: flex-start;
        }
        .ad-logo {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid var(--border);
          flex-shrink: 0;
        }
        .ad-logo-placeholder {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--primary-glow);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid var(--border);
          flex-shrink: 0;
        }

        .ad-header-text {
          flex: 1;
          min-width: 0;
        }
        .ad-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ad-desc {
          font-size: 0.78rem;
          color: var(--text-secondary);
          line-height: 1.4;
          margin-top: 2px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .ad-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-2);
        }

        .ad-checkbox-container {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          text-align: left;
        }
        .ad-checkbox {
          width: 14px;
          height: 14px;
          border-radius: 3px;
          border: 1.5px solid var(--border);
          background: var(--bg-input);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition);
          color: #fff;
        }
        .ad-checkbox.checked {
          background: var(--primary);
          border-color: var(--primary);
        }
        .ad-checkbox-label {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .ad-cta-btn {
          padding: 7px 14px !important;
          font-size: 0.78rem !important;
          border-radius: var(--radius-md) !important;
          flex-shrink: 0;
          box-shadow: 0 3px 8px var(--primary-glow) !important;
        }

        @keyframes adFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes adScaleIn {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        /* Responsive height boundary for small mobiles */
        @media(max-height: 600px) {
          .ad-overlay { align-items: flex-start; overflow-y: auto; padding-top: var(--space-10); }
          .ad-image-container { height: 100px; }
          .ad-body { padding: var(--space-3); gap: var(--space-3); }
        }
      `}</style>
    </div>
  );
};

export default AdPopup;
