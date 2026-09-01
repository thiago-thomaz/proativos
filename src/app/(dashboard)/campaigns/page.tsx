"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Target, Play, Pause, AlertCircle, Eye, Sparkles, Filter, CheckCircle2, RefreshCw } from "lucide-react";

interface CampaignItem {
  id: string;
  name: string;
  productName: string;
  status: "DRAFT" | "SIMULATION" | "LIVE" | "PAUSED";
  minScore: number;
  allowedChannels: string | string[];
  leadsCount: number;
  contactedCount: number;
  openedDays: number;
  states: string[];
  cnaeDescription: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/campaigns");
      const data = await res.json();
      if (data.success && data.campaigns) {
        setCampaigns(data.campaigns);
      }
    } catch (err) {
      console.error("Erro ao carregar campanhas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const toggleStatus = async (id: string, newStatus: CampaignItem["status"]) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/v1/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setCampaigns(prev =>
          prev.map(c => (c.id === id ? { ...c, status: newStatus } : c))
        );
      }
    } catch (err) {
      console.error("Erro ao atualizar status da campanha:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-indigo-400" />
            Campanhas & Definição de ICP
          </h1>
          <p className="text-sm text-slate-400">
            Configure o perfil de cliente ideal (ICP), simule volume e ative a prospecção automatizada.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCampaigns}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
          <Link
            href="/campaigns/new"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Nova Campanha
          </Link>
        </div>
      </div>

      {/* Mode Explanation Notice */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
        <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-white">Controle de Modos de Operação:</span>
          <p className="text-slate-400">
            <strong>DRAFT:</strong> Configuração em rascunho. | <strong>SIMULATION:</strong> O motor identifica e qualifica leads reais sem enviar mensagens. | <strong>LIVE:</strong> Disparo automatizado respeitando 9 regras de compliance e limites diários.
          </p>
        </div>
      </div>

      {/* Campaigns Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Carregando campanhas do motor...</div>
      ) : campaigns.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
          Nenhuma campanha cadastrada. Clique em &quot;Nova Campanha&quot; para definir um ICP.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {campaigns.map((camp) => {
            const channelsStr = Array.isArray(camp.allowedChannels)
              ? camp.allowedChannels.join(", ")
              : camp.allowedChannels || "EMAIL";

            return (
              <div
                key={camp.id}
                className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-slate-700/80 transition-all space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-base font-bold text-white">{camp.name}</h2>
                      {camp.status === "LIVE" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          LIVE
                        </span>
                      )}
                      {camp.status === "SIMULATION" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          SIMULAÇÃO (DRY RUN)
                        </span>
                      )}
                      {camp.status === "DRAFT" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">
                          RASCUNHO
                        </span>
                      )}
                      {camp.status === "PAUSED" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          PAUSADA
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Produto / Oferta: <span className="text-slate-200 font-medium">{camp.productName}</span>
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {camp.status === "SIMULATION" && (
                      <button
                        onClick={() => toggleStatus(camp.id, "LIVE")}
                        disabled={updatingId === camp.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5" />
                        {updatingId === camp.id ? "Alterando..." : "Ativar Modo LIVE"}
                      </button>
                    )}
                    {camp.status === "LIVE" && (
                      <button
                        onClick={() => toggleStatus(camp.id, "PAUSED")}
                        disabled={updatingId === camp.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        {updatingId === camp.id ? "Pausando..." : "Pausar"}
                      </button>
                    )}
                    {camp.status === "PAUSED" && (
                      <button
                        onClick={() => toggleStatus(camp.id, "LIVE")}
                        disabled={updatingId === camp.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5" />
                        {updatingId === camp.id ? "Retomando..." : "Retomar LIVE"}
                      </button>
                    )}
                    <Link
                      href={`/campaigns/${camp.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Visualizar ICP & Preview
                    </Link>
                  </div>
                </div>

                {/* ICP Parameters Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Segmento / CNAE</span>
                    <div className="text-xs font-medium text-slate-200 truncate mt-0.5">{camp.cnaeDescription || "Geral"}</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Localização</span>
                    <div className="text-xs font-medium text-slate-200 mt-0.5">{Array.isArray(camp.states) ? camp.states.join(", ") : camp.states || "Brasil"}</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Tempo de Abertura</span>
                    <div className="text-xs font-medium text-slate-200 mt-0.5">Últimos {camp.openedDays || 30} dias</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Score Mínimo ICP</span>
                    <div className="text-xs font-medium text-indigo-400 mt-0.5">{camp.minScore}% de aderência</div>
                  </div>
                </div>

                {/* Leads Summary */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-4">
                    <span>Leads Encontrados: <strong className="text-white">{camp.leadsCount || 0}</strong></span>
                    <span>Contatados: <strong className="text-white">{camp.contactedCount || 0}</strong></span>
                    <span>Canais: <strong className="text-slate-300">{channelsStr}</strong></span>
                  </div>
                  <Link
                    href="/leads"
                    className="text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    Ver leads desta campanha →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
