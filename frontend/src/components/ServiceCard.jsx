import { Link } from 'react-router-dom';
import StarRating from './StarRating';
import { getCurrencyMeta } from '../utils/currency';
import { MapPin, ShieldCheck } from 'lucide-react';
import { BASE_URL } from '../config';

const ServiceCard = ({ service }) => {
  const imageUrl = service.image_url
    ? service.image_url.startsWith('/uploads')
      ? `${BASE_URL}${service.image_url}`
      : service.image_url
    : null;  // null = show gradient placeholder

  const truncate = (text, len = 90) =>
    text?.length > len ? text.slice(0, len) + '…' : text;

  const nativeCurrency = service.currency || 'USD';
  const nativePrice    = parseFloat(service.price) || 0;
  const nativeMeta     = getCurrencyMeta(nativeCurrency);
  const digits         = nativeCurrency === 'USD' ? 2 : 0;

  return (
    <Link to={`/services/${service.id}`} className="service-card">
      <div className="service-card-image">
        {imageUrl ? (
          <img src={imageUrl} alt={service.title} loading="lazy" />
        ) : (
          <div style={{
            width:'100%', height:'100%',
            background:`linear-gradient(135deg,hsl(${(service.id*53)%360},55%,65%),hsl(${(service.id*53+120)%360},45%,55%))`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem'
          }}>🛠️</div>
        )}
        <div className="service-card-category">{service.category}</div>
        {service.provider_verified && (
          <div className="service-card-verified">
            <ShieldCheck size={11} strokeWidth={2.5} style={{ display: 'inline', marginRight: 3 }} />
            Verified
          </div>
        )}
      </div>
      <div className="service-card-body">
        <h3 className="service-card-title">{service.title}</h3>
        <p className="service-card-desc">{truncate(service.description)}</p>
        <div className="service-card-meta">
          <span className="service-card-location">
            <MapPin size={12} strokeWidth={2} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
            {service.location}
          </span>
          <span className="service-card-provider">by {service.provider_name}</span>
        </div>
        <div className="service-card-footer">
          <div className="service-card-rating">
            <StarRating rating={parseFloat(service.avg_rating || 0)} readonly size="sm" />
            <span className="rating-value">{parseFloat(service.avg_rating || 0).toFixed(1)}</span>
            <span className="rating-count">({service.review_count || 0})</span>
          </div>
          <div className="service-card-price-block">
            <div className="service-card-price">
              <span className="currency" key={nativeCurrency}>{nativeMeta.symbol}</span>
              {nativePrice.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 })}
              <span className="sc-cur-code">{nativeCurrency}</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .service-card {
          display: flex;
          flex-direction: column;
          background: var(--gradient-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          transition: var(--transition);
          box-shadow: var(--shadow-card);
          cursor: pointer;
        }
        .service-card:hover {
          border-color: var(--border-hover);
          transform: translateY(-6px);
          box-shadow: var(--shadow-lg), var(--shadow-glow);
        }
        .service-card-image {
          position: relative;
          height: 200px;
          overflow: hidden;
          background: var(--bg-input);
        }
        .service-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .service-card:hover .service-card-image img { transform: scale(1.08); }
        .service-card-category {
          position: absolute; top: 12px; left: 12px;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(8px);
          color: var(--primary-dark);
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 0.72rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.05em;
          border: 1px solid rgba(14,165,233,0.25);
        }
        .service-card-verified {
          position: absolute; top: 12px; right: 12px;
          background: var(--success);
          color: #fff; padding: 3px 8px;
          border-radius: var(--radius-full);
          font-size: 0.7rem; font-weight: 700;
          display: flex; align-items: center;
        }
        .service-card-body {
          padding: var(--space-4) var(--space-5);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          flex: 1;
        }
        .service-card-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .service-card-desc {
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.5;
          flex: 1;
        }
        .service-card-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .service-card-location, .service-card-provider {
          font-size: 0.78rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
        }
        .service-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: var(--space-3);
          border-top: 1px solid var(--border);
          margin-top: var(--space-2);
        }
        .service-card-rating {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .rating-value { font-size: 0.85rem; font-weight: 700; color: var(--text-primary); }
        .rating-count { font-size: 0.75rem; color: var(--text-muted); }
        .service-card-price-block { text-align: right; }
        .service-card-price {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--success);
          display: flex; align-items: baseline; gap: 2px;
        }
        .service-card-price .currency { font-size: 0.75em; font-weight: 600; }
        .sc-cur-code { font-size: 0.65em; font-weight: 600; color: var(--text-muted); margin-left: 2px; }
        .sc-native-price { font-size: 0.7rem; color: var(--text-muted); margin-top: 1px; }
      `}</style>
    </Link>
  );
};

export default ServiceCard;
