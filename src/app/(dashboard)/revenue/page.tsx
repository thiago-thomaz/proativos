"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  DollarSign,
  PieChart,
  BarChart3,
  Users,
  Target,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function RevenuePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/revenue/analytics")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const roi = data?.roi || {};
  const pipeline = data?.pipeline || {};
  const attribution = data?.attribution || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Executive Revenue & Unit Economics
          </h1>
          <p className="text-xs text-slate-400">
            Métricas financeiras determinísticas, Atribuição Multi-Touch e Retorno sobre Investimento (ROI).
          </p>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              Receita Total Fechada
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-400">
              R$ {(roi.totalRevenue || 0).toLocaleString("pt-BR")}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Vendas confirmadas no CRM</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              ROI da Operação
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-indigo-400">
              {(roi.roiPercentage || 0).toFixed(1)}%
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Lucro Líquido / Custo Total</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              CAC (Custo de Aquisição)
              <Users className="w-4 h-4 text-cyan-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-cyan-400">
              R$ {(roi.cac || 0).toFixed(2)}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Custo médio por cliente ganho</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              LTV Projetado (12m)
              <Target className="w-4 h-4 text-amber-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-amber-400">
              R$ {(roi.ltv || 0).toLocaleString("pt-BR")}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Lifetime Value anualizado</p>
          </CardContent>
        </Card>
      </div>

      {/* Attribution & Channels Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Atribuição por Canal */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-400" />
              Atribuição de Receita por Canal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attribution.channels?.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">Sem dados de atribuição ainda.</div>
              ) : (
                attribution.channels?.map((ch: any) => (
                  <div key={ch.channel} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-xs font-medium text-slate-300">{ch.channel}</span>
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-400">R$ {ch.revenue.toLocaleString("pt-BR")}</div>
                      <div className="text-[10px] text-slate-500">{ch.count} conversões</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Unit Economics Detalhado */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Detalhamento de Custos e Eficiência
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
              <span>CPL (Custo por Lead Descoberto)</span>
              <span className="font-semibold text-white">R$ {(roi.cpl || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
              <span>CPQL (Custo por Lead Qualificado)</span>
              <span className="font-semibold text-white">R$ {(roi.cpql || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
              <span>Custo por Reunião Realizada</span>
              <span className="font-semibold text-white">R$ {(roi.costPerMeeting || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
              <span>ROAS (Retorno sobre Gasto em Disparos)</span>
              <span className="font-semibold text-emerald-400">{(roi.roas || 0).toFixed(2)}x</span>
            </div>
            <div className="flex justify-between py-1.5 text-slate-300">
              <span>Lucro Líquido Operacional</span>
              <span className="font-semibold text-emerald-400">R$ {(roi.netProfit || 0).toLocaleString("pt-BR")}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
