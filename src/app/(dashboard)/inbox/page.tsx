"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Inbox,
  MessageSquare,
  Mail,
  Phone,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  RefreshCw,
} from "lucide-react";
import { formatCNPJ } from "@/lib/utils";

interface InboundMsgItem {
  id: string;
  fromIdentifier: string;
  channel: string;
  intentClassification: string;
  rawPayload: string;
  receivedAt: string;
  isHandled: boolean;
  lead?: {
    id: string;
    score: number;
    company: {
      razaoSocial: string;
      nomeFantasia?: string | null;
      cnpj: string;
      municipio: string;
      uf: string;
    };
  };
}

export default function InboxPage() {
  const [messages, setMessages] = useState<InboundMsgItem[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  const fetchInbox = async () => {
    setLoading(true);
    try {
      let url = "/api/v1/inbox";
      if (activeFilter !== "ALL") {
        url += `?intent=${activeFilter}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
        setSummary(data.summary || {});
      }
    } catch (err) {
      console.error("Erro ao carregar inbox:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [activeFilter]);

  const getIntentBadge = (intent: string) => {
    switch (intent) {
      case "MEETING_REQUEST":
        return { label: "Agendamento de Reunião", bg: "bg-purple-500/20 text-purple-300 border-purple-500/30" };
      case "PRICE_REQUEST":
        return { label: "Cotação / Preço", bg: "bg-blue-500/20 text-blue-300 border-blue-500/30" };
      case "INTERESTED":
        return { label: "Interesse Confirmado", bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
      case "OPT_OUT":
        return { label: "Opt-Out (Parar)", bg: "bg-rose-500/20 text-rose-300 border-rose-500/30" };
      default:
        return { label: "Dúvida / Geral", bg: "bg-slate-500/20 text-slate-300 border-slate-500/30" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Inbox className="w-6 h-6 text-indigo-400" />
            Caixa de Entrada & Respostas Proativas
          </h1>
          <p className="text-sm text-slate-400">
            Respostas recebidas classificadas por intenção pelo motor de inteligência conversacional.
          </p>
        </div>

        <button
          onClick={fetchInbox}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar Mensagens
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: "ALL", label: "Todas", count: summary.total || 0 },
          { id: "MEETING_REQUEST", label: "Reuniões Solicitadas", count: summary.meetings || 0 },
          { id: "INTERESTED", label: "Interessados", count: summary.interested || 0 },
          { id: "PRICE_REQUEST", label: "Preço & Condições", count: summary.priceRequests || 0 },
          { id: "OPT_OUT", label: "Opt-Outs", count: summary.optOuts || 0 },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
              activeFilter === f.id
                ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <span>{f.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                activeFilter === f.id ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Carregando mensagens da caixa de entrada...</div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
            Nenhuma mensagem recebida para este filtro.
          </div>
        ) : (
          messages.map((msg) => {
            const badge = getIntentBadge(msg.intentClassification);
            let messageText = msg.rawPayload;
            try {
              const parsed = JSON.parse(msg.rawPayload);
              if (parsed.body || parsed.text) messageText = parsed.body || parsed.text;
            } catch {}

            return (
              <div
                key={msg.id}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-slate-700/80 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
                      {msg.channel === "WHATSAPP" ? (
                        <Phone className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Mail className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {msg.lead?.company?.razaoSocial || msg.fromIdentifier}
                        </span>
                        {msg.lead?.company?.cnpj && (
                          <span className="text-[11px] text-slate-500 font-mono">
                            {formatCNPJ(msg.lead.company.cnpj)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {msg.fromIdentifier} • {msg.lead?.company?.municipio}/{msg.lead?.company?.uf}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">
                      {new Date(msg.receivedAt).toLocaleString("pt-BR")}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-lg border text-xs font-bold ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>

                {/* Message Body Box */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-200 leading-relaxed">
                  &quot;{messageText}&quot;
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400">
                    Lead Score: <strong className="text-emerald-400">{msg.lead?.score || 85}%</strong>
                  </span>

                  {msg.lead?.id && (
                    <Link
                      href={`/leads/${msg.lead.id}`}
                      className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Acessar Lead no Pipeline
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
