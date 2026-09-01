"use client";

import { useEffect, useState } from "react";
import { CreditCard, Coins, Check, Zap, Sparkles, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function BillingPage() {
  const [balance, setBalance] = useState(100);
  const [currentPlan, setCurrentPlan] = useState("STARTER");
  const [plans, setPlans] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const [credRes, plansRes] = await Promise.all([
        fetch("/api/v1/billing/credits"),
        fetch("/api/v1/billing/plans"),
      ]);

      const credData = await credRes.json();
      const plansData = await plansRes.json();

      if (credData.success) {
        setBalance(credData.balance);
        setCurrentPlan(credData.plan);
        setTransactions(credData.transactions || []);
      }

      if (plansData.success && plansData.plans) {
        setPlans(plansData.plans);
      }
    } catch (err) {
      console.error("Erro ao carregar faturamento:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const handleSubscribe = async (planSlug: string) => {
    setSubscribing(planSlug);
    try {
      const res = await fetch("/api/v1/billing/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug }),
      });
      const data = await res.json();
      if (data.success) {
        fetchBillingData();
      }
    } catch (err) {
      console.error("Erro ao assinar plano:", err);
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-indigo-400" />
            Planos, Créditos & Faturamento
          </h1>
          <p className="text-sm text-slate-400">
            Gerenciamento transparente de consumo de dados, enriquecimento e assinaturas.
          </p>
        </div>

        <button
          onClick={fetchBillingData}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar Saldo
        </button>
      </div>

      {/* Credit Account Balance Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Saldo Atual da Conta
          </div>
          <div className="text-3xl font-bold text-white flex items-center gap-2">
            <Coins className="w-7 h-7 text-indigo-400" />
            {balance.toLocaleString("pt-BR")} Créditos
          </div>
          <p className="text-xs text-slate-400">
            Plano Ativo: <strong className="text-white">{currentPlan}</strong> • 1 crédito = 1 outreach ou 2 créditos = enriquecimento completo de decisor.
          </p>
        </div>
      </div>

      {/* Plans Comparison */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
          Planos Disponíveis
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs col-span-3">Carregando planos...</div>
          ) : (
            plans.map((p) => {
              const isCurrent = currentPlan.toUpperCase() === p.slug.toUpperCase();
              return (
                <div
                  key={p.id}
                  className={`p-6 rounded-2xl border space-y-4 ${
                    isCurrent
                      ? "bg-slate-900 border-indigo-500 shadow-xl shadow-indigo-500/10 relative"
                      : "bg-slate-900/70 border-slate-800"
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500 text-white uppercase tracking-wider">
                      Plano Atual
                    </span>
                  )}
                  <h3 className="text-base font-bold text-white">{p.name}</h3>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(p.priceMonthly)}
                    <span className="text-xs text-slate-400 font-normal">/mês</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {p.includedCreditsMonthly.toLocaleString("pt-BR")} créditos inclusos todo mês.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-indigo-400" /> Até {p.maxCampaigns} Campanhas ICP
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-indigo-400" /> {p.includedCreditsMonthly} Créditos Mensais
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-indigo-400" /> Enriquecimento com IA
                    </li>
                  </ul>

                  <button
                    onClick={() => handleSubscribe(p.slug)}
                    disabled={isCurrent || subscribing === p.slug}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isCurrent
                        ? "bg-slate-800 text-slate-400 cursor-default"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                    }`}
                  >
                    {isCurrent ? "Plano Ativo" : subscribing === p.slug ? "Atualizando..." : "Escolher este Plano"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Transactions History */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
          Extrato de Consumo & Recargas
        </h2>

        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Tipo</th>
                <th className="px-5 py-3.5 font-semibold">Descrição</th>
                <th className="px-5 py-3.5 font-semibold">Data</th>
                <th className="px-5 py-3.5 font-semibold text-right">Quantidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                    Nenhuma transação registrada até o momento.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/30">
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.amount > 0
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-white">{tx.description}</td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {new Date(tx.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td
                      className={`px-5 py-3.5 text-right font-bold font-mono ${
                        tx.amount > 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
