import React from 'react';
import FormAutofillShield from './FormAutofillShield';
import { formAutofillProps } from '../utils/formAutofill';

/**
 * Form wrapper with autocomplete disabled and optional decoy fields for credential forms.
 */
function SecureForm({
  children,
  includePassword = true,
  includeEmail = true,
  className,
  style,
  ...rest
}) {
  return (
    <form
      {...formAutofillProps}
      className={className}
      style={{ position: 'relative', ...style }}
      {...rest}
    >
      <FormAutofillShield includePassword={includePassword} includeEmail={includeEmail} />
      {children}
    </form>
  );
}

export default SecureForm;
