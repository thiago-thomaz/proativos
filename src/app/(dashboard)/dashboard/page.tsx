import Link from "next/link";
import {
  Building2,
  Users2,
  PhoneCall,
  MessageSquareReply,
  CalendarCheck,
  Award,
  TrendingUp,
  DollarSign,
  ShieldBan,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  Filter,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { formatCNPJ, formatCurrency, getScoreBadge } from "@/lib/utils";

// Mock de métricas e feed da FASE 1 (integrará dinamicamente com Prisma)
const KPIS = [
  {
    label: "Novas Empresas Detectadas",
    value: "1.284",
    subtext: "+148 hoje na base",
    icon: Building2,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    label: "Leads Qualificados (ICP)",
    value: "342",
    subtext: "26.6% aderência",
    icon: Users2,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/20",
  },
  {
    label: "Leads Contatados",
    value: "186",
    subtext: "Dentro dos limites",
    icon: PhoneCall,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
  },
  {
    label: "Respostas Recebidas",
    value: "38",
    subtext: "20.4% taxa de resposta",
    icon: MessageSquareReply,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    label: "Reuniões Agendadas",
    value: "14",
    subtext: "7.5% de conversão",
    icon: CalendarCheck,
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
  {
    label: "Vendas / Conversões",
    value: "6",
    subtext: "Ticket Médio R$ 2.400",
    icon: Award,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    label: "Receita Atribuída",
    value: "R$ 14.400",
    subtext: "Pipeline proativo",
    icon: DollarSign,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    label: "ROI Calculado",
    value: "8.2x",
    subtext: "Custo por Lead: R$ 3,12",
    icon: TrendingUp,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/20",
  },
];

const RECENT_OPPORTUNITIES = [
  {
    id: "lead-1",
    razaoSocial: "Bella Pasta Cantina & Pizzaria Ltda",
    nomeFantasia: "Cantina Bella Pasta",
    cnpj: "48123456000189",
    municipio: "Bauru",
    uf: "SP",
    cnae: "56.11-2-01 - Restaurantes e similares",
    dataAbertura: "Há 2 dias",
    score: 94,
    reasons: ["CNAE ideal para ERP", "Aberta há 48h", "Cidade polo de SP", "Telefone empresarial verificado"],
    canal: "WhatsApp & E-mail",
    status: "READY_TO_CONTACT",
  },
  {
    id: "lead-2",
    razaoSocial: "TechVortex Soluções Digitais Ltda",
    nomeFantasia: "TechVortex",
    cnpj: "49876543000121",
    municipio: "Campinas",
    uf: "SP",
    cnae: "62.01-5-01 - Desenvolvimento de programas de computador sob encomenda",
    dataAbertura: "Há 1 dia",
    score: 91,
    reasons: ["Segmento Software/TI", "Capital Social R$ 50.000", "Contato de decisor disponível"],
    canal: "E-mail Oficial",
    status: "QUALIFIED",
  },
  {
    id: "lead-3",
    razaoSocial: "Sabor & Brasa Churrascaria Eireli",
    nomeFantasia: "Churrascaria Sabor & Brasa",
    cnpj: "50112233000144",
    municipio: "Ribeirão Preto",
    uf: "SP",
    cnae: "56.11-2-01 - Restaurantes e similares",
    dataAbertura: "Hoje",
    score: 88,
    reasons: ["Abertura hoje", "CNAE primário prioritário", "Região de alto faturamento"],
    canal: "WhatsApp Cloud",
    status: "NEW",
  },
  {
    id: "lead-4",
    razaoSocial: "InovaLog Transportes & Logística Ltda",
    nomeFantasia: "InovaLog",
    cnpj: "51334455000167",
    municipio: "São Paulo",
    uf: "SP",
    cnae: "49.30-2-02 - Transporte rodoviário de carga",
    dataAbertura: "Há 3 dias",
    score: 82,
    reasons: ["CNAE de Logística", "Porte EPP", "Localização na Capital"],
    canal: "E-mail",
    status: "CONTACTED",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900/90 border border-indigo-900/40 shadow-xl relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Engine Conectado & Operante
            </span>
            <span className="text-xs text-slate-400">Última sincronização: Há 4 min</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Dashboard de Prospecção Proativa
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Detectando empresas no momento de registro cadastral no Brasil e transformando em oportunidades comerciais qualificadas.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Link
            href="/campaigns/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            Nova Campanha ICP
          </Link>
          <Link
            href="/leads"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all"
          >
            Ver Pipeline
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Métricas Comerciais & Conversão
          </h2>
          <span className="text-xs text-slate-500">Filtrando últimos 30 dias</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KPIS.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <div
                key={index}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400">{kpi.label}</span>
                  <div className={`p-2 rounded-xl border ${kpi.bg}`}>
                    <Icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white tracking-tight">{kpi.value}</div>
                <div className="text-xs text-slate-400 mt-1">{kpi.subtext}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Split: Live Opportunity Feed & Active Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Feed "Novas Oportunidades" */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-semibold text-white">
                Novas Oportunidades em Tempo Real
              </h2>
            </div>
            <Link
              href="/leads"
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              Ver todos os leads
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {RECENT_OPPORTUNITIES.map((item) => {
              const badge = getScoreBadge(item.score);
              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-indigo-500/40 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{item.razaoSocial}</h3>
                        <span className="text-xs text-slate-400 font-mono">
                          {formatCNPJ(item.cnpj)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.cnae} • <span className="text-slate-300 font-medium">{item.municipio}/{item.uf}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">{item.dataAbertura}</span>
                      <div
                        className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${badge.bg}`}
                      >
                        <span>Match ICP {item.score}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Why this lead? (Lead Explanation) */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/60">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                      Por que este lead? (Motivos do Match)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.reasons.map((reason, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-950/50 text-indigo-300 border border-indigo-900/60"
                        >
                          ✓ {reason}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Canal de contato: <strong className="text-slate-300">{item.canal}</strong>
                    </span>
                    <Link
                      href={`/leads/${item.id}`}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                    >
                      Ver Detalhes do Lead
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Quick Campaign Status & Simulators */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-400" />
              Campanhas Ativas no Motor
            </h3>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Restaurantes SP (Últimos 7 dias)</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    SIMULAÇÃO
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Oferta: ERP de Gestão para Bares & Restaurantes
                </div>
                <div className="flex justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
                  <span>Score Mín: 75%</span>
                  <span className="text-indigo-400 font-medium">142 leads gerados</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Fintech Conta PJ (Novos MEIs & MEs)</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    LIVE
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Oferta: Abertura de Conta Digital PJ sem taxas
                </div>
                <div className="flex justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
                  <span>Score Mín: 80%</span>
                  <span className="text-indigo-400 font-medium">89 contatados</span>
                </div>
              </div>
            </div>

            <Link
              href="/campaigns"
              className="block text-center py-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 border border-indigo-900/50 hover:border-indigo-700/50 rounded-xl transition-colors"
            >
              Gerenciar Todas as Campanhas
            </Link>
          </div>

          {/* Compliance & LGPD Status */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Compliance & Anti-Spam
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Motor de validação em 9 etapas ativo. Nenhuma mensagem é disparada sem verificação de opt-out, situação cadastral e fit de ICP.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 text-center">
              <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                <div className="text-xs font-bold text-white">0%</div>
                <div className="text-[10px] text-slate-400">Bounces</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                <div className="text-xs font-bold text-emerald-400">100%</div>
                <div className="text-[10px] text-slate-400">Opt-Out Safe</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
