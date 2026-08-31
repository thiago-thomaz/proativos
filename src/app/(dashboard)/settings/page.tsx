"use client";

import { useState } from "react";
import { Settings, Users, Shield, Lock, Check } from "lucide-react";

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("Acme Tecnologia & Vendas B2B");
  const [slug, setSlug] = useState("acme-corp");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-400" />
          Configurações da Organização & Equipe
        </h1>
        <p className="text-sm text-slate-400">
          Gerenciamento multi-tenant, controle de acesso baseado em papéis (RBAC) e segurança.
        </p>
      </div>

      <form onSubmit={handleSave} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
          Dados da Organização
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nome da Empresa / Organização
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Identificador Único (Slug)
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center gap-1.5"
          >
            {saved ? <Check className="w-4 h-4" /> : null}
            {saved ? "Alterações Salvas!" : "Salvar Configurações"}
          </button>
        </div>
      </form>

      {/* Team Members & Roles (RBAC) */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            Membros da Equipe & Permissões (RBAC)
          </h2>
          <button className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold">
            + Convidar Usuário
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Nome / Usuário</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Papel (Role)</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="px-4 py-3 font-semibold text-white">Thiago Thomaz</td>
                <td className="px-4 py-3 text-slate-400">thiago@acmecorp.com.br</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    OWNER
                  </span>
                </td>
                <td className="px-4 py-3 text-emerald-400">Ativo</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-white">Equipe Comercial</td>
                <td className="px-4 py-3 text-slate-400">comercial@acmecorp.com.br</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    OPERATOR
                  </span>
                </td>
                <td className="px-4 py-3 text-emerald-400">Ativo</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
