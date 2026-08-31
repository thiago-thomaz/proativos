"use client";

import { useEffect, useState } from "react";
import { Split, Plus, CheckCircle2, TrendingUp, BarChart2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/experiments")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setExperiments(d.experiments);
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
            <Split className="w-5 h-5 text-indigo-400" />
            Testes A/B & Experimentação
          </h1>
          <p className="text-xs text-slate-400">
            Compare o desempenho de mensagens, assuntos, canais e cadências com significância estatística.
          </p>
        </div>
      </div>

      {/* Experiments List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Carregando experimentos...</div>
      ) : experiments.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
          Nenhum experimento A/B criado ainda.
        </div>
      ) : (
        <div className="space-y-4">
          {experiments.map((exp) => (
            <Card key={exp.id} className="bg-slate-900/60 border-slate-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px]">
                      {exp.type}
                    </Badge>
                    <CardTitle className="text-sm font-bold text-white">{exp.name}</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {exp.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {exp.variants?.map((v: any) => {
                    const convRate = v.delivered > 0 ? ((v.positiveResponses / v.delivered) * 100).toFixed(1) : "0.0";
                    const isWinner = exp.winnerVariantId === v.id;

                    return (
                      <div
                        key={v.id}
                        className={`p-3 rounded-lg border text-xs ${
                          isWinner
                            ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
                            : "bg-slate-950/60 border-slate-850 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold">{v.name}</span>
                          {isWinner && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px]">
                              Vencedor 🏆
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-[11px] text-slate-400">
                          <div className="flex justify-between">
                            <span>Disparados:</span>
                            <span className="text-white font-medium">{v.delivered}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Respostas Positivas:</span>
                            <span className="text-white font-medium">{v.positiveResponses}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Taxa de Conversão:</span>
                            <span className="text-emerald-400 font-bold">{convRate}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
