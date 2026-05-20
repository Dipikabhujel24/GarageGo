import React from 'react';

/**
 * Decoy fields placed at the top of sensitive forms so browsers attach
 * saved credentials to hidden inputs instead of visible ones.
 */
function FormAutofillShield({ includePassword = true, includeEmail = true }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '-9999px',
        width: 1,
        height: 1,
        overflow: 'hidden',
        opacity: 0,
        pointerEvents: 'none',
      }}
    >
      {includeEmail ? (
        <input type="text" name="fake-email" tabIndex={-1} autoComplete="username" defaultValue="" readOnly />
      ) : null}
      {includePassword ? (
        <input type="password" name="fake-password" tabIndex={-1} autoComplete="new-password" defaultValue="" readOnly />
      ) : null}
    </div>
  );
}

export default FormAutofillShield;
