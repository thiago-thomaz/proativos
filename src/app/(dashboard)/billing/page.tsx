"use client";

import { CreditCard, Coins, Check, Zap, Sparkles, ArrowUpRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const TRANSACTIONS = [
  { id: "tx-1", type: "RECHARGE", desc: "Recarga de Créditos (Plano Professional)", amount: 1500, date: "30/08/2026", cost: "R$ 497,00" },
  { id: "tx-2", type: "USAGE", desc: "Enriquecimento de Decisor (Carlos Silva)", amount: -2, date: "30/08/2026", cost: "-" },
  { id: "tx-3", type: "USAGE", desc: "Disparo WhatsApp Cloud (Campanha Restaurantes)", amount: -1, date: "30/08/2026", cost: "-" },
  { id: "tx-4", type: "USAGE", desc: "Verificação de E-mail Institucional", amount: -1, date: "29/08/2026", cost: "-" },
];

export default function BillingPage() {
  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-indigo-400" />
          Planos, Créditos & Faturamento
        </h1>
        <p className="text-sm text-slate-400">
          Gerenciamento transparente de consumo de dados, enriquecimento e assinaturas.
        </p>
      </div>

      {/* Credit Account Balance Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Saldo Atual da Conta
          </div>
          <div className="text-3xl font-bold text-white flex items-center gap-2">
            <Coins className="w-7 h-7 text-indigo-400" />
            1.450 Créditos
          </div>
          <p className="text-xs text-slate-400">
            Equivalente a aproximadamente 725 enriquecimentos completos ou 1.450 mensagens de outreach.
          </p>
        </div>

        <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-300" />
          Comprar Pacote de Créditos
        </button>
      </div>

      {/* Plans Comparison */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
          Planos Disponíveis
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white">STARTER</h3>
            <div className="text-2xl font-bold text-white">R$ 197<span className="text-xs text-slate-400 font-normal">/mês</span></div>
            <p className="text-xs text-slate-400">Ideal para validação e prospecção inicial em 1 segmento.</p>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400" /> Até 2 Campanhas ICP</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400" /> 500 Créditos / mês</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400" /> Disparo por E-mail</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-indigo-950/40 border border-indigo-500/50 space-y-4 relative">
            <span className="absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500 text-white">
              PLANO ATUAL
            </span>
            <h3 className="text-base font-bold text-white">PROFESSIONAL</h3>
            <div className="text-2xl font-bold text-white">R$ 497<span className="text-xs text-slate-400 font-normal">/mês</span></div>
            <p className="text-xs text-slate-400">Para empresas em crescimento e múltiplos segmentos.</p>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400" /> Campanhas Ilimitadas</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400" /> 1.500 Créditos / mês</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400" /> WhatsApp + E-mail Oficial</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400" /> Conector n8n Ilimitado</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white">BUSINESS</h3>
            <div className="text-2xl font-bold text-white">R$ 997<span className="text-xs text-slate-400 font-normal">/mês</span></div>
            <p className="text-xs text-slate-400">Volume elevado e equipes comerciais dedicadas.</p>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400" /> Tudo do Pro</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400" /> 4.000 Créditos / mês</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400" /> Webhook dedicado p/ CRM</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Transactions Ledger */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Extrato de Uso & Transações
        </h2>

        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Descrição da Operação</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-right">Créditos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {TRANSACTIONS.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 text-slate-400">{tx.date}</td>
                  <td className="px-4 py-3 font-medium text-white">{tx.desc}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-400">{tx.type}</td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${tx.amount > 0 ? "text-emerald-400" : "text-amber-400"}`}>
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
