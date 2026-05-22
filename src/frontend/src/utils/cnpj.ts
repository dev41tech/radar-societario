/** Aplica máscara XX.XXX.XXX/XXXX-XX enquanto o usuário digita. */
export function maskCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  let result = '';
  for (let i = 0; i < digits.length; i++) {
    if (i === 2)  result += '.';
    if (i === 5)  result += '.';
    if (i === 8)  result += '/';
    if (i === 12) result += '-';
    result += digits[i];
  }
  return result;
}

/** Valida CNPJ pelo algoritmo oficial dos dígitos verificadores. */
export function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false; // todos iguais ex. 00000000000000

  function calcDigit(str: string, weights: number[]): number {
    const sum = weights.reduce((acc, w, i) => acc + w * Number(str[i]), 0);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  }

  const d1 = calcDigit(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcDigit(digits, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return Number(digits[12]) === d1 && Number(digits[13]) === d2;
}
