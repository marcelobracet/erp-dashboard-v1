/** Remove non-digit characters from a document string. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function allSameDigits(digits: string): boolean {
  if (!digits) return false;
  return digits.split("").every((d) => d === digits[0]);
}

/** Validates a Brazilian CPF (11 digits + check digits). */
export function isValidCPF(cpf: string): boolean {
  const digits = onlyDigits(cpf);
  if (digits.length !== 11) return false;
  if (allSameDigits(digits)) return false;

  const d = digits.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += d[i] * (10 - i);
  let mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  if (mod !== d[9]) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += d[i] * (11 - i);
  mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  return mod === d[10];
}

/** Validates a Brazilian CNPJ (14 digits + check digits). */
export function isValidCNPJ(cnpj: string): boolean {
  const digits = onlyDigits(cnpj);
  if (digits.length !== 14) return false;
  if (allSameDigits(digits)) return false;

  const d = digits.split("").map(Number);
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) sum += d[i] * w1[i];
  let mod = sum % 11;
  const dv1 = mod < 2 ? 0 : 11 - mod;
  if (d[12] !== dv1) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) {
    const val = i === 12 ? dv1 : d[i];
    sum += val * w2[i];
  }
  mod = sum % 11;
  const dv2 = mod < 2 ? 0 : 11 - mod;
  return d[13] === dv2;
}
