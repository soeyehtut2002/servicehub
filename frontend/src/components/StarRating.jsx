import { useState } from 'react';
import { Star } from 'lucide-react';

const StarRating = ({ rating = 0, onRate, readonly = false, size = 'md' }) => {
  const [hovered, setHovered] = useState(0);

  const sizes = { sm: 13, md: 18, lg: 26 };
  const px = sizes[size] || sizes.md;

  const stars = [1, 2, 3, 4, 5];
  const display = hovered || rating;

  return (
    <div className="star-rating" style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
      {stars.map((star) => {
        const filled = display >= star;
        return (
          <span
            key={star}
            onClick={() => !readonly && onRate && onRate(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            style={{
              cursor: readonly ? 'default' : 'pointer',
              transition: 'transform 0.15s ease',
              transform: !readonly && hovered >= star ? 'scale(1.25)' : 'scale(1)',
              display: 'inline-flex',
              userSelect: 'none',
              color: filled ? '#F59E0B' : '#CBD5E1',
            }}
            title={readonly ? `${rating} stars` : `Rate ${star} star${star > 1 ? 's' : ''}`}
          >
            <Star
              size={px}
              fill={filled ? '#F59E0B' : 'none'}
              strokeWidth={1.8}
            />
          </span>
        );
      })}
    </div>
  );
};

export default StarRating;
