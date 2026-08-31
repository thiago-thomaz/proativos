"use client";

import { useState } from "react";
import Link from "next/link";
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
  MessageSquare,
  Sparkles,
  XCircle,
  Zap,
  Check,
  ShieldAlert,
} from "lucide-react";
import { formatCNPJ, formatCurrency, getScoreBadge, getStatusBadge } from "@/lib/utils";

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const [status, setStatus] = useState("READY_TO_CONTACT");
  const [isEnriching, setIsEnriching] = useState(false);
  const [suppressedIds, setSuppressedIds] = useState<string[]>([]);

  const lead = {
    id: params.id || "lead-1",
    razaoSocial: "Bella Pasta Cantina & Pizzaria Fictícia Ltda",
    nomeFantasia: "Cantina Bella Pasta",
    cnpj: "00000001000191",
    situacao: "ATIVA",
    dataAbertura: "29/08/2026",
    porte: "ME",
    capitalSocial: 85000,
    naturezaJuridica: "Sociedade Empresária Limitada",
    cnaePrincipal: "56.11-2-01 - Restaurantes e similares",
    cnaesSecundarios: ["56.20-1-04 - Fornecimento de alimentos preparados"],
    endereco: "Rua das Flores, 142 - Centro, Bauru/SP - CEP 17010-000",
    score: 94,
    contactabilityScore: 88,
    priorityScore: 92,
    readiness: "READY",
    campaignName: "Novos Restaurantes de São Paulo",
    productName: "ERP para Restaurantes",
    contacts: [
      {
        id: "c-1",
        nome: "Carlos Eduardo Silva",
        cargo: "Sócio Administrador",
        tipo: "DECISION_MAKER",
        email: "carlos@bellapastaficticia.com.br",
        telefone: "(14) 99876-5432",
        whatsapp: "(14) 99876-5432",
        whatsappStatus: "VERIFIED",
        emailStatus: "FORMAT_VALID",
        confidenceScore: 92,
        nameSource: "RECEITA_FEDERAL_QSA",
        roleSource: "RECEITA_FEDERAL_QSA",
        whatsappSource: "WHATSAPP_LOOKUP_API",
        emailSource: "DOMINIO_CORPORATIVO",
        sourceProvider: "RECEITA_QSA_ENRICHMENT",
        optOut: false,
      },
      {
        id: "c-2",
        nome: "Bella Pasta Cantina (Sede)",
        cargo: "Central Telefônica",
        tipo: "COMPANY_PHONE",
        telefone: "(14) 3234-5678",
        whatsappStatus: "INVALID",
        emailStatus: "UNKNOWN",
        confidenceScore: 65,
        sourceProvider: "RECEITA_FEDERAL_DBE",
        phoneSource: "RECEITA_FEDERAL_DBE",
        optOut: false,
      },
    ],
    positiveReasons: [
      "✓ Empresa corresponde perfeitamente ao ICP (Score 94%).",
      "✓ Aberta há 2 dias (29/08/2026) na cidade prioritária de Bauru/SP.",
      "✓ Decisor identificado no QSA oficial: Carlos Eduardo Silva (Sócio Administrador).",
      "✓ WhatsApp comercial ativo e verificado pelo provider.",
      "✓ E-mail corporativo cadastrado com formato válido.",
    ],
    rejectionsAndGaps: [
      "⚠ Telefone da sede é linha fixa institucional (não possui WhatsApp).",
    ],
    timeline: [
      {
        date: "29/08/2026 10:14",
        title: "Nova Empresa Identificada",
        description: "CNPJ registrado na base pública e ingerido pelo Data Ingestion Engine.",
      },
      {
        date: "29/08/2026 10:15",
        title: "Qualificação de ICP: Score 94%",
        description: "Motor calculou 94 pontos de aderência para a campanha 'Novos Restaurantes de SP'.",
      },
      {
        date: "30/08/2026 14:22",
        title: "Enriquecimento de Contato & QSA",
        description: "Decisor identificado (Carlos Eduardo Silva) e WhatsApp verificado.",
      },
      {
        date: "30/08/2026 14:23",
        title: "Contatabilidade Calculada: 88% (Pronto para Contato)",
        description: "Classificação Lead Readiness: READY. Prioridade final calculada em 92/100.",
      },
    ],
  };

  const handleEnrich = async () => {
    setIsEnriching(true);
    setTimeout(() => {
      setIsEnriching(false);
      alert("Enriquecimento concluído com sucesso via QSA e validação de operadoras!");
    }, 1000);
  };

  const handleSuppress = (contactId: string) => {
    setSuppressedIds([...suppressedIds, contactId]);
    alert("Contato suprimido com sucesso e adicionado à lista de Opt-Out da organização.");
  };

  const scoreBadge = getScoreBadge(lead.score);
  const statusBadge = getStatusBadge(status);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back Link */}
      <Link href="/leads" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
        ← Voltar ao Pipeline de Leads
      </Link>

      {/* Top Banner Card */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">{lead.razaoSocial}</h1>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusBadge.bg}`}>
                {statusBadge.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              CNPJ: {formatCNPJ(lead.cnpj)} • Nome Fantasia: <strong className="text-slate-200">{lead.nomeFantasia}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${scoreBadge.bg}`}>
              <Sparkles className="w-4 h-4" />
              <span>Score ICP {lead.score}%</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <Phone className="w-4 h-4" />
              <span>Contatabilidade {lead.contactabilityScore}%</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-bold flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              <span>Prioridade {lead.priorityScore}</span>
            </div>

            <button
              onClick={handleEnrich}
              disabled={isEnriching}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isEnriching ? "Enriquecendo..." : "Enriquecer QSA"}</span>
            </button>
          </div>
        </div>

        {/* Lead Readiness Banner */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold">Prontidão para Outreach:</span>
            <span className="px-2 py-0.5 rounded font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px]">
              {lead.readiness} (Pronto para Contato)
            </span>
          </div>
          <span className="text-slate-500 text-[11px]">Fórmula: 60% ICP ({lead.score}) + 40% Contatabilidade ({lead.contactabilityScore})</span>
        </div>

        {/* Status Pipeline Mover */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 mr-2">Mover Status:</span>
          {["QUALIFIED", "READY_TO_CONTACT", "CONTACTED", "RESPONDED", "MEETING", "CONVERTED", "DISQUALIFIED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatus(st)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                status === st
                  ? "bg-indigo-600 border-indigo-500 text-white shadow"
                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {getStatusBadge(st).label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Lead Explanation & Contacts with Lineage */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 20 & 21: Lead Explanation in Depth */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Por que este lead? (Lead Explanation)
                </h2>
              </div>
              <span className="text-xs text-indigo-300 font-mono font-bold">
                Prioridade: {lead.priorityScore}/100
              </span>
            </div>

            {/* Positive Reasons */}
            <div className="space-y-2">
              <span className="text-[11px] uppercase font-bold text-emerald-400">
                Pontos de Correspondência e Qualificação:
              </span>
              <div className="space-y-1.5">
                {lead.positiveReasons.map((reason, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-950/70 border border-emerald-500/20 text-xs text-slate-200"
                  >
                    {reason}
                  </div>
                ))}
              </div>
            </div>

            {/* Negative / Gaps */}
            {lead.rejectionsAndGaps.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] uppercase font-bold text-slate-400">
                  Pontos de Atenção (Auditoria):
                </span>
                <div className="space-y-1.5">
                  {lead.rejectionsAndGaps.map((rej, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400"
                    >
                      {rej}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Contacts List with Field-Level Provenance & Verification */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users2 className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Contatos Enriquecidos & Auditoria de Origem ({lead.contacts.length})
                </h2>
              </div>
            </div>

            <div className="space-y-3">
              {lead.contacts.map((contact) => {
                const isSuppressed = suppressedIds.includes(contact.id);
                return (
                  <div
                    key={contact.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isSuppressed
                        ? "bg-rose-950/20 border-rose-900/40 opacity-60"
                        : "bg-slate-950/70 border-slate-800/80"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{contact.nome}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                            {contact.tipo}
                          </span>
                          {isSuppressed && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                              SUPRIMIDO (OPT-OUT)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{contact.cargo}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          Confiança: {contact.confidenceScore}%
                        </span>
                        {!isSuppressed && (
                          <button
                            onClick={() => handleSuppress(contact.id)}
                            className="px-2 py-1 rounded text-[10px] font-semibold bg-slate-900 hover:bg-rose-950 border border-slate-800 hover:border-rose-700 text-slate-400 hover:text-rose-200 transition-all flex items-center gap-1"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>Opt-Out</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                      {contact.telefone && (
                        <div className="flex items-center gap-2 text-slate-300">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>{contact.telefone}</span>
                          {contact.whatsappStatus === "VERIFIED" && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              WhatsApp Ativo
                            </span>
                          )}
                        </div>
                      )}
                      {contact.email && (
                        <div className="flex items-center gap-2 text-slate-300">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          <span>{contact.email}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {contact.emailStatus}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Field-Level Provenance */}
                    <div className="mt-2 text-[10px] text-slate-500 font-mono flex flex-wrap gap-x-3 gap-y-1">
                      <span>Fonte Nome: {contact.nameSource || contact.sourceProvider}</span>
                      {contact.whatsappSource && <span>Fonte WhatsApp: {contact.whatsappSource}</span>}
                      {contact.emailSource && <span>Fonte E-mail: {contact.emailSource}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Company Registry Info */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Dados Cadastrais da Empresa
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 text-[11px]">Data de Abertura</span>
                <div className="font-medium text-slate-200 mt-0.5">{lead.dataAbertura}</div>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Situação Cadastral</span>
                <div className="font-medium text-emerald-400 mt-0.5">{lead.situacao}</div>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Porte</span>
                <div className="font-medium text-slate-200 mt-0.5">{lead.porte}</div>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Capital Social</span>
                <div className="font-medium text-slate-200 mt-0.5">{formatCurrency(lead.capitalSocial)}</div>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Natureza Jurídica</span>
                <div className="font-medium text-slate-200 mt-0.5 truncate">{lead.naturezaJuridica}</div>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Endereço Completo</span>
                <div className="font-medium text-slate-200 mt-0.5 truncate">{lead.endereco}</div>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-slate-500 text-[11px]">CNAE Principal</span>
              <div className="font-mono text-xs text-indigo-300 mt-0.5">{lead.cnaePrincipal}</div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Compliance & Timeline */}
        <div className="space-y-6">
          {/* Timeline of Events */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              Histórico do Lead (Timeline)
            </h3>

            <div className="space-y-4 relative before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-slate-800 pl-6">
              {lead.timeline.map((item, idx) => (
                <div key={idx} className="relative space-y-1">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-slate-900" />
                  <span className="text-[10px] text-slate-500">{item.date}</span>
                  <div className="text-xs font-semibold text-slate-200">{item.title}</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
