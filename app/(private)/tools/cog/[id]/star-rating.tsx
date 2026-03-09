'use client';

import { IconStar, IconStarFilled } from '@tabler/icons-react';

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function StarRating({ rating, onChange, size = 'md', className = '' }: StarRatingProps) {
  const starPx = size === 'sm' ? 14 : 20;
  const interactive = !!onChange;

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${className}`}
      role={interactive ? 'radiogroup' : undefined}
      aria-label="Star rating"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= rating;

        const StarComponent = filled ? IconStarFilled : IconStar;

        return interactive ? (
          <button
            key={star}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              // Click current rating to clear
              onChange(star === rating ? 0 : star);
            }}
            className={`transition-colors ${
              filled
                ? 'text-yellow-400 hover:text-yellow-300'
                : 'text-white/30 hover:text-white/50'
            }`}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            role="radio"
            aria-checked={star === rating}
          >
            <StarComponent size={starPx} />
          </button>
        ) : (
          <span
            key={star}
            className={`${filled ? 'text-yellow-400' : 'text-white/30'}`}
          >
            <StarComponent size={starPx} />
          </span>
        );
      })}
    </div>
  );
}

