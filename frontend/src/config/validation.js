// Validation constants  [P1]
// Edit this file to change the USN pattern accepted during registration.

/**
 * USN pattern:  1 digit  2 letters  2 digits  2-3 letters  3 digits
 * Example match: 1AB21CS001
 *
 * To change the pattern, update USN_REGEX below and USN_PATTERN_HINT.
 */
export const USN_REGEX = /^\d{1}[A-Z]{2}\d{2}[A-Z]{2,3}\d{3}$/;

/** Human-readable hint shown under the USN field */
export const USN_PATTERN_HINT = 'Format: 1AB21CS001 (digit, 2 letters, 2 digits, 2–3 letters, 3 digits)';

/** Minimum password length */
export const PASSWORD_MIN_LENGTH = 8;

/** Minimum name length */
export const NAME_MIN_LENGTH = 2;
