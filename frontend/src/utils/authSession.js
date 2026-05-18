const TOKEN_KEY = 'token';
const USER_KEY = 'authUser';
const LEGACY_USER_KEY = 'customer';

function parseStoredUser(rawValue) {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function getStoredAuthUser() {
  return (
    parseStoredUser(localStorage.getItem(USER_KEY)) ||
    parseStoredUser(localStorage.getItem(LEGACY_USER_KEY))
  );
}

export function storeAuthSession({ token, user }) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  if (user) {
    const serializedUser = JSON.stringify(user);
    localStorage.setItem(USER_KEY, serializedUser);
    localStorage.setItem(LEGACY_USER_KEY, serializedUser);
  }
}

export function updateStoredAuthUser(user) {
  if (!user) {
    return;
  }

  const serializedUser = JSON.stringify(user);
  localStorage.setItem(USER_KEY, serializedUser);
  localStorage.setItem(LEGACY_USER_KEY, serializedUser);
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
}
