"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users2,
  Filter,
  Download,
  Search,
  CheckCircle2,
  Calendar,
  Phone,
  Mail,
  ArrowRight,
  Flame,
} from "lucide-react";
import { formatCNPJ, getScoreBadge, getStatusBadge } from "@/lib/utils";

const PIPELINE_STAGES = [
  { id: "NEW", label: "Novos Detectados", count: 12 },
  { id: "QUALIFIED", label: "Qualificados (ICP)", count: 24 },
  { id: "READY_TO_CONTACT", label: "Pronto p/ Contato", count: 8 },
  { id: "CONTACTED", label: "Contatados", count: 18 },
  { id: "RESPONDED", label: "Respostas", count: 6 },
  { id: "MEETING", label: "Reunião Agendada", count: 4 },
  { id: "CONVERTED", label: "Convertidos / Ganho", count: 3 },
];

const MOCK_LEADS = [
  {
    id: "lead-1",
    razaoSocial: "Bella Pasta Cantina & Pizzaria Ltda",
    nomeFantasia: "Cantina Bella Pasta",
    cnpj: "00000001000191",
    cnae: "56.11-2-01 - Restaurantes e similares",
    municipio: "Bauru",
    uf: "SP",
    score: 94,
    status: "READY_TO_CONTACT",
    firstDetectedAt: "Há 2 dias",
    contactName: "Carlos Eduardo Silva",
    contactRole: "Sócio Administrador",
    phone: "(14) 99876-5432",
    email: "carlos@bellapastaficticia.com.br",
    reasons: ["CNAE Restaurantes", "Aberta há 48h", "Porte ME", "Bauru/SP"],
  },
  {
    id: "lead-2",
    razaoSocial: "TechVortex Soluções de TI Ltda",
    nomeFantasia: "TechVortex",
    cnpj: "00000002000172",
    cnae: "62.01-5-01 - Desenvolvimento de Software",
    municipio: "São Paulo",
    uf: "SP",
    score: 91,
    status: "CONTACTED",
    firstDetectedAt: "Há 1 dia",
    contactName: "Mariana Costa",
    contactRole: "Fundadora & CTO",
    phone: "(11) 98765-4321",
    email: "mariana@techvortexficticia.com.br",
    reasons: ["Segmento TI", "São Paulo/SP", "Decisor Verificado"],
  },
  {
    id: "lead-3",
    razaoSocial: "Sabor & Brasa Churrascaria ME",
    nomeFantasia: "Churrascaria Sabor & Brasa",
    cnpj: "00000003000153",
    cnae: "56.11-2-01 - Restaurantes e similares",
    municipio: "Ribeirão Preto",
    uf: "SP",
    score: 88,
    status: "NEW",
    firstDetectedAt: "Hoje",
    contactName: "Contato Institucional",
    contactRole: "Registro CNPJ",
    phone: "(16) 99765-4321",
    email: "financeiro@saborebrasaficticia.com.br",
    reasons: ["Aberta hoje", "CNAE primário", "Ribeirão Preto/SP"],
  },
];

export default function LeadsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [leads, setLeads] = useState(MOCK_LEADS);

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.cnpj.includes(searchTerm) ||
      lead.municipio.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "ALL" || lead.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    const headers = ["CNPJ", "Razao Social", "Nome Fantasia", "Municipio", "UF", "Score", "Status", "Contato", "Email", "Telefone"];
    const rows = filteredLeads.map(l => [
      formatCNPJ(l.cnpj),
      l.razaoSocial,
      l.nomeFantasia,
      l.municipio,
      l.uf,
      l.score,
      l.status,
      l.contactName,
      l.email,
      l.phone,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leads_proativos_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users2 className="w-6 h-6 text-indigo-400" />
            CRM Pipeline de Leads
          </h1>
          <p className="text-sm text-slate-400">
            Gerencie oportunidades qualificadas pelo motor em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all shadow"
          >
            <Download className="w-4 h-4 text-slate-400" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Pipeline Stage Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedStatus("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors ${
            selectedStatus === "ALL"
              ? "bg-indigo-600 text-white"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          Todos ({leads.length})
        </button>
        {PIPELINE_STAGES.map((stage) => {
          const isSelected = selectedStatus === stage.id;
          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStatus(stage.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors flex items-center gap-1.5 ${
                isSelected
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>{stage.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-indigo-800 text-indigo-100" : "bg-slate-800 text-slate-400"}`}>
                {stage.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por razão social, CNPJ ou município..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Leads Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLeads.map((lead) => {
          const scoreBadge = getScoreBadge(lead.score);
          const statusBadge = getStatusBadge(lead.status);

          return (
            <div
              key={lead.id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white line-clamp-1">
                      {lead.nomeFantasia || lead.razaoSocial}
                    </h3>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      {formatCNPJ(lead.cnpj)}
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.bg}`}>
                    {statusBadge.label}
                  </span>
                </div>

                {/* Info */}
                <div className="text-xs text-slate-400 space-y-1">
                  <div>
                    📍 <strong className="text-slate-300">{lead.municipio}/{lead.uf}</strong> • {lead.firstDetectedAt}
                  </div>
                  <div className="line-clamp-1 text-[11px] text-slate-500">
                    {lead.cnae}
                  </div>
                </div>

                {/* Score & Reasons */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      ICP Score: {lead.score}%
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${scoreBadge.bg}`}>
                      {scoreBadge.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {lead.reasons.map((r, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950/40 text-indigo-300 border border-indigo-900/50"
                      >
                        ✓ {r}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Contact info if available */}
                <div className="pt-1 space-y-1 text-xs text-slate-400">
                  <div className="font-medium text-slate-200">{lead.contactName} ({lead.contactRole})</div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-500" /> {lead.phone}</span>
                    <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3 text-slate-500" /> {lead.email}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-800/80">
                <Link
                  href={`/leads/${lead.id}`}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-semibold transition-all border border-slate-700/80 hover:border-indigo-500"
                >
                  Abrir Detalhes & Timeline
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
