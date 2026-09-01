"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Users2,
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  History,
  Send,
  Sparkles,
  Zap,
  Check,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { formatCNPJ, formatCurrency, formatPhone, getScoreBadge, getStatusBadge } from "@/lib/utils";

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const leadId = resolvedParams.id;

  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichSuccess, setEnrichSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLead = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/leads/${leadId}`);
      const data = await res.json();
      if (data.success && data.lead) {
        setLead(data.lead);
      } else {
        setError(data.error || "Lead não encontrado.");
      }
    } catch (err: any) {
      setError("Erro ao carregar detalhes do lead.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLead();
  }, [leadId]);

  const handleEnrich = async () => {
    if (!lead?.company?.id) return;
    setIsEnriching(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/companies/${lead.company.id}/enrich`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setEnrichSuccess(true);
        fetchLead();
        setTimeout(() => setEnrichSuccess(false), 4000);
      } else {
        setError(data.error || "Falha ao enriquecer empresa.");
      }
    } catch (err: any) {
      setError("Erro ao comunicar com o motor de enriquecimento.");
    } finally {
      setIsEnriching(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/v1/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setLead((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm">
        Carregando informações completas do Lead...
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="text-rose-400 font-bold text-base">{error || "Lead não encontrado"}</div>
        <Link href="/leads" className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold">
          ← Voltar para o Pipeline de Leads
        </Link>
      </div>
    );
  }

  const scoreBadge = getScoreBadge(lead.score);
  const statusBadge = getStatusBadge(lead.status);

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
    reasons = [
      `CNAE principal compatível (${lead.company.cnaePrincipal})`,
      `Localizada em ${lead.company.municipio}/${lead.company.uf}`,
      `Score ICP ${lead.score}%`,
    ];
  }

  return (
    <div className="space-y-6">
      {/* Back button & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/leads"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">{lead.company.razaoSocial}</h1>
              <div className={`px-2.5 py-0.5 rounded-lg border text-xs font-bold ${scoreBadge.bg}`}>
                Score {lead.score}%
              </div>
            </div>
            <p className="text-xs text-slate-400">
              {lead.company.nomeFantasia ? `${lead.company.nomeFantasia} • ` : ""}CNPJ {formatCNPJ(lead.company.cnpj)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleEnrich}
            disabled={isEnriching}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            {isEnriching ? "Enriquecendo..." : "Enriquecer Sócios e Contatos"}
          </button>
        </div>
      </div>

      {enrichSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Empresa enriquecida com sucesso! Novos contatos e scores foram atualizados.</span>
        </div>
      )}

      {/* Top Grid: Status & Scores */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-500">Status do Pipeline</span>
          <div className="mt-1">
            <select
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="NEW">NOVO</option>
              <option value="QUALIFIED">QUALIFICADO (ICP)</option>
              <option value="READY_TO_CONTACT">PRONTO P/ CONTATO</option>
              <option value="CONTACTED">CONTATADO</option>
              <option value="RESPONDED">RESPONDEU</option>
              <option value="MEETING">REUNIÃO MARCADA</option>
              <option value="CONVERTED">CONVERTIDO (GANHO)</option>
              <option value="DISQUALIFIED">DESQUALIFICADO</option>
            </select>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-500">Campanha Alvo</span>
          <div className="text-xs font-bold text-white mt-1.5 truncate">
            {lead.campaign?.name || "Geral"}
          </div>
          <div className="text-[10px] text-slate-400">{lead.campaign?.productName || "ERP / Solução"}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-500">Contactabilidade</span>
          <div className="text-base font-bold text-emerald-400 mt-1">
            {lead.contactabilityScore || 85}%
          </div>
          <div className="text-[10px] text-slate-400">Canais validados</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-500">Data de Abertura</span>
          <div className="text-xs font-bold text-white mt-1.5 font-mono">
            {new Date(lead.company.dataAbertura).toLocaleDateString("pt-BR")}
          </div>
          <div className="text-[10px] text-indigo-400">Detectado pelo motor</div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Company Details & Contacts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cadastral Information */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              Dados Cadastrais Oficiais da Empresa
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 text-[11px] block">Razão Social:</span>
                <span className="text-white font-medium">{lead.company.razaoSocial}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Nome Fantasia:</span>
                <span className="text-white font-medium">{lead.company.nomeFantasia || "-"}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">CNAE Principal:</span>
                <span className="text-slate-200">{lead.company.cnaePrincipal}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Porte / Situação:</span>
                <span className="text-slate-200">{lead.company.porte || "ME"} • {lead.company.situacao}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Município / Estado:</span>
                <span className="text-slate-200">{lead.company.municipio}/{lead.company.uf}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Capital Social:</span>
                <span className="text-emerald-400 font-medium">{formatCurrency(lead.company.capitalSocial || 0)}</span>
              </div>
            </div>
          </div>

          {/* Decisores & Contatos */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users2 className="w-4 h-4 text-indigo-400" />
              Quadro de Sócios & Contatos Identificados
            </h2>

            {lead.company.contacts && lead.company.contacts.length > 0 ? (
              <div className="space-y-3">
                {lead.company.contacts.map((contact: any) => (
                  <div
                    key={contact.id}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{contact.nome}</span>
                        {(contact.isDecisionMaker || contact.tipo === "DECISION_MAKER") && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            DECISOR
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{contact.cargo || "Sócio Administrador"}</p>
                    </div>

                    <div className="space-y-1 text-right">
                      {contact.telefone && (
                        <div className="flex items-center justify-end gap-1.5 text-xs text-emerald-400">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{formatPhone(contact.telefone)}</span>
                        </div>
                      )}
                      {contact.email && (
                        <div className="flex items-center justify-end gap-1.5 text-xs text-indigo-300">
                          <Mail className="w-3.5 h-3.5" />
                          <span>{contact.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
                <p className="text-xs text-slate-400">Nenhum sócio ou decisor enriquecido ainda.</p>
                <button
                  onClick={handleEnrich}
                  disabled={isEnriching}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all"
                >
                  Executar Enriquecimento Agora
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Match Reasons & History */}
        <div className="space-y-6">
          {/* Motivos da Qualificação */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              Critérios de Match ICP
            </h3>

            <div className="space-y-2">
              {reasons.map((r: string, idx: number) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2"
                >
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Histórico de Eventos do Lead */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-400" />
              Histórico de Eventos
            </h3>

            {lead.events && lead.events.length > 0 ? (
              <div className="space-y-2.5">
                {lead.events.map((ev: any) => (
                  <div key={ev.id} className="text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-0.5">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span className="font-bold text-indigo-400">{ev.type}</span>
                      <span>{new Date(ev.createdAt).toLocaleString("pt-BR")}</span>
                    </div>
                    <p className="text-slate-300 text-[11px]">{ev.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Nenhum evento registrado para este lead.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
