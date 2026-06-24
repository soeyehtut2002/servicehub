import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { resolveUploadUrl } from '../config';
import { X, Check } from 'lucide-react';

const AdPopup = () => {
  const [ad, setAd] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const suppressUntil = localStorage.getItem('servicehub_ad_suppress_until');
        if (suppressUntil && new Date().getTime() < parseInt(suppressUntil)) return;

        const res = await API.get('/ads/active');
        if (res.data && res.data.ad) {
          setAd(res.data.ad);
          // Show fast — 200ms after page load
          setTimeout(() => setVisible(true), 200);
        }
      } catch (err) {
        console.error('Failed to load active advertisement:', err.message);
      }
    };
    fetchAd();
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      const suppressTime = new Date().getTime() + 3 * 24 * 60 * 60 * 1000;
      localStorage.setItem('servicehub_ad_suppress_until', suppressTime.toString());
    }
    setVisible(false);
  };

  const handleImageClick = () => {
    if (ad && ad.cta_url) {
      if (ad.cta_url.startsWith('http')) {
        window.open(ad.cta_url, '_blank', 'noopener,noreferrer');
      } else {
        navigate(ad.cta_url);
      }
    }
    handleClose();
  };

  if (!ad || !visible) return null;

  const isClickable = !!(ad.cta_url);

  return (
    <div className="ad-overlay" onClick={handleClose}>
      <div className="ad-modal" onClick={e => e.stopPropagation()}>

        {/* ── Close button (top-right) ─────────────────────── */}
        <button className="ad-close-btn" onClick={handleClose} aria-label="Close advertisement">
          <X size={15} strokeWidth={2.5} />
        </button>

        {/* ── "Sponsored" pill (top-left) ──────────────────── */}
        <div className="ad-sponsored-tag">Sponsored</div>

        {/* ── Banner image — clicking goes to CTA link ─────── */}
        <div
          className={`ad-image-container${isClickable ? ' ad-clickable' : ''}`}
          onClick={isClickable ? handleImageClick : undefined}
          role={isClickable ? 'button' : undefined}
          tabIndex={isClickable ? 0 : undefined}
          onKeyDown={isClickable ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') handleImageClick();
          } : undefined}
          aria-label={isClickable ? `View ${ad.title}` : ad.title}
        >
          <img
            src={resolveUploadUrl(ad.image_url)}
            alt={ad.title}
            className="ad-image"
          />
          {/* Subtle "Tap to view" hint that fades in on hover */}
          {isClickable && (
            <div className="ad-tap-hint">
              <span>Tap to view →</span>
            </div>
          )}
        </div>

        {/* ── "Don't show again" — below the image ─────────── */}
        <div className="ad-bottom-bar">
          <button
            className="ad-dont-show-btn"
            onClick={() => setDontShowAgain(v => !v)}
            aria-pressed={dontShowAgain}
          >
            <div className={`ad-check-box${dontShowAgain ? ' checked' : ''}`}>
              {dontShowAgain && <Check size={9} strokeWidth={3.5} />}
            </div>
            <span className="ad-dont-show-label">Don't show again for 3 days</span>
          </button>
        </div>

      </div>

      <style>{`
        /* ── Overlay ──────────────────────────────────── */
        .ad-overlay {
          position: fixed;
          inset: 0;
          background: rgba(8, 8, 18, 0.78);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: adFadeIn 0.18s ease;
        }

        /* ── Modal card ───────────────────────────────── */
        .ad-modal {
          width: 95%;
          max-width: 440px;
          border-radius: 18px;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
          box-shadow:
            0 24px 64px rgba(0, 0, 0, 0.72),
            0 0 0 1px rgba(255, 255, 255, 0.07);
          animation: adScaleIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* ── Close button ─────────────────────────────── */
        .ad-close-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(8, 8, 18, 0.68);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.18s, transform 0.18s;
          z-index: 20;
        }
        .ad-close-btn:hover {
          background: rgba(239, 68, 68, 0.92);
          border-color: transparent;
          transform: scale(1.1);
        }

        /* ── Sponsored pill ───────────────────────────── */
        .ad-sponsored-tag {
          position: absolute;
          top: 10px;
          left: 12px;
          background: rgba(8, 8, 18, 0.70);
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.58rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.09em;
          padding: 3px 8px;
          border-radius: 6px;
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          z-index: 10;
          pointer-events: none;
        }

        /* ── Banner image ─────────────────────────────── */
        .ad-image-container {
          position: relative;
          width: 100%;
          /* 5:3 ratio works well on mobile */
          padding-bottom: 60%;
          height: 0;
          background: #0a0a14;
          overflow: hidden;
          flex-shrink: 0;
          display: block;
        }
        .ad-image-container.ad-clickable {
          cursor: pointer;
        }
        .ad-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.32s ease;
        }
        .ad-image-container.ad-clickable:hover .ad-image,
        .ad-image-container.ad-clickable:focus-within .ad-image {
          transform: scale(1.04);
        }

        /* Tap-to-view gradient hint */
        .ad-tap-hint {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(8, 8, 18, 0.58) 0%, transparent 55%);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 16px;
          opacity: 0;
          transition: opacity 0.22s ease;
          pointer-events: none;
        }
        .ad-tap-hint span {
          color: #fff;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-shadow: 0 1px 6px rgba(0, 0, 0, 0.8);
        }
        .ad-image-container.ad-clickable:hover .ad-tap-hint,
        .ad-image-container.ad-clickable:focus-within .ad-tap-hint {
          opacity: 1;
        }

        /* ── Bottom bar (don't show again) ────────────── */
        .ad-bottom-bar {
          background: rgba(12, 12, 24, 0.97);
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ad-dont-show-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px 0;
        }
        .ad-dont-show-btn:focus-visible {
          outline: 2px solid #6c63ff;
          border-radius: 4px;
        }

        .ad-check-box {
          width: 15px;
          height: 15px;
          border-radius: 3px;
          border: 1.5px solid rgba(255, 255, 255, 0.28);
          background: rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, border-color 0.15s;
          color: #fff;
          flex-shrink: 0;
        }
        .ad-check-box.checked {
          background: #6c63ff;
          border-color: #6c63ff;
        }

        .ad-dont-show-label {
          font-size: 0.73rem;
          color: rgba(255, 255, 255, 0.52);
          font-weight: 500;
          user-select: none;
        }

        /* ── Animations ───────────────────────────────── */
        @keyframes adFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes adScaleIn {
          from { transform: scale(0.86); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }

        /* ── Responsive ───────────────────────────────── */
        @media (max-width: 400px) {
          .ad-modal { width: 100%; border-radius: 14px; }
          .ad-image-container { padding-bottom: 68%; }
        }
        @media (max-height: 600px) {
          .ad-overlay { align-items: flex-start; overflow-y: auto; padding-top: 8px; }
          .ad-image-container { padding-bottom: 48%; }
        }
      `}</style>
    </div>
  );
};

export default AdPopup;
