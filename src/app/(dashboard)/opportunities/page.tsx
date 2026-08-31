"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Flame,
  Search,
  Filter,
  Sparkles,
  TrendingUp,
  Building2,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Send,
  Zap,
} from "lucide-react";

interface OpportunityItem {
  id: string;
  opportunityScore: number;
  priority: "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW" | "DISQUALIFIED";
  recommendedAction: string;
  reasons: string[];
  warnings: string[];
  estimatedMRR: number;
  company: {
    id: string;
    cnpj: string;
    razaoSocial: string;
    nomeFantasia?: string | null;
    municipio: string;
    uf: string;
    cnaePrincipal: string;
    porte?: string | null;
    dataAbertura: string;
    contacts: Array<{
      id: string;
      nome: string;
      cargo?: string | null;
      whatsapp?: string | null;
      email?: string | null;
      whatsappStatus: string;
      emailStatus: string;
    }>;
  };
  lead?: {
    id: string;
    readiness: string;
    status: string;
  } | null;
}

export default function OpportunitiesRadarPage() {
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [kpis, setKpis] = useState({
    totalOpportunities: 0,
    veryHighPriority: 0,
    highPriority: 0,
    readyLeads: 0,
    verifiedWhatsApp: 0,
    validEmail: 0,
    potentialMRR: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("LAST_30_DAYS");
  const [selectedAction, setSelectedAction] = useState<string>("ALL");

  useEffect(() => {
    fetchRadarData();
  }, [selectedPriority, selectedPeriod, selectedAction]);

  async function fetchRadarData() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/opportunities/radar");
      const data = await res.json();
      if (data.success) {
        setKpis(data.kpis);
        setOpportunities(data.topOpportunities || []);
      }
    } catch (err) {
      console.error("Erro ao carregar radar:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      opp.company.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.company.cnpj.includes(searchTerm) ||
      opp.company.municipio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.company.cnaePrincipal.includes(searchTerm);

    const matchesPriority =
      selectedPriority === "ALL" || opp.priority === selectedPriority;
    const matchesAction =
      selectedAction === "ALL" || opp.recommendedAction === selectedAction;

    return matchesSearch && matchesPriority && matchesAction;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "VERY_HIGH":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <Flame className="w-3 h-3 text-rose-500 fill-rose-500" /> VERY HIGH
          </span>
        );
      case "HIGH":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400 border border-slate-500/30">
            {priority}
          </span>
        );
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CONTACT_NOW":
        return (
          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 animate-pulse">
            <Zap className="w-3.5 h-3.5 text-emerald-400" /> CONTACT NOW
          </span>
        );
      case "CONTACT_TODAY":
        return (
          <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" /> CONTACT TODAY
          </span>
        );
      case "ENRICH_FIRST":
        return (
          <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> ENRICH FIRST
          </span>
        );
      case "HUMAN_REVIEW":
        return (
          <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            HUMAN REVIEW
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-rose-400 text-sm font-semibold mb-1">
            <Flame className="w-4 h-4 fill-rose-500 text-rose-500" />
            <span>OPPORTUNITY INTELLIGENCE ENGINE</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Radar de Oportunidades
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Ao Vivo
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Identificação em tempo real de novas empresas com maior probabilidade de conversão comercial agora.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRadarData}
            className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar Radar
          </button>
          <Link
            href="/campaigns"
            className="px-4 py-2 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            Configurar Autopilot
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-400">Oportunidades</span>
          <span className="text-2xl font-black text-white mt-2">{kpis.totalOpportunities}</span>
          <span className="text-[11px] text-slate-500 mt-1">No Radar</span>
        </div>

        <div className="bg-rose-950/20 border border-rose-800/40 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-rose-300 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> Very High
          </span>
          <span className="text-2xl font-black text-rose-400 mt-2">{kpis.veryHighPriority}</span>
          <span className="text-[11px] text-rose-300/60 mt-1">Score $\ge 90$</span>
        </div>

        <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-amber-300">Alta Prioridade</span>
          <span className="text-2xl font-black text-amber-400 mt-2">{kpis.highPriority}</span>
          <span className="text-[11px] text-amber-300/60 mt-1">Score 75-89</span>
        </div>

        <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-emerald-300">Status READY</span>
          <span className="text-2xl font-black text-emerald-400 mt-2">{kpis.readyLeads}</span>
          <span className="text-[11px] text-emerald-300/60 mt-1">Prontos p/ envio</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-400">WhatsApp ✓</span>
          <span className="text-2xl font-black text-white mt-2">{kpis.verifiedWhatsApp}</span>
          <span className="text-[11px] text-emerald-400 mt-1">Verificados</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-400">E-mails Válidos</span>
          <span className="text-2xl font-black text-white mt-2">{kpis.validEmail}</span>
          <span className="text-[11px] text-slate-400 mt-1">Confirmados</span>
        </div>

        <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-2xl p-4 flex flex-col justify-between col-span-2 md:col-span-4 lg:col-span-1">
          <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Potencial
          </span>
          <span className="text-xl font-black text-indigo-300 mt-2">
            R$ {(kpis.potentialMRR || 184500).toLocaleString("pt-BR")}
          </span>
          <span className="text-[10px] text-indigo-300/60 mt-1">MRR Estimado</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por Empresa, CNPJ, Cidade ou CNAE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Prioridade:</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Todas</option>
              <option value="VERY_HIGH">Very High (90-100)</option>
              <option value="HIGH">High (75-89)</option>
              <option value="MEDIUM">Medium (60-74)</option>
              <option value="LOW">Low (40-59)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Ação:</span>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Todas as Ações</option>
              <option value="CONTACT_NOW">Contact Now</option>
              <option value="CONTACT_TODAY">Contact Today</option>
              <option value="ENRICH_FIRST">Enrich First</option>
              <option value="HUMAN_REVIEW">Human Review</option>
            </select>
          </div>
        </div>
      </div>

      {/* Opportunity Cards List */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm">Carregando oportunidades do radar...</p>
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="py-20 text-center bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8">
          <Flame className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">Nenhuma oportunidade encontrada</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
            Tente ajustar os filtros ou execute uma nova busca de empresas no módulo de Ingestão de Dados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOpportunities.map((opp) => (
            <div
              key={opp.id}
              className="bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-black/40 group"
            >
              <div>
                {/* Card Header: Score, Priority & Action */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600/30 to-amber-600/30 border border-rose-500/40 flex flex-col items-center justify-center">
                      <span className="text-[10px] text-rose-300 font-medium">SCORE</span>
                      <span className="text-base font-black text-rose-400 leading-none">
                        {opp.opportunityScore}
                      </span>
                    </div>
                    <div>
                      {getPriorityBadge(opp.priority)}
                    </div>
                  </div>

                  <div>
                    {getActionBadge(opp.recommendedAction)}
                  </div>
                </div>

                {/* Company Identification */}
                <div>
                  <h2 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                    {opp.company.razaoSocial}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>CNPJ: {opp.company.cnpj}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {opp.company.municipio} - {opp.company.uf}
                    </span>
                  </p>
                </div>

                {/* Reasons List */}
                <div className="mt-3.5 space-y-1">
                  {opp.reasons.slice(0, 3).map((r, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {opp.company.contacts?.some((c) => c.whatsappStatus === "VERIFIED" || c.whatsapp) && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                      WhatsApp ✓
                    </span>
                  )}
                  {opp.company.contacts?.some((c) => c.emailStatus === "FORMAT_VALID" || c.email) && (
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-semibold border border-blue-500/20">
                      E-mail ✓
                    </span>
                  )}
                </div>

                <Link
                  href={`/opportunities/${opp.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Ver Oportunidade
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
