import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const cleanRut = (value: string): string =>
  value.replace(/[.\-\s]/g, '').toUpperCase();

const computeRutDV = (body: string): string => {
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return remainder.toString();
};

export const rutValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = (control.value ?? '').toString().trim();
  if (!value) return null;

  const clean = cleanRut(value);
  if (!/^[0-9]{7,8}[0-9K]$/.test(clean)) return { rutInvalid: true };

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  return computeRutDV(body) === dv ? null : { rutInvalid: true };
};

export const chileanPhoneValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = (control.value ?? '').toString().trim();
  if (!value) return null;
  return /^\+569\d{8}$/.test(value) ? null : { phoneInvalid: true };
};

export const strictEmailValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = (control.value ?? '').toString().trim();
  if (!value) return null;
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return pattern.test(value) ? null : { emailInvalid: true };
};

export const strongPasswordValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = (control.value ?? '').toString();
  if (!value) return null;
  const errors: ValidationErrors = {};
  if (value.length < 6) errors['minLength'] = true;
  if (!/[A-Z]/.test(value)) errors['noUppercase'] = true;
  if (!/[0-9]/.test(value)) errors['noNumber'] = true;
  return Object.keys(errors).length ? errors : null;
};

export const formatRut = (value: string): string => {
  const clean = cleanRut(value);
  if (!clean) return '';
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!body) return clean;
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${dv}`;
};
