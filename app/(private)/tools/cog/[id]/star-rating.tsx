'use client';

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function StarRating({ rating, onChange, size = 'md', className = '' }: StarRatingProps) {
  const starSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  const interactive = !!onChange;

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${className}`}
      role={interactive ? 'radiogroup' : undefined}
      aria-label="Star rating"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= rating;

        return interactive ? (
          <button
            key={star}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              // Click current rating to clear
              onChange(star === rating ? 0 : star);
            }}
            className={`${starSize} transition-colors ${
              filled
                ? 'text-yellow-400 hover:text-yellow-300'
                : 'text-white/30 hover:text-white/50'
            }`}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            role="radio"
            aria-checked={star === rating}
          >
            <StarIcon filled={filled} />
          </button>
        ) : (
          <span
            key={star}
            className={`${starSize} ${filled ? 'text-yellow-400' : 'text-white/30'}`}
          >
            <StarIcon filled={filled} />
          </span>
        );
      })}
    </div>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
      className="w-full h-full"
    >
      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}
