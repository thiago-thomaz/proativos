"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Flame,
  Target,
  Users2,
  Inbox as InboxIcon,
  Building2,
  Contact,
  FileText,
  PlugZap,
  BarChart3,
  ShieldCheck,
  CreditCard,
  Settings,
  ShieldAlert,
  Sparkles,
  Zap,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Split,
  Calendar,
  Bell,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/opportunities", label: "Radar de Oportunidades", icon: Flame, badge: "🔥 Radar" },
  { href: "/crm", label: "CRM & Deals", icon: Briefcase, badge: "Fase 7" },
  { href: "/revenue", label: "Revenue & ROI", icon: TrendingUp, badge: "MRR" },
  { href: "/marketplace", label: "Marketplace Leads", icon: ShoppingBag, badge: "Loja" },
  { href: "/meetings", label: "Agenda & Reuniões", icon: Calendar },
  { href: "/experiments", label: "Testes A/B", icon: Split },
  { href: "/campaigns", label: "Campanhas & ICP", icon: Target },
  { href: "/leads", label: "Leads (Descoberta)", icon: Users2, badge: "Live" },
  { href: "/inbox", label: "Inbox & Respostas", icon: InboxIcon, badge: "Novo" },
  { href: "/companies", label: "Empresas", icon: Building2 },
  { href: "/contacts", label: "Contatos", icon: Contact },
  { href: "/templates", label: "Templates & Copy", icon: FileText },
  { href: "/notifications", label: "Notificações", icon: Bell },
  { href: "/integrations", label: "Integrações & n8n", icon: PlugZap },
  { href: "/billing", label: "Planos & Créditos", icon: CreditCard },
  { href: "/privacy", label: "Data & Privacy (LGPD)", icon: ShieldCheck },
  { href: "/settings", label: "Configurações", icon: Settings },
  { href: "/admin", label: "Super Admin", icon: ShieldAlert },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-[#0c1220]/95 flex flex-col fixed inset-y-0 left-0 z-40 backdrop-blur-md">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800/80 gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
            Proactive Lead
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              Engine
            </span>
          </span>
          <p className="text-[11px] text-slate-400">Inteligência B2B em tempo real</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group",
                isActive
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("w-4 h-4 transition-colors", isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300")} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-semibold border",
                    isActive
                      ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                      : item.badge.includes("Radar")
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer Banner */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
        <div className="p-2.5 rounded-lg bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <div className="text-[11px] text-slate-300 font-medium">Fase 7 Ativa</div>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
            PASS
          </span>
        </div>
      </div>
    </aside>
  );
}
