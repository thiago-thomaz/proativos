"use client";

import { useState } from "react";
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
} from "lucide-react";
import { formatCNPJ } from "@/lib/utils";

interface InboundMsgItem {
  id: string;
  fromIdentifier: string;
  channel: "EMAIL" | "WHATSAPP";
  intent: "INTERESTED" | "MEETING_REQUEST" | "PRICE_REQUEST" | "OPT_OUT" | "QUESTION";
  body: string;
  receivedAt: string;
  isHandled: boolean;
  companyName: string;
  cnpj: string;
  location: string;
  leadId: string;
  priorityScore: number;
}

export default function InboxPage() {
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  const sampleMessages: InboundMsgItem[] = [
    {
      id: "in-1",
      fromIdentifier: "(14) 99876-5432",
      channel: "WHATSAPP",
      intent: "MEETING_REQUEST",
      body: "Olá! Recebi sua mensagem. Gostaria de entender mais como funciona o sistema para restaurantes. Podemos fazer uma demonstração amanhã às 14h?",
      receivedAt: "Hoje, 14:32",
      isHandled: false,
      companyName: "Bella Pasta Cantina & Pizzaria Ltda",
      cnpj: "00000001000191",
      location: "Bauru/SP",
      leadId: "lead-1",
      priorityScore: 92,
    },
    {
      id: "in-2",
      fromIdentifier: "contato@saborbrasil.com.br",
      channel: "EMAIL",
      intent: "PRICE_REQUEST",
      body: "Boa tarde. Qual o valor da mensalidade do plano básico para delivery?",
      receivedAt: "Hoje, 11:15",
      isHandled: false,
      companyName: "Restaurante Sabor Brasil Ltda",
      cnpj: "00000002000192",
      location: "São Paulo/SP",
      leadId: "lead-2",
      priorityScore: 86,
    },
    {
      id: "in-3",
      fromIdentifier: "11988887777",
      channel: "WHATSAPP",
      intent: "OPT_OUT",
      body: "Favor remover meu número da lista, não tenho interesse.",
      receivedAt: "Ontem, 16:40",
      isHandled: true,
      companyName: "Comércio de Carnes e Derivados ME",
      cnpj: "00000003000193",
      location: "Campinas/SP",
      leadId: "lead-3",
      priorityScore: 65,
    },
  ];

  const filteredMessages = sampleMessages.filter((msg) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "INTERESTED") return msg.intent === "INTERESTED" || msg.intent === "MEETING_REQUEST" || msg.intent === "PRICE_REQUEST";
    if (activeFilter === "MEETINGS") return msg.intent === "MEETING_REQUEST";
    if (activeFilter === "OPT_OUT") return msg.intent === "OPT_OUT";
    return true;
  });

  const getIntentBadge = (intent: string) => {
    switch (intent) {
      case "MEETING_REQUEST":
        return { label: "Pedido de Reunião", bg: "bg-purple-500/20 text-purple-300 border-purple-500/30" };
      case "PRICE_REQUEST":
        return { label: "Pedido de Preço", bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
      case "INTERESTED":
        return { label: "Interessado", bg: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" };
      case "OPT_OUT":
        return { label: "Opt-Out (Suprimido)", bg: "bg-rose-500/20 text-rose-300 border-rose-500/30" };
      default:
        return { label: "Dúvida / Geral", bg: "bg-slate-800 text-slate-300 border-slate-700" };
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Inbox className="w-5 h-5 text-indigo-400" />
            Inbox & Respostas Comerciais
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Respostas recebidas via WhatsApp e E-mail classificadas por intenção de compra em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>2 Oportunidades Quentes Hoje</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: "ALL", label: "Todas as Respostas" },
          { id: "INTERESTED", label: "Interessados & Oportunidades" },
          { id: "MEETINGS", label: "Pedidos de Reunião" },
          { id: "OPT_OUT", label: "Opt-Outs (Descadastros)" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              activeFilter === tab.id
                ? "bg-indigo-600 border-indigo-500 text-white shadow"
                : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div className="space-y-3">
        {filteredMessages.map((msg) => {
          const intentBadge = getIntentBadge(msg.intent);
          return (
            <div
              key={msg.id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center border border-slate-800">
                    {msg.channel === "WHATSAPP" ? (
                      <Phone className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Mail className="w-4 h-4 text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{msg.companyName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${intentBadge.bg}`}>
                        {intentBadge.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      CNPJ: {formatCNPJ(msg.cnpj)} • {msg.location} • Canal: {msg.channel} ({msg.fromIdentifier})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500 font-mono">{msg.receivedAt}</span>
                  <div className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold">
                    Prioridade: {msg.priorityScore}
                  </div>
                </div>
              </div>

              {/* Message Body Box */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans">
                &ldquo;{msg.body}&rdquo;
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-[11px] text-slate-500">
                  {msg.isHandled ? "✓ Atendido por vendedor" : "Aguardando ação comercial (Human Handoff)"}
                </span>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/leads/${msg.leadId}`}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <span>Ver Lead & Histórico</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>

                  {msg.intent !== "OPT_OUT" && (
                    <button
                      onClick={() => alert(`Assumindo oportunidade de ${msg.companyName}. O lead foi movido para seu pipeline!`)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Assumir Lead (Vendedor)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
