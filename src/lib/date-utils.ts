import { OpeningDateFilter, OpeningDatePreset, ResolvedDateRange } from "./types";

export const TIMEZONE = "America/Sao_Paulo";

/**
 * Converte uma data string YYYY-MM-DD para objeto Date representando o início do dia (00:00:00.000)
 * no fuso horário de São Paulo (UTC-3) ou fim do dia (23:59:59.999).
 */
export function parseSaoPauloDate(dateStr: string, isEndOfDay: boolean = false): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  // Em America/Sao_Paulo (UTC-3 padrão): 00:00 local = 03:00 UTC, 23:59:59.999 local = 02:59:59.999 UTC do dia seguinte
  if (isEndOfDay) {
    return new Date(Date.UTC(year, month - 1, day, 26, 59, 59, 999)); // 23:59:59.999 UTC-3 = 02:59:59.999 UTC (next day)
  }
  return new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0)); // 00:00:00 UTC-3 = 03:00:00 UTC
}

/**
 * Formata um objeto Date para DD/MM/AAAA no fuso horário de São Paulo
 */
export function formatSaoPauloDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/**
 * Função centralizada para resolver o intervalo dinâmico ou estático de abertura da empresa.
 * Recebe `now` como parâmetro para garantir testabilidade, reprodutibilidade e conformidade com timezone.
 */
export function resolveOpeningDateRange(
  filter: OpeningDateFilter | undefined | null,
  now: Date = new Date()
): ResolvedDateRange {
  // Fallback padrão se não informado: últimos 30 dias
  if (!filter) {
    return resolvePreset("LAST_30_DAYS", now);
  }

  // Se o modo for PRESET
  if (filter.mode === "PRESET") {
    const preset = filter.preset || "LAST_30_DAYS";
    return resolvePreset(preset, now);
  }

  // Se o modo for CUSTOM (Intervalo com início e fim)
  if (filter.mode === "CUSTOM") {
    const from = filter.from ? (typeof filter.from === "string" ? parseSaoPauloDate(filter.from, false) : filter.from) : null;
    const to = filter.to ? (typeof filter.to === "string" ? parseSaoPauloDate(filter.to, true) : filter.to) : null;

    return {
      from,
      to,
      label: `${formatSaoPauloDate(from)} → ${formatSaoPauloDate(to)}`,
      mode: "CUSTOM",
      preset: null,
    };
  }

  // Se o modo for FROM_DATE (A partir de uma data)
  if (filter.mode === "FROM_DATE") {
    const from = filter.from ? (typeof filter.from === "string" ? parseSaoPauloDate(filter.from, false) : filter.from) : null;
    return {
      from,
      to: now, // Até o momento presente
      label: `Desde ${formatSaoPauloDate(from)}`,
      mode: "FROM_DATE",
      preset: null,
    };
  }

  // Se o modo for UNTIL_DATE (Até uma data)
  if (filter.mode === "UNTIL_DATE") {
    const to = filter.to ? (typeof filter.to === "string" ? parseSaoPauloDate(filter.to, true) : filter.to) : null;
    return {
      from: null,
      to,
      label: `Até ${formatSaoPauloDate(to)}`,
      mode: "UNTIL_DATE",
      preset: null,
    };
  }

  return resolvePreset("LAST_30_DAYS", now);
}

function resolvePreset(preset: OpeningDatePreset, now: Date): ResolvedDateRange {
  const daysMap: Record<OpeningDatePreset, { days: number; label: string }> = {
    TODAY: { days: 0, label: "Hoje" },
    LAST_3_DAYS: { days: 3, label: "Últimos 3 dias" },
    LAST_7_DAYS: { days: 7, label: "Últimos 7 dias" },
    LAST_15_DAYS: { days: 15, label: "Últimos 15 dias" },
    LAST_30_DAYS: { days: 30, label: "Últimos 30 dias" },
    LAST_60_DAYS: { days: 60, label: "Últimos 60 dias" },
    LAST_90_DAYS: { days: 90, label: "Últimos 90 dias" },
    LAST_180_DAYS: { days: 180, label: "Últimos 180 dias" },
    LAST_365_DAYS: { days: 365, label: "Últimos 365 dias (1 ano)" },
  };

  const config = daysMap[preset] || daysMap.LAST_30_DAYS;
  const startOfNow = new Date(now);
  
  // Obter início do dia no fuso de SP
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(startOfNow); // "YYYY-MM-DD"

  const todayEnd = parseSaoPauloDate(dateParts, true);
  let fromDate: Date;

  if (config.days === 0) {
    fromDate = parseSaoPauloDate(dateParts, false);
  } else {
    const targetDate = new Date(parseSaoPauloDate(dateParts, false).getTime() - config.days * 24 * 60 * 60 * 1000);
    const targetParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(targetDate);
    fromDate = parseSaoPauloDate(targetParts, false);
  }

  return {
    from: fromDate,
    to: todayEnd,
    label: config.label,
    calculatedPeriodText: `${formatSaoPauloDate(fromDate)} → ${formatSaoPauloDate(todayEnd)}`,
    mode: "PRESET",
    preset,
  };
}

/**
 * Validação rigorosa dos campos de data de abertura
 */
export function validateOpeningDateFilter(
  filter: OpeningDateFilter,
  now: Date = new Date()
): { valid: boolean; error?: string } {
  if (filter.mode === "PRESET") {
    if (!filter.preset) return { valid: false, error: "Selecione uma opção de período pré-configurado." };
    return { valid: true };
  }

  if (filter.mode === "CUSTOM") {
    if (!filter.from || !filter.to) {
      return { valid: false, error: "Informe a data inicial e a data final para o período personalizado." };
    }
    const fromDate = typeof filter.from === "string" ? parseSaoPauloDate(filter.from, false) : filter.from;
    const toDate = typeof filter.to === "string" ? parseSaoPauloDate(filter.to, true) : filter.to;

    if (fromDate.getTime() > toDate.getTime()) {
      return { valid: false, error: "A data inicial não pode ser posterior à data final." };
    }

    if (toDate.getTime() > now.getTime() + 24 * 60 * 60 * 1000) { // Tolerância de fim do dia atual
      return { valid: false, error: "A data de abertura não pode estar no futuro." };
    }

    return { valid: true };
  }

  if (filter.mode === "FROM_DATE") {
    if (!filter.from) {
      return { valid: false, error: "Informe a data inicial a partir da qual as empresas serão consideradas." };
    }
    const fromDate = typeof filter.from === "string" ? parseSaoPauloDate(filter.from, false) : filter.from;
    if (fromDate.getTime() > now.getTime()) {
      return { valid: false, error: "A data de abertura não pode estar no futuro." };
    }
    return { valid: true };
  }

  if (filter.mode === "UNTIL_DATE") {
    if (!filter.to) {
      return { valid: false, error: "Informe a data limite (até) para a abertura das empresas." };
    }
    return { valid: true };
  }

  return { valid: true };
}
