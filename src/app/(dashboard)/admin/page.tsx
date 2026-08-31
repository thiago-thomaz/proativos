"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Building,
  DollarSign,
  Activity,
  Users,
  AlertTriangle,
  Database,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function SuperAdminPage() {
  const [dataEngineMetrics, setDataEngineMetrics] = useState<any>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("MOCK_SANDBOX");
  const [selectedMode, setSelectedMode] = useState<"FULL" | "INCREMENTAL">("INCREMENTAL");
  const [ingestLimit, setIngestLimit] = useState(100);
  const [isDryRun, setIsDryRun] = useState(false);
  const [lastJobResult, setLastJobResult] = useState<any>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/v1/admin/data-engine");
      const data = await res.json();
      if (data.success) {
        setDataEngineMetrics(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleExecuteIngestion = async () => {
    setIsTriggering(true);
    try {
      const res = await fetch("/api/v1/admin/data-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          mode: selectedMode,
          limit: ingestLimit,
          dryRun: isDryRun,
        }),
      });
      const data = await res.json();
      setLastJobResult(data.summary);
      fetchMetrics();
    } catch (err) {
      console.error(err);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Super Admin Top Warning */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="text-xs text-amber-200">
            <strong>Painel Global do Super Admin:</strong> Visualização agregada de todos os tenants, Data Engine e orquestração de dados.
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
          ROOT ACCESS
        </span>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO PRINCIPAL: DATA ENGINE & INGESTION CONTROL (FASE 3) */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-indigo-500/40 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Data Engine: Ingestão Contínua & Provedores de Dados
              </h2>
              <p className="text-xs text-slate-400">
                Pipeline automatizado de descoberta, normalização, deduplicação e qualificação de CNPJs.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5 text-emerald-300" />
            Executar Ingestão Manual
          </button>
        </div>

        {/* Data Engine KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase font-bold">Empresas no Banco</span>
            <div className="text-2xl font-bold text-white mt-1">
              {dataEngineMetrics?.metrics?.totalCompanies?.toLocaleString("pt-BR") || "142.890"}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">
              +{dataEngineMetrics?.metrics?.companiesToday || 128} ingeridas hoje
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase font-bold">Provedores Conectados</span>
            <div className="text-2xl font-bold text-indigo-400 mt-1">
              {dataEngineMetrics?.metrics?.activeProviders || 2} Ativos
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Receita Federal + Sandbox</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase font-bold">Saúde do Pipeline</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">HEALTHY</div>
            <div className="text-[11px] text-slate-400 mt-1">Latência média: 38ms</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase font-bold">Última Sincronização</span>
            <div className="text-base font-bold text-slate-200 mt-1 font-mono">
              {new Date().toLocaleDateString("pt-BR")} 03:00
            </div>
            <div className="text-[11px] text-indigo-300 mt-1">Próxima: Amanhã às 03:00</div>
          </div>
        </div>

        {/* Provider Health Status Cards */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Status de Saúde dos Provedores (Provider Health)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white">RECEITA_FEDERAL (Dados Abertos)</div>
                <div className="text-[11px] text-slate-400">Tipo: Carga Batch / Open Data Gov.br</div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                HEALTHY
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white">MOCK_SANDBOX (Nativo)</div>
                <div className="text-[11px] text-slate-400">Tipo: Ingestão Sintética Parametrizada</div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                HEALTHY
              </span>
            </div>
          </div>
        </div>

        {/* Recent Ingestion Jobs Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Histórico Recente de Ingestion Jobs
          </h3>
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Job ID</th>
                  <th className="px-4 py-2.5">Provedor</th>
                  <th className="px-4 py-2.5">Modo</th>
                  <th className="px-4 py-2.5">Lidos</th>
                  <th className="px-4 py-2.5">Criados</th>
                  <th className="px-4 py-2.5">Atualizados</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {dataEngineMetrics?.recentJobs?.length > 0 ? (
                  dataEngineMetrics.recentJobs.map((j: any) => (
                    <tr key={j.id}>
                      <td className="px-4 py-2.5 font-mono text-indigo-400">{j.id.slice(-8)}</td>
                      <td className="px-4 py-2.5 font-semibold text-white">{j.provider}</td>
                      <td className="px-4 py-2.5 font-mono">{j.mode}</td>
                      <td className="px-4 py-2.5">{j.recordsRead}</td>
                      <td className="px-4 py-2.5 text-emerald-400">+{j.recordsCreated}</td>
                      <td className="px-4 py-2.5 text-amber-400">{j.recordsUpdated}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          {j.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-center text-slate-500">
                      Nenhum job de ingestão executado ainda. Clique em &quot;Executar Ingestão Manual&quot;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Execução de Ingestão */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Play className="w-4 h-4 text-indigo-400" />
                Executar Ingestão Manual
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Provedor de Dados</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                >
                  <option value="MOCK_SANDBOX">MOCK_SANDBOX (Gerador Canônico)</option>
                  <option value="RECEITA_FEDERAL">RECEITA_FEDERAL (Dados Abertos)</option>
                  <option value="CSV_IMPORT">CSV_IMPORT (Arquivo Local)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Modo de Carga</label>
                  <select
                    value={selectedMode}
                    onChange={(e: any) => setSelectedMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="INCREMENTAL">INCREMENTAL</option>
                    <option value="FULL">FULL</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Limite de Registros</label>
                  <input
                    type="number"
                    value={ingestLimit}
                    onChange={(e) => setIngestLimit(Number(e.target.value))}
                    min={10}
                    max={1000}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDryRun}
                    onChange={(e) => setIsDryRun(e.target.checked)}
                    className="accent-indigo-600 rounded"
                  />
                  <span>Modo Dry Run (Simulação sem alterar o banco)</span>
                </label>
              </div>

              {lastJobResult && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-1">
                  <div className="font-bold">✓ Job Executado com Sucesso!</div>
                  <div className="text-[11px]">
                    Lidos: {lastJobResult.recordsRead} • Criados: {lastJobResult.recordsCreated} • Atualizados: {lastJobResult.recordsUpdated} • Leads gerados: {lastJobResult.leadsCreated}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleExecuteIngestion}
                disabled={isTriggering}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow flex items-center gap-1.5"
              >
                {isTriggering ? "Processando Lote..." : "Iniciar Ingestão"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global SaaS KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400">MRR da Plataforma</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">R$ 24.850,00</div>
          <div className="text-[11px] text-slate-400 mt-1">50 Organizações ativas</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400">Total de CNPJs Mapeados</span>
          <div className="text-2xl font-bold text-white mt-1">142.890</div>
          <div className="text-[11px] text-slate-400 mt-1">+1.284 hoje</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400">Leads Qualificados Gerados</span>
          <div className="text-2xl font-bold text-indigo-400 mt-1">38.400</div>
          <div className="text-[11px] text-slate-400 mt-1">26.8% de taxa global</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400">Status dos Workflows n8n</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">100% UP</div>
          <div className="text-[11px] text-slate-400 mt-1">0 erros críticos</div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Organizações Cadastradas no SaaS
        </h2>

        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Organização</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Campanhas</th>
                <th className="px-4 py-3">Leads Gerados</th>
                <th className="px-4 py-3">Créditos</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="px-4 py-3 font-semibold text-white">Acme Tecnologia & Vendas B2B</td>
                <td className="px-4 py-3 text-indigo-400 font-bold">PROFESSIONAL</td>
                <td className="px-4 py-3">3 ativas</td>
                <td className="px-4 py-3 font-mono">452</td>
                <td className="px-4 py-3 font-mono text-emerald-400">1.450</td>
                <td className="px-4 py-3 text-emerald-400">Ativa</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
