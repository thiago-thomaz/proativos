"use client";

import { useEffect, useState } from "react";
import {
  Briefcase,
  Plus,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STAGES = [
  { key: "QUALIFIED", label: "Qualificado", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  { key: "CONTACTED", label: "Contatado", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  { key: "RESPONDED", label: "Respondeu", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" },
  { key: "INTERESTED", label: "Interessado", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  { key: "MEETING", label: "Reunião", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" },
  { key: "PROPOSAL", label: "Proposta", color: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
  { key: "WON", label: "Ganho 🎉", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  { key: "LOST", label: "Perdido", color: "bg-rose-500/10 text-rose-400 border-rose-500/30" },
];

export default function CrmPage() {
  const [pipeline, setPipeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/crm/pipeline")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPipeline(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            CRM Pipeline & Deals
          </h1>
          <p className="text-xs text-slate-400">
            Acompanhe a evolução comercial de cada lead desde o primeiro contato até o fechamento.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            Ganho: R$ {(pipeline?.totalWonValue || 0).toLocaleString("pt-BR")}
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" />
            Pipeline: R$ {(pipeline?.totalPipelineValue || 0).toLocaleString("pt-BR")}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Carregando CRM...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-3 overflow-x-auto pb-4">
          {STAGES.map((s) => {
            const stageData = pipeline?.stages?.[s.key] || { count: 0, totalValue: 0, deals: [] };

            return (
              <div
                key={s.key}
                className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col min-w-[200px]"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${s.color}`}>
                    {s.label}
                  </span>
                  <span className="text-[11px] text-slate-400 font-bold">{stageData.count}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium mb-3">
                  R$ {stageData.totalValue.toLocaleString("pt-BR")}
                </div>

                {/* Deal Cards */}
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[500px]">
                  {stageData.deals.length === 0 ? (
                    <div className="p-4 text-center text-[10px] text-slate-600 border border-dashed border-slate-800/80 rounded-lg">
                      Vazio
                    </div>
                  ) : (
                    stageData.deals.map((deal: any) => (
                      <div
                        key={deal.id}
                        className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-indigo-500/40 transition-all text-left shadow-sm group"
                      >
                        <div className="text-[11px] font-semibold text-white line-clamp-1 group-hover:text-indigo-300">
                          {deal.company?.nomeFantasia || deal.company?.razaoSocial || deal.title}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                          <span className="text-emerald-400 font-semibold">
                            R$ {(deal.actualValue || deal.expectedValue || 0).toLocaleString("pt-BR")}
                          </span>
                          <span className="text-slate-500">{deal.probability}%</span>
                        </div>
                        {deal.nextAction && (
                          <div className="mt-2 text-[9px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-indigo-400" />
                            <span className="truncate">{deal.nextAction}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
