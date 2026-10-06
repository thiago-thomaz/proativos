"use client";

import { useState } from "react";
import { PlugZap, Key, CheckCircle2, Shield, Eye, EyeOff, Copy, Cpu, Clock, RefreshCw } from "lucide-react";

export default function IntegrationsPage() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const internalApiKey = "ple_live_sec_88492049182390192";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(internalApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <PlugZap className="w-6 h-6 text-indigo-400" />
          Automações Nativas & Integrações
        </h1>
        <p className="text-sm text-slate-400">
          Motor 100% autônomo com agendador de jobs integrado, webhooks diretos e chaves de serviço de alta segurança.
        </p>
      </div>

      {/* Autonomous Architecture Status */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Arquitetura Autônoma Internalizada
            </h2>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            ZERO N8N / 100% NATIVO
          </span>
        </div>
        <p className="text-xs text-slate-300">
          Todos os 26 fluxos de automação (descoberta, enriquecimento, scoring ICP, réguas comerciais, disparos multicanal, reconciliação e healthchecks) rodam nativamente dentro do código da aplicação sem dependência de serviços externos.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[11px] text-slate-400">Jobs Nativos</span>
            <div className="text-lg font-bold text-white mt-0.5">26 Módulos</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[11px] text-slate-400">Scheduler</span>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">Ativo (Next.js)</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[11px] text-slate-400">Deploy Coolify</span>
            <div className="text-lg font-bold text-indigo-400 mt-0.5">Zero-Downtime</div>
          </div>
        </div>
      </div>

      {/* Internal API Key */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Chave Interna de API (Automation Service Token)
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Utilize esta chave para chamadas diretas de controle e automações via API REST com assinatura HMAC-SHA256.
        </p>

        <div className="flex items-center gap-2">
          <input
            type={showApiKey ? "text" : "password"}
            readOnly
            value={internalApiKey}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 font-mono text-xs text-indigo-300 border border-slate-800 focus:outline-none"
          />
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={copyToClipboard}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-all flex items-center gap-1.5"
          >
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado!" : "Copiar Chave"}
          </button>
        </div>
      </div>

      {/* Connected Channels & Providers */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
          Canais e Provedores Nativos
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">WhatsApp Cloud API (Oficial)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ATIVO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Integração via Graph API oficial da Meta com suporte a templates e webhooks diretos de resposta.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Email Provider (Resend / SES)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ATIVO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Envio transacional nativo com controle de bounce, abertura e link universal de opt-out.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
