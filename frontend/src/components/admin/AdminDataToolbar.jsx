import React from 'react';
import { searchInputAutofillProps } from '../../utils/formAutofill';
import './AdminDataToolbar.css';

function AdminDataToolbar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  searchField,
  onSearchFieldChange,
  searchFields = [],
  selects = [],
  sortValue = '',
  onSortChange,
  sortOptions = [],
  showDateRange = false,
  dateFrom = '',
  dateTo = '',
  onDateFromChange,
  onDateToChange,
  showPriceRange = false,
  priceMin = '',
  priceMax = '',
  onPriceMinChange,
  onPriceMaxChange,
  onClear,
  resultText = '',
}) {
  return (
    <div className="admin-data-toolbar">
      <div className="admin-data-toolbar__row">
        {searchFields.length > 0 ? (
          <label className="admin-data-toolbar__field">
            <span>Search by</span>
            <select value={searchField} onChange={(event) => onSearchFieldChange?.(event.target.value)}>
              {searchFields.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="admin-data-toolbar__field">
          <span>Search</span>
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder={searchPlaceholder}
            {...searchInputAutofillProps}
          />
        </label>

        {selects.map((selectConfig) => (
          <label key={selectConfig.id} className="admin-data-toolbar__field">
            <span>{selectConfig.label}</span>
            <select
              value={selectConfig.value}
              onChange={(event) => selectConfig.onChange?.(event.target.value)}
            >
              {selectConfig.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}

        {sortOptions.length > 0 ? (
          <label className="admin-data-toolbar__field">
            <span>Sort</span>
            <select value={sortValue} onChange={(event) => onSortChange?.(event.target.value)}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {onClear ? (
          <div className="admin-data-toolbar__actions">
            <button type="button" className="button button-secondary" onClick={onClear}>
              Clear
            </button>
          </div>
        ) : null}
      </div>

      {(showDateRange || showPriceRange) && (
        <div className="admin-data-toolbar__row admin-data-toolbar__row--secondary">
          {showDateRange ? (
            <>
              <label className="admin-data-toolbar__field">
                <span>From</span>
                <input type="date" value={dateFrom} onChange={(event) => onDateFromChange?.(event.target.value)} />
              </label>
              <label className="admin-data-toolbar__field">
                <span>To</span>
                <input type="date" value={dateTo} onChange={(event) => onDateToChange?.(event.target.value)} />
              </label>
            </>
          ) : null}

          {showPriceRange ? (
            <>
              <label className="admin-data-toolbar__field">
                <span>Min price</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceMin}
                  onChange={(event) => onPriceMinChange?.(event.target.value)}
                />
              </label>
              <label className="admin-data-toolbar__field">
                <span>Max price</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceMax}
                  onChange={(event) => onPriceMaxChange?.(event.target.value)}
                />
              </label>
            </>
          ) : null}
        </div>
      )}

      {resultText ? <p className="admin-data-toolbar__summary">{resultText}</p> : null}
    </div>
  );
}

export default AdminDataToolbar;
