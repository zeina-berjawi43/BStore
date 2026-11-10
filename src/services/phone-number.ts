export const PHONE_NUMBER_LENGTH = 8;

export const sanitizePhoneInput = (value: string): string =>
  value.replace(/[^0-9]/g, '').slice(0, PHONE_NUMBER_LENGTH);

export function phoneNumberError(value: string): string | null {
  if (!value) return 'Please enter your phone number.';
  return value.length === PHONE_NUMBER_LENGTH && /^[0-9]{8}$/.test(value)
    ? null
    : 'Phone number must contain exactly 8 digits (0–9).';
}

export function requirePhoneNumber(value: string): void {
  const error = phoneNumberError(value);
  if (error) throw new Error(error);
}
