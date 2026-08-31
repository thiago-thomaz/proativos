"use client";

import { useState } from "react";
import { Contact, Search, UserCheck, Shield, Phone, Mail } from "lucide-react";

const MOCK_CONTACTS = [
  {
    id: "cont-1",
    nome: "Carlos Eduardo Silva",
    cargo: "Sócio Administrador",
    empresa: "Bella Pasta Cantina & Pizzaria Fictícia Ltda",
    tipo: "DECISOR",
    email: "carlos@bellapastaficticia.com.br",
    telefone: "(14) 99876-5432",
    fonte: "ENRICHMENT_API",
    statusVerificacao: "VALID",
    optOut: false,
  },
  {
    id: "cont-2",
    nome: "Mariana Costa",
    cargo: "Fundadora & CTO",
    empresa: "TechVortex Soluções de TI Fictícia Ltda",
    tipo: "DECISOR",
    email: "mariana@techvortexficticia.com.br",
    telefone: "(11) 98765-4321",
    fonte: "ENRICHMENT_API",
    statusVerificacao: "VALID",
    optOut: false,
  },
  {
    id: "cont-3",
    nome: "Central Administrativa",
    cargo: "Contato Cadastral CNPJ",
    empresa: "Sabor & Brasa Churrascaria Fictícia ME",
    tipo: "EMPRESARIAL",
    email: "financeiro@saborebrasaficticia.com.br",
    telefone: "(16) 99765-4321",
    fonte: "PUBLIC_REGISTRY",
    statusVerificacao: "PENDING",
    optOut: false,
  },
];

export default function ContactsPage() {
  const [filterType, setFilterType] = useState<"ALL" | "DECISOR" | "EMPRESARIAL">("ALL");

  const filtered = MOCK_CONTACTS.filter(
    (c) => filterType === "ALL" || c.tipo === filterType
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Contact className="w-6 h-6 text-indigo-400" />
          Diretório de Contatos & Decisores
        </h1>
        <p className="text-sm text-slate-400">
          Diferenciação clara entre contatos institucionais do registro e decisores mapeados via enriquecimento.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterType("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterType === "ALL"
              ? "bg-indigo-600 text-white"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          Todos os Contatos
        </button>
        <button
          onClick={() => setFilterType("DECISOR")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterType === "DECISOR"
              ? "bg-indigo-600 text-white"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          Decisores & Sócios ({MOCK_CONTACTS.filter(c => c.tipo === "DECISOR").length})
        </button>
        <button
          onClick={() => setFilterType("EMPRESARIAL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterType === "EMPRESARIAL"
              ? "bg-indigo-600 text-white"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          Contatos Institucionais CNPJ ({MOCK_CONTACTS.filter(c => c.tipo === "EMPRESARIAL").length})
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((contact) => (
          <div
            key={contact.id}
            className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">{contact.nome}</h3>
                  <p className="text-xs text-indigo-400 font-medium">{contact.cargo}</p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    contact.tipo === "DECISOR"
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {contact.tipo}
                </span>
              </div>

              <div className="text-xs text-slate-400 truncate">
                🏢 {contact.empresa}
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>{contact.telefone}</span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>{contact.email}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>Fonte: {contact.fonte}</span>
              <span className="text-emerald-400 font-medium">Verificado</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
