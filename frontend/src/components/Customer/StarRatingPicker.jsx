import React from 'react';

function StarRatingPicker({ value, onChange, max = 5 }) {
  const rating = Number(value) || 0;

  return (
    <div className="star-rating-picker" role="group" aria-label="Service rating">
      {Array.from({ length: max }, (_, index) => {
        const starValue = index + 1;
        const isActive = starValue <= rating;

        return (
          <button
            key={starValue}
            type="button"
            className={isActive ? 'is-active' : ''}
            onClick={() => onChange(starValue)}
            aria-label={`${starValue} star${starValue === 1 ? '' : 's'}`}
            aria-pressed={isActive}
          >
            ★
          </button>
        );
      })}
      <span className="star-rating-picker-label">{rating} / {max}</span>
    </div>
  );
}

export default StarRatingPicker;
