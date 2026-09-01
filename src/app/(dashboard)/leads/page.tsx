"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users2,
  Filter,
  Search,
  CheckCircle2,
  Calendar,
  Phone,
  Mail,
  ArrowRight,
  Flame,
  RefreshCw,
} from "lucide-react";
import { formatCNPJ, formatPhone, getScoreBadge, getStatusBadge } from "@/lib/utils";

interface LeadItem {
  id: string;
  score: number;
  status: string;
  qualificationReason?: string | null;
  firstDetectedAt: string;
  company: {
    id: string;
    cnpj: string;
    razaoSocial: string;
    nomeFantasia?: string | null;
    cnaePrincipal: string;
    municipio: string;
    uf: string;
    porte?: string | null;
    telefone?: string | null;
    email?: string | null;
    contacts?: Array<{
      id: string;
      nome: string;
      cargo?: string | null;
      telefone?: string | null;
      email?: string | null;
      isDecisionMaker?: boolean;
    }>;
  };
  campaign?: {
    id: string;
    name: string;
  };
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState("ALL");
  const [search, setSearch] = useState("");

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let url = "/api/v1/leads";
      if (selectedStage !== "ALL") {
        url += `?status=${selectedStage}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.leads) {
        setLeads(data.leads);
      }
    } catch (err) {
      console.error("Erro ao carregar leads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [selectedStage]);

  // Contagem por estágio
  const countsByStage = leads.reduce((acc: Record<string, number>, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {});

  const PIPELINE_STAGES = [
    { id: "ALL", label: "Todos os Leads", count: leads.length },
    { id: "QUALIFIED", label: "Qualificados (ICP)", count: countsByStage["QUALIFIED"] || 0 },
    { id: "READY_TO_CONTACT", label: "Pronto p/ Contato", count: countsByStage["READY_TO_CONTACT"] || 0 },
    { id: "CONTACTED", label: "Contatados", count: countsByStage["CONTACTED"] || 0 },
    { id: "RESPONDED", label: "Respostas", count: countsByStage["RESPONDED"] || 0 },
    { id: "MEETING", label: "Reunião Agendada", count: countsByStage["MEETING"] || 0 },
    { id: "CONVERTED", label: "Convertidos / Ganho", count: countsByStage["CONVERTED"] || 0 },
  ];

  const filteredLeads = leads.filter((lead) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      lead.company.razaoSocial.toLowerCase().includes(s) ||
      (lead.company.nomeFantasia && lead.company.nomeFantasia.toLowerCase().includes(s)) ||
      lead.company.cnpj.includes(s.replace(/\D/g, "")) ||
      lead.company.municipio.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users2 className="w-6 h-6 text-indigo-400" />
            Pipeline & Gestão de Leads
          </h1>
          <p className="text-sm text-slate-400">
            Acompanhe a qualificação, enriquecimento de decisores e o engajamento proativo.
          </p>
        </div>

        <button
          onClick={fetchLeads}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar Pipeline
        </button>
      </div>

      {/* Pipeline Stage Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {PIPELINE_STAGES.map((stage) => {
          const isSelected = selectedStage === stage.id;
          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(stage.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
                isSelected
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              <span>{stage.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                  isSelected ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                }`}
              >
                {stage.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Buscar por Razão Social, CNPJ ou Cidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Leads List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Carregando leads do pipeline...</div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
            Nenhum lead encontrado neste estágio do pipeline.
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const scoreBadge = getScoreBadge(lead.score);
            const statusBadge = getStatusBadge(lead.status);
            const decisionMaker = lead.company.contacts?.find((c: any) => c.tipo === "DECISION_MAKER" || c.isDecisionMaker) || lead.company.contacts?.[0];

            let reasons: string[] = [];
            try {
              const parsed = JSON.parse(lead.qualificationReason || "{}");
              if (parsed.reasons && Array.isArray(parsed.reasons)) {
                reasons = parsed.reasons;
              } else if (Array.isArray(parsed)) {
                reasons = parsed.filter((p: any) => p.matched).map((p: any) => p.detail || p.criterion);
              }
            } catch {}

            if (reasons.length === 0) {
              reasons = [`CNAE compatível`, `Localizada em ${lead.company.municipio}/${lead.company.uf}`, `Score ICP ${lead.score}%`];
            }

            return (
              <div
                key={lead.id}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-slate-700/80 transition-all space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-base font-bold text-white">{lead.company.razaoSocial}</h2>
                      {lead.company.nomeFantasia && (
                        <span className="text-xs text-slate-400">({lead.company.nomeFantasia})</span>
                      )}
                      <span className="text-xs text-slate-500 font-mono">
                        {formatCNPJ(lead.company.cnpj)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>{lead.company.cnaePrincipal}</span>
                      <span>•</span>
                      <span className="text-slate-200 font-medium">
                        {lead.company.municipio}/{lead.company.uf}
                      </span>
                      {lead.campaign && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-400">Campanha: {lead.campaign.name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Badges & Actions */}
                  <div className="flex items-center gap-2 self-start lg:self-center">
                    <div
                      className={`px-3 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${scoreBadge.bg}`}
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Score {lead.score}%</span>
                    </div>

                    <div className={`px-2.5 py-1 rounded-xl border text-xs font-bold ${statusBadge.bg}`}>
                      {statusBadge.label}
                    </div>

                    <Link
                      href={`/leads/${lead.id}`}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition-all ml-1"
                    >
                      Detalhes
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Match Reasons + Contact Info Split */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
                  {/* Reasons */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                      Critérios do ICP Aprovados
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {reasons.slice(0, 3).map((r, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded bg-indigo-950/50 text-indigo-300 border border-indigo-900/50"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Contact / Decision Maker */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                        Decisor / Contato Principal
                      </div>
                      <div className="text-xs font-bold text-slate-200">
                        {decisionMaker?.nome || lead.company.razaoSocial}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {decisionMaker?.cargo || "Sócio Administrador (QSA)"}
                      </div>
                    </div>

                    <div className="space-y-1 text-right">
                      {(decisionMaker?.telefone || lead.company.telefone) && (
                        <div className="flex items-center justify-end gap-1 text-[11px] text-emerald-400">
                          <Phone className="w-3 h-3" />
                          <span>{formatPhone(decisionMaker?.telefone || lead.company.telefone || "")}</span>
                        </div>
                      )}
                      {(decisionMaker?.email || lead.company.email) && (
                        <div className="flex items-center justify-end gap-1 text-[11px] text-indigo-300">
                          <Mail className="w-3 h-3" />
                          <span className="truncate max-w-[130px]">{decisionMaker?.email || lead.company.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
