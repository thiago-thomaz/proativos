/**
 * Normalizadores e Validadores Canônicos de Dados Empresariais (Fase 3)
 */

export function normalizeCnpj(input: string): string {
  if (!input) return "";
  const digits = input.replace(/\D/g, "");
  return digits.padStart(14, "0").slice(0, 14);
}

/**
 * Validação rigorosa dos dígitos verificadores do CNPJ brasileiro (Módulo 11)
 */
export function validateCnpj(cnpjInput: string): boolean {
  const cnpj = normalizeCnpj(cnpjInput);
  if (cnpj.length !== 14) return false;

  // Rejeitar sequências óbvias de dígitos repetidos
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  // Cálculo do 1º dígito
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += parseInt(cnpj[i]) * weights1[i];
  }
  const mod1 = sum1 % 11;
  const dig1 = mod1 < 2 ? 0 : 11 - mod1;
  if (dig1 !== parseInt(cnpj[12])) return false;

  // Cálculo do 2º dígito
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += parseInt(cnpj[i]) * weights2[i];
  }
  const mod2 = sum2 % 11;
  const dig2 = mod2 < 2 ? 0 : 11 - mod2;
  if (dig2 !== parseInt(cnpj[13])) return false;

  return true;
}

export function normalizePhone(rawPhone?: string | null): {
  phone: string | null;
  cleanDigits: string;
  isCellPhone: boolean;
} {
  if (!rawPhone) return { phone: null, cleanDigits: "", isCellPhone: false };
  let clean = rawPhone.replace(/\D/g, "");
  
  // Remover código do país 55 se presente (ex: 5514998765432 -> 14998765432)
  if (clean.startsWith("55") && (clean.length === 12 || clean.length === 13)) {
    clean = clean.slice(2);
  }

  if (clean.length < 8) return { phone: null, cleanDigits: clean, isCellPhone: false };

  // Identificação de celular no Brasil (DDD + 9 dígitos começando com 9)
  const isCellPhone = clean.length === 11 && clean[2] === "9";

  return {
    phone: clean,
    cleanDigits: clean,
    isCellPhone,
  };
}

export function normalizeEmail(rawEmail?: string | null): {
  email: string | null;
  isValidFormat: boolean;
} {
  if (!rawEmail) return { email: null, isValidFormat: false };
  const trimmed = rawEmail.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const isValid = emailRegex.test(trimmed);

  return {
    email: isValid ? trimmed : null,
    isValidFormat: isValid,
  };
}

export function normalizeStatus(rawStatus?: string | null): "ATIVA" | "SUSPENSA" | "INAPTA" | "BAIXADA" | "NULA" | "DESCONHECIDA" {
  if (!rawStatus) return "ATIVA";
  const st = rawStatus.toUpperCase().trim();
  if (st.includes("ATIV") || st === "02" || st === "ATIVA") return "ATIVA";
  if (st.includes("SUSP") || st === "01") return "SUSPENSA";
  if (st.includes("INAPT") || st === "04") return "INAPTA";
  if (st.includes("BAIX") || st === "08") return "BAIXADA";
  if (st.includes("NUL") || st === "03") return "NULA";
  return "DESCONHECIDA";
}

export function normalizeCnae(rawCnae: string): { code: string; formatted: string } {
  const digits = (rawCnae || "").replace(/\D/g, "");
  if (digits.length < 7) {
    return { code: digits, formatted: digits };
  }
  // Formato: 56.11-2-01
  const formatted = `${digits.slice(0, 2)}.${digits.slice(2, 4)}-${digits.slice(4, 5)}-${digits.slice(5, 7)}`;
  return { code: digits, formatted };
}

export function normalizeDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  const dateStr = String(input).trim();
  // Formato YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  // Formato DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split("/").map(Number);
    const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return isNaN(d.getTime()) ? null : d;
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}
