"use client";

import { useEffect, useState } from "react";
import {
  ShoppingBag,
  Flame,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Sparkles,
  Lock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function MarketplacePage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch("/api/v1/marketplace/packages")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPackages(d.packages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleBuy = async (pkg: any) => {
    setBuyingId(pkg.id);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/marketplace/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          text: `🎉 Pacote adquirido com sucesso! ${data.leadsDelivered} leads entregues.`,
          type: "success",
        });
      } else {
        setMessage({ text: data.error || "Falha na aquisição", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-indigo-400" />
            Opportunity Marketplace
          </h1>
          <p className="text-xs text-slate-400">
            Adquira pacotes prontos de oportunidades qualificadas com validação de contatos e garantia de exclusividade.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold border ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Package Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Carregando catálogo do marketplace...</div>
      ) : packages.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
          Nenhum pacote cadastrado no momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="bg-slate-900/60 border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px]">
                    {pkg.segment}
                  </Badge>
                  {pkg.exclusive && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      Exclusivo
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base font-bold text-white mt-2">{pkg.name}</CardTitle>
                <p className="text-xs text-slate-400 mt-1">{pkg.description || `Lote com ${pkg.quantity} empresas nos estados ${pkg.ufs}`}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quantidade:</span>
                    <span className="font-semibold text-white">{pkg.quantity} Leads</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Região:</span>
                    <span className="font-semibold text-white">{pkg.ufs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Score Mínimo:</span>
                    <span className="font-semibold text-emerald-400">{pkg.minScore}+</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Preço</span>
                    <span className="text-lg font-bold text-indigo-400">{pkg.priceCredits} Créditos</span>
                  </div>
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                    disabled={buyingId === pkg.id}
                    onClick={() => handleBuy(pkg)}
                  >
                    {buyingId === pkg.id ? "Processando..." : "Comprar Pacote"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
