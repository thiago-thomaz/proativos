"use client";

import { useState } from "react";
import { FileText, Plus, Variable, Mail, MessageSquare } from "lucide-react";

const TEMPLATES = [
  {
    id: "tpl-1",
    name: "Abordagem Inicial — Restaurantes & Gastronomia",
    channel: "EMAIL",
    subject: "Parabéns pela abertura da {{nome_fantasia}} em {{cidade}}!",
    body: `Olá, {{nome_contato}}! Parabéns pela abertura da {{nome_fantasia}} em {{cidade}}/{{uf}}.

Notamos o registro recente da sua empresa e sabemos que organizar PDV, comandas e estoque logo no primeiro mês é crucial para o sucesso da operação.

Gostaria de conhecer o nosso {{produto}} com condições especiais para inaugurações?

Caso não deseje receber contatos, clique no link de descadastro.`,
  },
  {
    id: "tpl-2",
    name: "Apresentação WhatsApp — Fintech Conta PJ",
    channel: "WHATSAPP",
    subject: null,
    body: `Olá, {{nome_contato}}! Tudo bem? Parabéns pela formalização da {{nome_empresa}} em {{cidade}}.

Somos parceiros de novos negócios e gostaríamos de apresentar uma condição exclusiva de conta digital PJ sem taxas e cartão corporativo para os primeiros meses da sua operação.

Podemos enviar uma apresentação rápida por aqui?

(Responda 'SAIR' a qualquer momento para cancelar novas mensagens)`,
  },
];

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-400" />
            Templates de Mensagens & Variáveis
          </h1>
          <p className="text-sm text-slate-400">
            Mensagens dinâmicas com variáveis cadastrais e opt-out automático.
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow transition-all">
          <Plus className="w-4 h-4" />
          Novo Template
        </button>
      </div>

      {/* Variables helper banner */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
        <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Variable className="w-4 h-4 text-indigo-400" />
          Variáveis Disponíveis para Personalização
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-mono">
          {["{{nome_empresa}}", "{{nome_fantasia}}", "{{cidade}}", "{{uf}}", "{{segmento}}", "{{data_abertura}}", "{{produto}}", "{{nome_contato}}"].map((v) => (
            <span key={v} className="px-2 py-1 rounded-md bg-slate-950 border border-slate-800 text-indigo-300">
              {v}
            </span>
          ))}
        </div>
      </div>

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATES.map((tpl) => (
          <div key={tpl.id} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{tpl.name}</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                {tpl.channel === "EMAIL" ? <Mail className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                {tpl.channel}
              </span>
            </div>

            {tpl.subject && (
              <div className="text-xs text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-500 font-semibold">Assunto:</span> {tpl.subject}
              </div>
            )}

            <div className="text-xs text-slate-300 whitespace-pre-line bg-slate-950/40 p-3 rounded-lg border border-slate-800 font-mono text-[11px] leading-relaxed">
              {tpl.body}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
