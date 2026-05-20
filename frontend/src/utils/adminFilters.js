const LOW_STOCK_THRESHOLD = 10;

export function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function includesText(value, query) {
  if (!query) {
    return true;
  }

  return normalizeText(value).includes(normalizeText(query));
}

export function getStockStatusKey(quantity, threshold = LOW_STOCK_THRESHOLD) {
  const qty = Number(quantity) || 0;

  if (qty <= 0) {
    return 'out';
  }

  if (qty < threshold) {
    return 'low';
  }

  return 'in';
}

export function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isWithinDateRange(value, from, to) {
  const date = parseDate(value);

  if (!date) {
    return !from && !to;
  }

  if (from) {
    const start = parseDate(from);
    if (start && date < start) {
      return false;
    }
  }

  if (to) {
    const end = parseDate(to);
    if (end) {
      end.setHours(23, 59, 59, 999);
      if (date > end) {
        return false;
      }
    }
  }

  return true;
}

export function isToday(value) {
  const date = parseDate(value);
  if (!date) {
    return false;
  }

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function isThisWeek(value) {
  const date = parseDate(value);
  if (!date) {
    return false;
  }

  const now = new Date();
  const start = new Date(now);
  const day = start.getDay() || 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day + 1);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return date >= start && date < end;
}

export function isThisMonth(value) {
  const date = parseDate(value);
  if (!date) {
    return false;
  }

  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export function sortItems(items, sortKey, getValue) {
  const list = [...items];

  list.sort((left, right) => {
    const leftValue = getValue(left);
    const rightValue = getValue(right);

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return leftValue - rightValue;
    }

    return String(leftValue).localeCompare(String(rightValue), undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });

  if (sortKey.startsWith('desc-')) {
    list.reverse();
  }

  return list;
}

export function matchSearchFields(record, query, fieldKeys, getters) {
  if (!query) {
    return true;
  }

  const keys = fieldKeys.includes('all') ? Object.keys(getters) : fieldKeys;

  return keys.some((key) => includesText(getters[key]?.(record), query));
}

export { LOW_STOCK_THRESHOLD };
