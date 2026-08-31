"use client";

import { useState } from "react";
import Link from "next/link";
import { Target, Play, Sparkles, Filter, CheckCircle2, ShieldCheck, ArrowRight, Calendar } from "lucide-react";
import { formatCNPJ, formatCurrency, getScoreBadge } from "@/lib/utils";

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const [status, setStatus] = useState<"DRAFT" | "SIMULATION" | "LIVE">("SIMULATION");

  const campaign = {
    id: params.id || "camp-1",
    name: "Novos Restaurantes de São Paulo",
    productName: "ERP de Gestão para Bares & Restaurantes",
    productDescription: "Software completo com PDV touch, integração iFood e controle de estoque.",
    status: status,
    minScore: 75,
    states: ["SP"],
    cities: ["São Paulo", "Bauru", "Campinas", "Ribeirão Preto"],
    cnae: "56.11-2-01 (Restaurantes e similares)",
    openingDateLabel: "Últimos 30 dias",
    calculatedPeriodText: "02/08/2026 → 31/08/2026 (Timezone: America/Sao_Paulo)",
    totalFoundInPeriod: 1284,
    compatibleIcpCount: 317,
    qualifiedLeadsCount: 217,
    previewSample: [
      {
        razaoSocial: "Bella Pasta Cantina & Pizzaria Fictícia Ltda",
        cnpj: "00000001000191",
        cnae: "56.11-2-01 - Restaurantes e similares",
        municipio: "Bauru",
        uf: "SP",
        dataAbertura: "29/08/2026 (Há 2 dias)",
        score: 94,
        contatoDisponivel: "Telefone & Decisor Verificado",
        matchMotivo: "CNAE primário 100% aderente + Bauru/SP + Aberta em 29/08/2026",
      },
      {
        razaoSocial: "Sabor & Brasa Churrascaria Fictícia ME",
        cnpj: "00000003000153",
        cnae: "56.11-2-01 - Restaurantes e similares",
        municipio: "Ribeirão Preto",
        uf: "SP",
        dataAbertura: "31/08/2026 (Hoje)",
        score: 88,
        contatoDisponivel: "Telefone Institucional",
        matchMotivo: "Abertura em 31/08/2026 no estado de SP + Porte ME",
      },
    ],
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href="/campaigns" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
        ← Voltar para Campanhas
      </Link>

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">{campaign.name}</h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              MODO: {status}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Oferta: <strong className="text-slate-200">{campaign.productName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {status === "SIMULATION" ? (
            <button
              onClick={() => setStatus("LIVE")}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Play className="w-4 h-4" />
              Ativar Disparo LIVE
            </button>
          ) : (
            <button
              onClick={() => setStatus("SIMULATION")}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600/80 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all"
            >
              Voltar p/ Simulação
            </button>
          )}
        </div>
      </div>

      {/* Section 10 & 11: Campaign Preview & Metrics in Depth */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Simulação de Alcance & Filtro Temporal
          </h2>
        </div>

        {/* Temporal Range Summary */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>Período de Abertura Definido: <strong className="text-white">{campaign.openingDateLabel}</strong></span>
          </div>
          <div className="text-xs text-indigo-300 font-mono pl-6">
            Período calculado: {campaign.calculatedPeriodText}
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400">Empresas Encontradas no Período</span>
            <div className="text-xl font-bold text-white mt-1">{campaign.totalFoundInPeriod.toLocaleString("pt-BR")}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400">Empresas Compatíveis com ICP</span>
            <div className="text-xl font-bold text-indigo-400 mt-1">{campaign.compatibleIcpCount.toLocaleString("pt-BR")}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400">Leads Qualificados (Score &gt;= {campaign.minScore}%)</span>
            <div className="text-xl font-bold text-emerald-400 mt-1">{campaign.qualifiedLeadsCount.toLocaleString("pt-BR")}</div>
          </div>
        </div>

        {/* ICP Summary Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Segmento / CNAE</span>
            <div className="text-xs font-medium text-slate-200 truncate mt-0.5">{campaign.cnae}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Cidades / UFs</span>
            <div className="text-xs font-medium text-slate-200 mt-0.5">{campaign.states.join(", ")}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Score Mínimo ICP</span>
            <div className="text-xs font-medium text-indigo-400 mt-0.5">{campaign.minScore}% de aderência</div>
          </div>
        </div>
      </div>

      {/* Preview Sample Table */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Amostra de Empresas Identificadas na Simulação
        </h2>

        <div className="space-y-3">
          {campaign.previewSample.map((emp, idx) => {
            const badge = getScoreBadge(emp.score);
            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{emp.razaoSocial}</span>
                    <span className="font-mono text-[11px] text-slate-500">{formatCNPJ(emp.cnpj)}</span>
                  </div>
                  <div className="text-slate-400">
                    📍 {emp.municipio}/{emp.uf} • Abertura: <strong className="text-slate-300">{emp.dataAbertura}</strong> • Contato: <span className="text-emerald-400">{emp.contatoDisponivel}</span>
                  </div>
                  <div className="text-[11px] text-indigo-300 font-medium pt-0.5">
                    ✓ Motivo do Match: {emp.matchMotivo}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-lg border font-bold ${badge.bg}`}>
                    Score {emp.score}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
