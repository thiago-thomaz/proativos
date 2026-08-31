"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Check, Target, Building2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // 9 questions state
  const [formData, setFormData] = useState({
    whatYouSell: "Software de Gestão ERP para Restaurantes",
    targetClientType: "Bares, Restaurantes e Cafeterias",
    segments: "Alimentação fora do lar",
    cities: "São Paulo, Campinas e Bauru",
    states: "SP",
    companySize: "ME e EPP",
    recencyDays: "15",
    channel: "WhatsApp & E-mail",
    monthlyVolume: "100 a 300",
  });

  const nextStep = () => {
    if (step < 9) {
      setStep(step + 1);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 space-y-8">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-400">
          <span className="font-semibold text-indigo-400">Passo {step} de 9 — Onboarding Guiado</span>
          <span>{Math.round((step / 9) * 100)}% concluído</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-300"
            style={{ width: `${(step / 9) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">1. O que sua empresa vende?</h2>
            <p className="text-xs text-slate-400">Descreva seu produto ou serviço principal.</p>
            <input
              type="text"
              value={formData.whatYouSell}
              onChange={(e) => setFormData({ ...formData, whatYouSell: e.target.value })}
              className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">2. Qual tipo de cliente procura?</h2>
            <p className="text-xs text-slate-400">Ex: Donos de restaurantes, empresas de logística, softwares houses...</p>
            <input
              type="text"
              value={formData.targetClientType}
              onChange={(e) => setFormData({ ...formData, targetClientType: e.target.value })}
              className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">3. Quais segmentos e setores?</h2>
            <input
              type="text"
              value={formData.segments}
              onChange={(e) => setFormData({ ...formData, segments: e.target.value })}
              className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">4. Quais cidades prioritárias?</h2>
            <input
              type="text"
              value={formData.cities}
              onChange={(e) => setFormData({ ...formData, cities: e.target.value })}
              className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">5. Quais estados (UFs)?</h2>
            <input
              type="text"
              value={formData.states}
              onChange={(e) => setFormData({ ...formData, states: e.target.value })}
              className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">6. Qual porte de empresa?</h2>
            <div className="grid grid-cols-3 gap-3">
              {["MEI", "Microempresa (ME)", "EPP"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormData({ ...formData, companySize: p })}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    formData.companySize.includes(p)
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">7. Quanto tempo após abertura deseja encontrar a empresa?</h2>
            <div className="grid grid-cols-3 gap-3">
              {["3 dias", "7 dias", "15 dias", "30 dias", "60 dias", "90 dias"].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFormData({ ...formData, recencyDays: d.replace(/\D/g, "") })}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    formData.recencyDays === d.replace(/\D/g, "")
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">8. Qual canal principal deseja usar?</h2>
            <div className="grid grid-cols-2 gap-3">
              {["WhatsApp Oficial", "E-mail Institucional"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormData({ ...formData, channel: c })}
                  className={`p-4 rounded-xl border text-xs font-bold transition-all ${
                    formData.channel.includes(c)
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 9 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">9. Qual volume aproximado de leads por mês?</h2>
            <div className="grid grid-cols-3 gap-3">
              {["50 a 100", "100 a 300", "500+"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFormData({ ...formData, monthlyVolume: v })}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    formData.monthlyVolume === v
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  {v} leads/mês
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-slate-800">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white disabled:opacity-30"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={nextStep}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow transition-all"
          >
            {step === 9 ? "Gerar Campanha Sugerida & Entrar" : "Próximo Passo"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
