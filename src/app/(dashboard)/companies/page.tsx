"use client";

import { useEffect, useState } from "react";
import { Building2, Search, Filter, Phone, Mail, MapPin, Calendar, RefreshCw } from "lucide-react";
import { formatCNPJ, formatPhone } from "@/lib/utils";

interface Company {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  dataAbertura: string;
  situacao: string;
  porte?: string | null;
  cnaePrincipal: string;
  municipio: string;
  uf: string;
  telefone?: string | null;
  email?: string | null;
  fonte?: string | null;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ufFilter, setUfFilter] = useState("TODOS");

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      let url = "/api/v1/companies?limit=100";
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (ufFilter !== "TODOS") url += `&uf=${encodeURIComponent(ufFilter)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.companies) {
        setCompanies(data.companies);
      }
    } catch (err) {
      console.error("Erro ao carregar empresas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCompanies();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search, ufFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-400" />
            Empresas Ingeridas na Base
          </h1>
          <p className="text-sm text-slate-400">
            Base de dados cadastrais oficiais e atualizados via Data Ingestion Engine.
          </p>
        </div>

        <button
          onClick={fetchCompanies}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar Lista
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por Razão Social, Nome Fantasia ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={ufFilter}
            onChange={(e) => setUfFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="TODOS">Todos os Estados (UF)</option>
            <option value="SP">São Paulo (SP)</option>
            <option value="RJ">Rio de Janeiro (RJ)</option>
            <option value="MG">Minas Gerais (MG)</option>
            <option value="PR">Paraná (PR)</option>
            <option value="SC">Santa Catarina (SC)</option>
            <option value="RS">Rio Grande do Sul (RS)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Empresa / CNPJ</th>
                <th className="px-5 py-3.5 font-semibold">CNAE Principal</th>
                <th className="px-5 py-3.5 font-semibold">Localização</th>
                <th className="px-5 py-3.5 font-semibold">Abertura</th>
                <th className="px-5 py-3.5 font-semibold">Porte / Status</th>
                <th className="px-5 py-3.5 font-semibold">Canais Cadastrais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    Buscando empresas na base de dados...
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    Nenhuma empresa encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white text-sm">{company.razaoSocial}</div>
                      {company.nomeFantasia && (
                        <div className="text-slate-400 text-[11px]">{company.nomeFantasia}</div>
                      )}
                      <div className="font-mono text-[11px] text-indigo-300/80 mt-0.5">
                        {formatCNPJ(company.cnpj)}
                      </div>
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <div className="text-slate-300 truncate" title={company.cnaePrincipal}>
                        {company.cnaePrincipal}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 text-slate-200">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{company.municipio}/{company.uf}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 text-slate-400 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{new Date(company.dataAbertura).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold">
                          {company.porte || "ME"}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                          {company.situacao}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        {company.telefone ? (
                          <div className="flex items-center gap-1 text-[11px] text-slate-300">
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span>{formatPhone(company.telefone)}</span>
                          </div>
                        ) : null}
                        {company.email ? (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Mail className="w-3 h-3 text-indigo-400" />
                            <span className="truncate max-w-[140px]">{company.email}</span>
                          </div>
                        ) : null}
                        {!company.telefone && !company.email && (
                          <span className="text-slate-600 text-[10px] italic">Sem contato direto</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
