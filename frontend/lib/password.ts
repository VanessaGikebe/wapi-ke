/**
 * Password policy: length 8–128, must include upper/lower/number/special,
 * rejects common weak passwords, and scores strength on a 5-level scale.
 */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const STRENGTH_LEVELS = [
  "Very Weak",
  "Weak",
  "Fair",
  "Strong",
  "Very Strong",
] as const;

export type StrengthLevel = (typeof STRENGTH_LEVELS)[number];

// A small blocklist of the most common weak passwords (case-insensitive).
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "qwertyuiop",
  "111111111",
  "abc12345",
  "iloveyou",
  "admin123",
  "welcome1",
  "letmein1",
  "monkey123",
  "football",
  "baseball",
  "dragon123",
  "sunshine1",
  "princess1",
  "changeme",
  "passw0rd",
  "trustno1",
  "starwars1",
]);

export interface PasswordCheck {
  key: string;
  label: string;
  met: boolean;
}

export interface PasswordAssessment {
  checks: PasswordCheck[];
  /** True only when the policy is fully satisfied. */
  valid: boolean;
  /** 0 (Very Weak) … 4 (Very Strong). */
  score: number;
  strength: StrengthLevel;
  /** Human-readable reasons it's not yet valid (empty when valid). */
  errors: string[];
}

export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}

export function assessPassword(password: string): PasswordAssessment {
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const longEnough = password.length >= PASSWORD_MIN;
  const notTooLong = password.length <= PASSWORD_MAX;
  const common = isCommonPassword(password);

  const checks: PasswordCheck[] = [
    { key: "length", label: `${PASSWORD_MIN}+ characters`, met: longEnough },
    { key: "upper", label: "One uppercase letter", met: hasUpper },
    { key: "lower", label: "One lowercase letter", met: hasLower },
    { key: "number", label: "One number", met: hasNumber },
    { key: "special", label: "One special character", met: hasSpecial },
  ];

  const valid =
    longEnough &&
    notTooLong &&
    hasUpper &&
    hasLower &&
    hasNumber &&
    hasSpecial &&
    !common;

  // Strength points (0–5), then clamp to a 0–4 level.
  let points = 0;
  if (password.length >= PASSWORD_MIN) points += 1;
  if (password.length >= 12) points += 1;
  if (hasUpper && hasLower) points += 1;
  if (hasNumber) points += 1;
  if (hasSpecial) points += 1;
  if (common) points = Math.min(points, 1);
  if (!longEnough) points = Math.min(points, 1);
  const score = Math.max(0, Math.min(4, points - 1));

  const errors: string[] = [];
  if (!longEnough)
    errors.push(`Use at least ${PASSWORD_MIN} characters.`);
  if (!notTooLong) errors.push(`Use at most ${PASSWORD_MAX} characters.`);
  if (!hasUpper) errors.push("Add an uppercase letter.");
  if (!hasLower) errors.push("Add a lowercase letter.");
  if (!hasNumber) errors.push("Add a number.");
  if (!hasSpecial) errors.push("Add a special character.");
  if (common) errors.push("This password is too common — choose another.");

  return { checks, valid, score, strength: STRENGTH_LEVELS[score], errors };
}
