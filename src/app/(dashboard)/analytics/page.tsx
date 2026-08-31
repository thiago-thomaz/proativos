"use client";

import { BarChart3, TrendingUp, DollarSign, Users, Award, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-400" />
          Analytics & Atribuição de ROI
        </h1>
        <p className="text-sm text-slate-400">
          Acompanhamento de custos de aquisição, taxas de conversão e receita gerada pelo pipeline proativo.
        </p>
      </div>

      {/* Main ROI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Receita Atribuída</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">R$ 14.400,00</div>
          <div className="text-[11px] text-slate-400 mt-1">6 clientes fechados</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Custo Total de Operação</span>
          <div className="text-2xl font-bold text-white mt-1">R$ 1.066,80</div>
          <div className="text-[11px] text-slate-400 mt-1">Dados + Enriquecimento + Envio</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">ROI Comercial</span>
          <div className="text-2xl font-bold text-indigo-400 mt-1">13.5x</div>
          <div className="text-[11px] text-emerald-400 mt-1">+1.250% de retorno líquido</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Custo por Lead Qualificado</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">R$ 3,12</div>
          <div className="text-[11px] text-slate-400 mt-1">vs R$ 48,00 no Google Ads</div>
        </div>
      </div>

      {/* Conversion Funnel Table */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Funil de Conversão Comercial
        </h2>

        <div className="space-y-3">
          {[
            { stage: "1. Empresas Descobertas", count: 1284, pct: "100%", cost: "R$ 0,05 / un" },
            { stage: "2. Leads Qualificados (ICP Score >= 75)", count: 342, pct: "26.6%", cost: "R$ 0,20 / un" },
            { stage: "3. Contatos Realizados (Email/WhatsApp)", count: 186, pct: "54.3%", cost: "R$ 0,15 / msg" },
            { stage: "4. Respostas Positivas", count: 38, pct: "20.4%", cost: "R$ 4,80 / resposta" },
            { stage: "5. Reuniões de Demonstração Agendadas", count: 14, pct: "36.8%", cost: "R$ 13,20 / reunião" },
            { stage: "6. Clientes Conquistados (Won)", count: 6, pct: "42.8%", cost: "R$ 177,80 (CAC)" },
          ].map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
              <div className="font-semibold text-white">{item.stage}</div>
              <div className="flex items-center gap-6">
                <span className="text-slate-400">Taxa: <strong className="text-indigo-400">{item.pct}</strong></span>
                <span className="text-slate-400">Volume: <strong className="text-white">{item.count}</strong></span>
                <span className="text-slate-500 font-mono">{item.cost}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
