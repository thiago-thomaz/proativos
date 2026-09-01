"use client";

import { useEffect, useState } from "react";
import { Contact, Search, UserCheck, Shield, Phone, Mail, RefreshCw } from "lucide-react";
import { formatCNPJ, formatPhone } from "@/lib/utils";

interface ContactItem {
  id: string;
  nome: string;
  cargo: string;
  empresa: string;
  cnpj: string;
  tipo: "DECISOR" | "EMPRESARIAL";
  email?: string | null;
  telefone?: string | null;
  fonte: string;
  statusVerificacao: string;
  optOut: boolean;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"ALL" | "DECISOR" | "EMPRESARIAL">("ALL");
  const [search, setSearch] = useState("");

  const fetchContacts = async () => {
    setLoading(true);
    try {
      let url = "/api/v1/contacts";
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterType === "DECISOR") params.set("decisionMaker", "true");
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.contacts) {
        setContacts(data.contacts);
      }
    } catch (err) {
      console.error("Erro ao carregar contatos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, filterType]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Contact className="w-6 h-6 text-indigo-400" />
            Diretório de Contatos & Decisores
          </h1>
          <p className="text-sm text-slate-400">
            Contatos enriquecidos com validação de canais e conformidade com LGPD / Opt-out.
          </p>
        </div>

        <button
          onClick={fetchContacts}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar Lista
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por Nome do Decisor, Empresa ou Telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              filterType === "ALL"
                ? "bg-indigo-600 text-white"
                : "bg-slate-900 text-slate-400 border border-slate-800"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterType("DECISOR")}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              filterType === "DECISOR"
                ? "bg-indigo-600 text-white"
                : "bg-slate-900 text-slate-400 border border-slate-800"
            }`}
          >
            Apenas Decisores (QSA)
          </button>
          <button
            onClick={() => setFilterType("EMPRESARIAL")}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              filterType === "EMPRESARIAL"
                ? "bg-indigo-600 text-white"
                : "bg-slate-900 text-slate-400 border border-slate-800"
            }`}
          >
            Contatos Cadastrais
          </button>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Contato / Cargo</th>
              <th className="px-5 py-3.5 font-semibold">Empresa / CNPJ</th>
              <th className="px-5 py-3.5 font-semibold">Tipo</th>
              <th className="px-5 py-3.5 font-semibold">Canais de Contato</th>
              <th className="px-5 py-3.5 font-semibold">Conformidade LGPD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                  Carregando contatos...
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                  Nenhum contato encontrado com os filtros selecionados.
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-white text-sm">{contact.nome}</div>
                    <div className="text-slate-400 text-[11px]">{contact.cargo}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-white font-medium">{contact.empresa}</div>
                    {contact.cnpj && (
                      <div className="text-slate-500 font-mono text-[10px]">{formatCNPJ(contact.cnpj)}</div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        contact.tipo === "DECISOR"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {contact.tipo}
                    </span>
                  </td>
                  <td className="px-5 py-4 space-y-1">
                    {contact.telefone && (
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <Phone className="w-3 h-3" />
                        <span>{formatPhone(contact.telefone)}</span>
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-1.5 text-indigo-300">
                        <Mail className="w-3 h-3" />
                        <span>{contact.email}</span>
                      </div>
                    )}
                    {!contact.telefone && !contact.email && (
                      <span className="text-slate-600 italic">Sem canal direto</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300 font-medium">LGPD Conforme (Opt-In/Safe)</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
