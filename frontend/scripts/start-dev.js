/**
 * Ensures dev-server env is set before react-scripts loads webpack config.
 * Without this, eslint-webpack-plugin can hang the first compile on Node 22 / Windows.
 */
process.env.DISABLE_ESLINT_PLUGIN = process.env.DISABLE_ESLINT_PLUGIN || 'true';
process.env.WATCHPACK_POLLING = process.env.WATCHPACK_POLLING || 'true';
// Use localhost so Google OAuth origins match console entries (localhost ≠ 127.0.0.1).
if (!process.env.HOST) {
  process.env.HOST = 'localhost';
}
if (!process.env.PORT) {
  process.env.PORT = '3000';
}
// If PORT is taken, use the next free port instead of blocking on a Y/n prompt.
if (!process.env.CI) {
  process.env.CI = 'true';
}

require('react-scripts/scripts/start');
