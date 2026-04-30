export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_RULES_TEXT =
  'Password must be at least 8 characters and include an uppercase letter, a number, and a special character.';

export const validatePasswordPolicy = (raw) => {
  const password = String(raw || '');
  if (password.length < PASSWORD_MIN_LENGTH) return PASSWORD_RULES_TEXT;
  if (!/[A-Z]/.test(password)) return PASSWORD_RULES_TEXT;
  if (!/[0-9]/.test(password)) return PASSWORD_RULES_TEXT;
  if (!/[^A-Za-z0-9]/.test(password)) return PASSWORD_RULES_TEXT;
  return null;
};
