"use client";

import { useState } from "react";
import { Building2, Search, Upload, Download, Filter } from "lucide-react";
import { formatCNPJ, formatCurrency } from "@/lib/utils";

const MOCK_COMPANIES = [
  {
    id: "comp-1",
    cnpj: "00000001000191",
    razaoSocial: "Bella Pasta Cantina & Pizzaria Fictícia Ltda",
    nomeFantasia: "Cantina Bella Pasta",
    dataAbertura: "29/08/2026",
    porte: "ME",
    capitalSocial: 85000,
    cnaePrincipal: "56.11-2-01 - Restaurantes e similares",
    municipio: "Bauru",
    uf: "SP",
    telefone: "(14) 99876-5432",
    email: "contato@bellapastaficticia.com.br",
    situacao: "ATIVA",
  },
  {
    id: "comp-2",
    cnpj: "00000002000172",
    razaoSocial: "TechVortex Soluções de TI Fictícia Ltda",
    nomeFantasia: "TechVortex",
    dataAbertura: "30/08/2026",
    porte: "ME",
    capitalSocial: 50000,
    cnaePrincipal: "62.01-5-01 - Desenvolvimento de Software",
    municipio: "São Paulo",
    uf: "SP",
    telefone: "(11) 98765-4321",
    email: "admin@techvortexficticia.com.br",
    situacao: "ATIVA",
  },
  {
    id: "comp-3",
    cnpj: "00000003000153",
    razaoSocial: "Sabor & Brasa Churrascaria Fictícia ME",
    nomeFantasia: "Churrascaria Sabor & Brasa",
    dataAbertura: "31/08/2026",
    porte: "ME",
    capitalSocial: 120000,
    cnaePrincipal: "56.11-2-01 - Restaurantes e similares",
    municipio: "Ribeirão Preto",
    uf: "SP",
    telefone: "(16) 99765-4321",
    email: "financeiro@saborebrasaficticia.com.br",
    situacao: "ATIVA",
  },
];

export default function CompaniesPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = MOCK_COMPANIES.filter(
    (c) =>
      c.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpj.includes(searchTerm) ||
      c.municipio.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-400" />
            Base de Empresas Descobertas
          </h1>
          <p className="text-sm text-slate-400">
            Registro unificado de empresas recém-abertas e dados cadastrais ingeridos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all">
            <Upload className="w-4 h-4 text-slate-400" />
            Importar CSV
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Buscar empresa por razão social, CNPJ ou cidade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Empresa / CNPJ</th>
                <th className="px-5 py-3.5">CNAE Principal</th>
                <th className="px-5 py-3.5">Localização</th>
                <th className="px-5 py-3.5">Abertura</th>
                <th className="px-5 py-3.5">Capital Social</th>
                <th className="px-5 py-3.5">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.map((company) => (
                <tr key={company.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-white">{company.razaoSocial}</div>
                    <div className="text-slate-500 font-mono text-[11px] mt-0.5">{formatCNPJ(company.cnpj)}</div>
                  </td>
                  <td className="px-5 py-4 max-w-xs truncate text-slate-400">
                    {company.cnaePrincipal}
                  </td>
                  <td className="px-5 py-4">
                    {company.municipio}/{company.uf}
                  </td>
                  <td className="px-5 py-4 text-slate-400">
                    {company.dataAbertura}
                  </td>
                  <td className="px-5 py-4 font-mono text-slate-200">
                    {formatCurrency(company.capitalSocial)}
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {company.situacao}
                    </span>
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
