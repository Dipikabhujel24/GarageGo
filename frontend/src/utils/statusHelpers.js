export function normalizeStatusKey(status) {
  return String(status ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

export function statusMatchesFilter(status, filterValue) {
  if (!filterValue || filterValue === 'all') {
    return true;
  }

  return normalizeStatusKey(status) === normalizeStatusKey(filterValue);
}
