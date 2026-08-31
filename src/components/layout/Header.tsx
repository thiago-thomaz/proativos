"use client";

import Link from "next/link";
import { Coins, Shield, User } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#0c1220]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6">
      {/* Organization Info & Mode */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Acme Corp</span>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Plano Pro
          </span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/60 border border-slate-700/50 text-[11px] text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Motor Ativo (Postgres + n8n)
        </div>
      </div>

      {/* Right Controls: Credits, Compliance & Profile */}
      <div className="flex items-center gap-3">
        {/* Credits Balance */}
        <Link
          href="/billing"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-950/40 border border-indigo-800/50 text-indigo-300 hover:border-indigo-600 transition-colors"
        >
          <Coins className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-semibold">1.450 Créditos</span>
        </Link>

        {/* Compliance Safe Tag */}
        <Link
          href="/privacy"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs"
        >
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>LGPD Ready</span>
        </Link>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs">
            <User className="w-4 h-4 text-slate-400" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-medium text-slate-200">Thiago Thomaz</div>
            <div className="text-[10px] text-slate-400">OWNER</div>
          </div>
        </div>
      </div>
    </header>
  );
}
