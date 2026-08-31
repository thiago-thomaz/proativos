"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert, Plus, Trash2, Search, Download, Ban } from "lucide-react";
import { formatDate } from "@/lib/utils";

const MOCK_SUPPRESSION = [
  {
    id: "sup-1",
    identifier: "optout-exemplo@dominio.com.br",
    channel: "ALL",
    reason: "Solicitação expressa de descadastro via link de e-mail.",
    source: "USER_REQUEST",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sup-2",
    identifier: "11988887777",
    channel: "WHATSAPP",
    reason: "Resposta 'SAIR' detectada automaticamente via webhook.",
    source: "AUTO_DETECTION",
    createdAt: new Date().toISOString(),
  },
];

export default function PrivacyPage() {
  const [suppressionList, setSuppressionList] = useState(MOCK_SUPPRESSION);
  const [newIdentifier, setNewIdentifier] = useState("");
  const [newReason, setNewReason] = useState("");

  const handleAddManualBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdentifier.trim()) return;

    const newItem = {
      id: `sup-${Date.now()}`,
      identifier: newIdentifier.trim(),
      channel: "ALL",
      reason: newReason.trim() || "Bloqueio preventivo manual",
      source: "MANUAL_BLOCK",
      createdAt: new Date().toISOString(),
    };

    setSuppressionList([newItem, ...suppressionList]);
    setNewIdentifier("");
    setNewReason("");
  };

  const removeBlock = (id: string) => {
    setSuppressionList(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          Data & Privacy (Compliance LGPD & Anti-Spam)
        </h1>
        <p className="text-sm text-slate-400">
          Governança de dados, auditoria de finalidade e lista de supressão universal de contatos.
        </p>
      </div>

      {/* LGPD Architecture Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Base Legal B2B</span>
          <p className="text-xs text-slate-300">
            Contatos institucionais baseados em <strong>Legítimo Interesse</strong> estrito com oferta contextualizada e canal de descadastro direto.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Supressão Imediata</span>
          <p className="text-xs text-slate-300">
            Qualquer solicitação de opt-out (e-mail ou WhatsApp) é registrada em tempo real e bloqueia novos envios para todas as campanhas.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Minimização de Dados</span>
          <p className="text-xs text-slate-300">
            Armazenamento exclusivo de dados estritamente necessários para a qualificação comercial sem retenção desnecessária.
          </p>
        </div>
      </div>

      {/* Manual Block Form */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <Ban className="w-4 h-4 text-rose-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Adicionar à Lista de Supressão / Bloqueio Manual
          </h2>
        </div>

        <form onSubmit={handleAddManualBlock} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            required
            placeholder="E-mail, Telefone ou CNPJ..."
            value={newIdentifier}
            onChange={(e) => setNewIdentifier(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <input
            type="text"
            placeholder="Motivo do bloqueio..."
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow"
          >
            Bloquear Contato Permanentemente
          </button>
        </form>
      </div>

      {/* Suppression List Table */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Lista de Supressão Universal ({suppressionList.length})
        </h2>

        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Identificador</th>
                <th className="px-4 py-3">Canal</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {suppressionList.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-mono font-medium text-white">{item.identifier}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {item.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{item.reason}</td>
                  <td className="px-4 py-3 text-[11px] text-indigo-400">{item.source}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(item.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => removeBlock(item.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Remover bloqueio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
