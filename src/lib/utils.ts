import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCNPJ(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return cnpj;
  return clean.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "-";
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 11) {
    return clean.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }
  if (clean.length === 10) {
    return clean.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }
  return phone;
}

export function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatRelativeDays(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - d.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  return `Há ${diffDays} dias`;
}

export function getScoreBadge(score: number) {
  if (score >= 85) {
    return {
      label: "Excelente",
      bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      bar: "bg-emerald-500",
    };
  }
  if (score >= 70) {
    return {
      label: "Alta",
      bg: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      bar: "bg-blue-500",
    };
  }
  if (score >= 40) {
    return {
      label: "Média",
      bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      bar: "bg-amber-500",
    };
  }
  return {
    label: "Baixa",
    bg: "bg-slate-500/10 text-slate-400 border-slate-500/30",
    bar: "bg-slate-500",
  };
}

export function getStatusBadge(status: string) {
  const statusMap: Record<string, { label: string; bg: string }> = {
    NEW: { label: "Novo", bg: "bg-slate-500/10 text-slate-300 border-slate-600/40" },
    QUALIFIED: { label: "Qualificado", bg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" },
    READY_TO_CONTACT: { label: "Pronto p/ Contato", bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" },
    CONTACTED: { label: "Contatado", bg: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
    RESPONDED: { label: "Respondeu", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
    MEETING: { label: "Reunião Agendada", bg: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
    CONVERTED: { label: "Convertido / Ganho", bg: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    DISQUALIFIED: { label: "Desqualificado", bg: "bg-rose-500/10 text-rose-400 border-rose-500/30" },
    OPTED_OUT: { label: "Opt-Out", bg: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" },
    BOUNCED: { label: "Bounced", bg: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
    BLOCKED: { label: "Bloqueado", bg: "bg-red-500/10 text-red-400 border-red-500/30" },
  };

  return statusMap[status] || { label: status, bg: "bg-slate-500/10 text-slate-300 border-slate-600/40" };
}
