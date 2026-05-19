import { useEffect } from 'react';

function applyAutofillAttributes(root) {
  if (!root) {
    return;
  }

  root.querySelectorAll('form').forEach((form) => {
    if (!form.getAttribute('autocomplete')) {
      form.setAttribute('autocomplete', 'off');
    }
  });

  root.querySelectorAll('input, select, textarea').forEach((element) => {
    if (element.getAttribute('autocomplete')) {
      return;
    }

    const type = (element.getAttribute('type') || '').toLowerCase();
    if (type === 'password') {
      element.setAttribute('autocomplete', 'new-password');
      return;
    }

    element.setAttribute('autocomplete', 'off');
  });
}

/**
 * Ensures dynamically rendered fields receive autocomplete attributes
 * when a page forgets to set them explicitly.
 */
export function useGlobalFormAutofillOff() {
  useEffect(() => {
    const root = document.getElementById('root');
    applyAutofillAttributes(root || document);

    const observer = new MutationObserver(() => {
      applyAutofillAttributes(root || document);
    });

    observer.observe(root || document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);
}
