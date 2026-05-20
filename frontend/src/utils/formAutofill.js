/**
 * Shared autocomplete / autofill attributes to reduce browser saved-form suggestions.
 * Auth tokens and user session remain in authSession.js — never store passwords here.
 */

export const formAutofillProps = {
  autoComplete: 'off',
};

export const searchInputAutofillProps = {
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'off',
  spellCheck: false,
};

export const emailInputAutofillProps = {
  autoComplete: 'off',
  inputMode: 'email',
};

export const otpInputAutofillProps = {
  autoComplete: 'one-time-code',
  inputMode: 'numeric',
};

/** Login / existing credential fields */
export const loginPasswordAutofillProps = {
  autoComplete: 'off',
};

/** Registration, reset, staff create — discourage saved-password pickers */
export const newPasswordAutofillProps = {
  autoComplete: 'new-password',
};

export const textInputAutofillProps = {
  autoComplete: 'off',
};

export const numberInputAutofillProps = {
  autoComplete: 'off',
  inputMode: 'decimal',
};

export function mergeAutofillProps(baseProps, extra = {}) {
  return { ...baseProps, ...extra };
}

/** Brief readOnly on mount reduces Chrome password/email autofill on focus. */
export const preventAutofillReadOnlyProps = {
  readOnly: true,
  onFocus: (event) => {
    event.target.removeAttribute('readonly');
  },
};
