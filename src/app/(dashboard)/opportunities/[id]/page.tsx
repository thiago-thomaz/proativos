"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Flame,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Zap,
  Clock,
  Sparkles,
  Phone,
  Mail,
  ShieldCheck,
  Send,
  UserCheck,
  TrendingUp,
} from "lucide-react";

export default function OpportunityDetailPage() {
  const params = useParams();
  const [opportunity, setOpportunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchOpportunityDetail(params.id as string);
    }
  }, [params.id]);

  async function fetchOpportunityDetail(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/opportunities/${id}`);
      const data = await res.json();
      if (data.success) {
        setOpportunity(data.opportunity);
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
        <Sparkles className="w-8 h-8 animate-spin text-rose-500" />
        <p className="text-sm">Carregando inteligência da oportunidade...</p>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="py-24 text-center">
        <p className="text-slate-400">Oportunidade não encontrada.</p>
        <Link href="/opportunities" className="text-indigo-400 text-xs font-semibold mt-4 inline-block">
          ← Voltar para o Radar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Back Link */}
      <Link
        href="/opportunities"
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar para o Radar de Oportunidades
      </Link>

      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Flame className="w-4 h-4 fill-rose-500 text-rose-500" />
            Oportunidade Identificada
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            {opportunity.company.razaoSocial}
          </h1>
          <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
            <span>CNPJ: {opportunity.company.cnpj}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              {opportunity.company.municipio} - {opportunity.company.uf}
            </span>
            <span>•</span>
            <span>Porte: {opportunity.company.porte || "ME"}</span>
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 shrink-0">
          <div className="text-center pr-4 border-r border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Opportunity Score</span>
            <div className="text-3xl font-black text-rose-400 mt-0.5">
              {opportunity.opportunityScore}
            </div>
            <span className="text-[10px] text-rose-300/80 font-semibold">{opportunity.priority}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Ação Recomendada</span>
            <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-400" />
              {opportunity.recommendedAction}
            </div>
          </div>
        </div>
      </div>

      {/* Deep Explanation Breakdown */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-rose-400" />
          Por que essa empresa é uma oportunidade agora?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-2.5">
            <h3 className="text-xs font-bold uppercase text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Sinais Positivos & Forças Comerciais
            </h3>
            {opportunity.reasons.map((r: string, idx: number) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>{r}</span>
              </div>
            ))}
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-2.5">
            <h3 className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Pontos de Atenção & Alertas
            </h3>
            {opportunity.warnings && opportunity.warnings.length > 0 ? (
              opportunity.warnings.map((w: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="text-amber-400 font-bold">⚠</span>
                  <span>{w}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">Nenhum alerta impeditivo identificado.</p>
            )}
          </div>
        </div>
      </div>

      {/* Decision Maker & Contact Details */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-indigo-400" />
          Decisores e Contatos Enriquecidos
        </h2>

        {opportunity.company.contacts && opportunity.company.contacts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {opportunity.company.contacts.map((contact: any) => (
              <div
                key={contact.id}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{contact.nome}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {contact.cargo || "Decisor"}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-slate-400">
                    {contact.telefone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{contact.telefone}</span>
                        {contact.whatsappStatus === "VERIFIED" && (
                          <span className="text-[10px] font-bold text-emerald-400">WhatsApp ✓</span>
                        )}
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{contact.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs">
            Nenhum contato individual cadastrado.
          </div>
        )}
      </div>
    </div>
  );
}
