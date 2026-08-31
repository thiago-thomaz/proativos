"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Target,
  Sparkles,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  Shield,
  ArrowRight,
  Check,
  AlertTriangle,
  HelpCircle,
  Sliders,
  Play,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Flame,
} from "lucide-react";
import Link from "next/link";
import {
  OpeningDateMode,
  OpeningDatePreset,
  OpeningDateFilter,
  ICPStructuredDefinition,
  ICPQualityAssessment,
} from "@/lib/types";
import {
  resolveOpeningDateRange,
  validateOpeningDateFilter,
  formatSaoPauloDate,
} from "@/lib/date-utils";
import { interpretNaturalLanguageICP } from "@/services/nl-icp-parser";

const BRAZILIAN_STATES = [
  "SP", "RJ", "MG", "RS", "PR", "SC", "BA", "PE", "CE", "GO", "DF", "ES", "MT", "MS", "PA", "AM"
];

const POPULAR_CNAES = [
  { code: "5611201", label: "Restaurantes e similares", category: "Alimentação" },
  { code: "5611203", label: "Lanchonetes, casas de chá e sucos", category: "Alimentação" },
  { code: "6201501", label: "Desenvolvimento de programas de computador (TI)", category: "Tecnologia" },
  { code: "6202300", label: "Desenvolvimento de programas customizáveis", category: "Tecnologia" },
  { code: "4711302", label: "Comércio varejista de mercadorias em geral", category: "Comércio" },
  { code: "4930202", label: "Transporte rodoviário de carga", category: "Logística" },
  { code: "7311400", label: "Agências de publicidade e marketing", category: "Marketing" },
  { code: "6920601", label: "Atividades de contabilidade", category: "Serviços" },
  { code: "8630503", label: "Atividade médica ambulatorial / Clínicas", category: "Saúde" },
  { code: "4120400", label: "Construção de edifícios", category: "Construção" },
];

const DATE_PRESETS: { id: OpeningDatePreset; label: string }[] = [
  { id: "TODAY", label: "Hoje" },
  { id: "LAST_3_DAYS", label: "Últimos 3 dias" },
  { id: "LAST_7_DAYS", label: "Últimos 7 dias" },
  { id: "LAST_15_DAYS", label: "Últimos 15 dias" },
  { id: "LAST_30_DAYS", label: "Últimos 30 dias" },
  { id: "LAST_60_DAYS", label: "Últimos 60 dias" },
  { id: "LAST_90_DAYS", label: "Últimos 90 dias" },
  { id: "LAST_180_DAYS", label: "Últimos 180 dias" },
  { id: "LAST_365_DAYS", label: "Últimos 365 dias (1 ano)" },
];

export default function NewCampaignPage() {
  const router = useRouter();

  // Mode: Simples (Linguagem Natural) vs Avançado (Filtros Modulares)
  const [uiMode, setUiMode] = useState<"SIMPLE" | "ADVANCED">("SIMPLE");

  // Simple Mode Inputs
  const [productSellInput, setProductSellInput] = useState("ERP de Gestão para Restaurantes");
  const [targetCompanyInput, setTargetCompanyInput] = useState("Restaurantes e bares abertos nos últimos 30 dias em São Paulo");
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [nlpResult, setNlpResult] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Campaign Meta
  const [name, setName] = useState("Novos Restaurantes SP");
  const [productName, setProductName] = useState("ERP para Restaurantes");
  const [productDescription, setProductDescription] = useState("Sistema completo de gestão, PDV e cardápio digital para alimentação.");
  const [minScore, setMinScore] = useState(70);
  const [status, setStatus] = useState<"DRAFT" | "SIMULATION">("SIMULATION");

  // Advanced Modular Filters
  const [selectedStates, setSelectedStates] = useState<string[]>(["SP"]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState("");
  const [strictLocation, setStrictLocation] = useState(true);

  const [selectedCnaes, setSelectedCnaes] = useState<string[]>(["5611201", "5611203"]);
  const [cnaeSearch, setCnaeSearch] = useState("");
  const [acceptSecondaryCnae, setAcceptSecondaryCnae] = useState(true);
  const [strictMainCnaeOnly, setStrictMainCnaeOnly] = useState(false);

  const [selectedPortes, setSelectedPortes] = useState<string[]>(["MEI", "ME", "EPP"]);
  const [minCapital, setMinCapital] = useState(0);
  const [maxCapital, setMaxCapital] = useState<number | null>(null);

  // Opening Date
  const [dateMode, setDateMode] = useState<OpeningDateMode>("PRESET");
  const [datePreset, setDatePreset] = useState<OpeningDatePreset>("LAST_30_DAYS");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customSubtype, setCustomSubtype] = useState<"INTERVAL" | "FROM" | "UNTIL">("INTERVAL");

  // Custom Weights
  const [cnaeWeight, setCnaeWeight] = useState(30);
  const [locationWeight, setLocationWeight] = useState(20);
  const [openingDateWeight, setOpeningDateWeight] = useState(15);
  const [porteWeight, setPorteWeight] = useState(10);
  const [contactWeight, setContactWeight] = useState(5);
  const [capitalWeight, setCapitalWeight] = useState(10);

  // ICP Sandbox Test State
  const [isTestingIcp, setIsTestingIcp] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  // Dynamic Date Range Resolution
  const currentOpeningDateFilter: OpeningDateFilter = useMemo(() => {
    if (dateMode === "PRESET") {
      return { mode: "PRESET", preset: datePreset };
    }
    if (customSubtype === "FROM") {
      return { mode: "FROM_DATE", from: customFrom || null };
    }
    if (customSubtype === "UNTIL") {
      return { mode: "UNTIL_DATE", to: customTo || null };
    }
    return { mode: "CUSTOM", from: customFrom || null, to: customTo || null };
  }, [dateMode, datePreset, customSubtype, customFrom, customTo]);

  const resolvedRange = useMemo(() => {
    return resolveOpeningDateRange(currentOpeningDateFilter);
  }, [currentOpeningDateFilter]);

  const dateValidation = useMemo(() => {
    return validateOpeningDateFilter(currentOpeningDateFilter);
  }, [currentOpeningDateFilter]);

  // Current Full Structured ICP Object
  const currentStructuredIcp: ICPStructuredDefinition = useMemo(() => {
    return {
      version: 2,
      industry: {
        terms: [],
        mainCnaes: selectedCnaes,
        secondaryCnaes: [],
        acceptSecondaryCnae,
        strictMainCnaeOnly,
      },
      location: {
        country: "BR",
        regions: [],
        ufs: selectedStates,
        cities: selectedCities,
        strictLocation,
      },
      companySize: {
        allowedPortes: selectedPortes,
      },
      capitalSocial: {
        min: minCapital,
        max: maxCapital,
      },
      openingDate: currentOpeningDateFilter,
      status: ["ATIVA"],
      contactRequirements: {
        anyContactPreferred: true,
      },
      weights: {
        cnaeMain: cnaeWeight,
        cnaeSec: Math.round(cnaeWeight * 0.7),
        location: locationWeight,
        openingDate: openingDateWeight,
        porte: porteWeight,
        contact: contactWeight,
        capital: capitalWeight,
      },
      minScore,
    };
  }, [
    selectedCnaes,
    acceptSecondaryCnae,
    strictMainCnaeOnly,
    selectedStates,
    selectedCities,
    strictLocation,
    selectedPortes,
    minCapital,
    maxCapital,
    currentOpeningDateFilter,
    cnaeWeight,
    locationWeight,
    openingDateWeight,
    porteWeight,
    contactWeight,
    capitalWeight,
    minScore,
  ]);

  // Interpretar Linguagem Natural
  const handleInterpretSimpleMode = () => {
    if (!targetCompanyInput.trim()) return;
    setIsInterpreting(true);

    setTimeout(() => {
      const result = interpretNaturalLanguageICP(targetCompanyInput);
      setNlpResult(result);

      // Preencher formulário com o resultado estruturado
      if (result.structuredIcp.industry.mainCnaes.length > 0) {
        setSelectedCnaes(result.structuredIcp.industry.mainCnaes);
      }
      if (result.structuredIcp.location.ufs.length > 0) {
        setSelectedStates(result.structuredIcp.location.ufs);
      }
      if (result.structuredIcp.location.cities.length > 0) {
        setSelectedCities(result.structuredIcp.location.cities);
      }
      if (result.structuredIcp.companySize.allowedPortes.length > 0) {
        setSelectedPortes(result.structuredIcp.companySize.allowedPortes);
      }
      if (result.structuredIcp.openingDate) {
        setDateMode(result.structuredIcp.openingDate.mode);
        if (result.structuredIcp.openingDate.preset) {
          setDatePreset(result.structuredIcp.openingDate.preset);
        }
      }

      if (productSellInput) {
        setProductName(productSellInput);
        setName(`Prospecção: ${productSellInput}`);
      }

      setIsInterpreting(false);
      setShowConfirmation(true);
    }, 400);
  };

  // Testar ICP no Sandbox
  const handleRunIcpTest = async () => {
    setIsTestingIcp(true);
    try {
      const res = await fetch("/api/v1/icp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icp: currentStructuredIcp }),
      });
      const data = await res.json();
      setTestResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTestingIcp(false);
    }
  };

  const addCity = () => {
    if (cityInput.trim() && !selectedCities.includes(cityInput.trim())) {
      setSelectedCities([...selectedCities, cityInput.trim()]);
      setCityInput("");
    }
  };

  const removeCity = (city: string) => {
    setSelectedCities(selectedCities.filter((c) => c !== city));
  };

  const toggleState = (uf: string) => {
    setSelectedStates((prev) =>
      prev.includes(uf) ? prev.filter((s) => s !== uf) : [...prev, uf]
    );
  };

  const toggleCnae = (code: string) => {
    setSelectedCnaes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const togglePorte = (porte: string) => {
    setSelectedPortes((prev) =>
      prev.includes(porte) ? prev.filter((p) => p !== porte) : [...prev, porte]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateValidation.valid) {
      alert(dateValidation.error);
      return;
    }

    const payload = {
      name,
      productName,
      productDescription,
      minScore,
      allowedChannels: ["EMAIL", "WHATSAPP"],
      status,
      icpFilters: currentStructuredIcp,
    };

    try {
      await fetch("/api/v1/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error(err);
    }

    router.push("/campaigns");
  };

  const filteredCnaes = POPULAR_CNAES.filter(
    (c) =>
      c.label.toLowerCase().includes(cnaeSearch.toLowerCase()) ||
      c.code.includes(cnaeSearch) ||
      c.category.toLowerCase().includes(cnaeSearch.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/campaigns" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
            ← Voltar para Campanhas
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 mt-1">
            <Target className="w-6 h-6 text-indigo-400" />
            Construtor de ICP & Lead Engine
          </h1>
          <p className="text-sm text-slate-400">
            Defina o perfil de cliente ideal e simule aderência em tempo real.
          </p>
        </div>

        {/* Mode Selector Toggle */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 self-start">
          <button
            type="button"
            onClick={() => setUiMode("SIMPLE")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              uiMode === "SIMPLE"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Modo Simples (Linguagem Natural)
          </button>
          <button
            type="button"
            onClick={() => setUiMode("ADVANCED")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              uiMode === "ADVANCED"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Modo Avançado (Filtros & Pesos)
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MODO SIMPLES (LINGUAGEM NATURAL + PRODUTO + CONFIRMAÇÃO) */}
      {/* ========================================================================= */}
      {uiMode === "SIMPLE" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-500/30 shadow-xl space-y-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">
                Definição Conversacional do seu Cliente Ideal
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  1. O que você vende?
                </label>
                <input
                  type="text"
                  value={productSellInput}
                  onChange={(e) => setProductSellInput(e.target.value)}
                  placeholder="Ex: Sistema ERP com PDV para Restaurantes"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  2. Que tipo de empresa você quer encontrar?
                </label>
                <textarea
                  rows={2}
                  value={targetCompanyInput}
                  onChange={(e) => setTargetCompanyInput(e.target.value)}
                  placeholder="Ex: Restaurantes e pizzarias que abriram nos últimos 30 dias no estado de São Paulo"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleInterpretSimpleMode}
                  disabled={isInterpreting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  {isInterpreting ? "Interpretando ICP..." : "Interpretar & Gerar Regras de ICP"}
                </button>
              </div>
            </div>
          </div>

          {/* Section 33 & 34: Alerta de Ambiguidade */}
          {nlpResult?.isAmbiguous && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-200">
                  {nlpResult.ambiguityWarning}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {nlpResult.ambiguityOptions?.map((opt: any, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedCnaes(opt.cnaes);
                      setShowConfirmation(true);
                    }}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-amber-400/50 text-left text-xs transition-colors"
                  >
                    <div className="font-bold text-white">{opt.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section 20: Painel de Confirmação "ENTENDI SEU CLIENTE IDEAL" */}
          {showConfirmation && (
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/40 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  Entendi seu Cliente Ideal (Confirmação)
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Confiança da IA: <strong>{Math.round((nlpResult?.confidenceScore || 0.9) * 100)}%</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Produto Ofertado</span>
                  <div className="font-semibold text-white mt-1">{productSellInput}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Segmento / CNAEs</span>
                  <div className="font-semibold text-indigo-300 mt-1">{selectedCnaes.length} CNAEs identificados</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Localização</span>
                  <div className="font-semibold text-white mt-1">{selectedStates.join(", ")}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Data de Abertura</span>
                  <div className="font-semibold text-emerald-400 mt-1">{resolvedRange.label}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setUiMode("ADVANCED")}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Personalizar Filtros no Modo Avançado
                </button>
                <button
                  type="button"
                  onClick={handleRunIcpTest}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  Testar Este ICP no Sandbox
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MODO AVANÇADO (FILTROS DETALHADOS, PESOS E HARD/SOFT SETTINGS) */}
      {/* ========================================================================= */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {uiMode === "ADVANCED" && (
          <div className="space-y-6">
            {/* Meta Info */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
                1. Informações Básicas da Campanha
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nome da Campanha</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Produto Ofertado</label>
                  <input
                    type="text"
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* CNAEs & Segmentos */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
                  2. Atividades Econômicas & CNAE
                </h3>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptSecondaryCnae}
                      onChange={(e) => setAcceptSecondaryCnae(e.target.checked)}
                      className="accent-indigo-600 rounded"
                    />
                    Aceitar CNAE secundário (+20 pts)
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={strictMainCnaeOnly}
                      onChange={(e) => setStrictMainCnaeOnly(e.target.checked)}
                      className="accent-indigo-600 rounded"
                    />
                    CNAE Obrigatório (Hard Filter)
                  </label>
                </div>
              </div>

              {/* CNAE Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Pesquisar CNAE por código, descrição ou categoria..."
                  value={cnaeSearch}
                  onChange={(e) => setCnaeSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {filteredCnaes.map((item) => {
                  const isSelected = selectedCnaes.includes(item.code);
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => toggleCnae(item.code)}
                      className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-indigo-600/20 border-indigo-500 text-white font-medium"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div>
                        <div className="text-white font-medium">{item.label}</div>
                        <div className="text-[10px] text-slate-500">{item.category}</div>
                      </div>
                      <span className="font-mono text-[11px] text-indigo-400">{item.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Localização */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
                  3. Localização Geográfica
                </h3>
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={strictLocation}
                    onChange={(e) => setStrictLocation(e.target.checked)}
                    className="accent-indigo-600 rounded"
                  />
                  Localização Obrigatória (Hard Filter)
                </label>
              </div>

              {/* UFs */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Estados Alvo (UFs)</label>
                <div className="flex flex-wrap gap-2">
                  {BRAZILIAN_STATES.map((uf) => {
                    const isSelected = selectedStates.includes(uf);
                    return (
                      <button
                        key={uf}
                        type="button"
                        onClick={() => toggleState(uf)}
                        className={`w-9 h-9 rounded-xl border text-xs font-bold transition-all flex items-center justify-center ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-500 shadow"
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {uf}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cidades */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">Municípios Específicos (Opcional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    placeholder="Adicionar município (ex: Bauru, Campinas)..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addCity}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700"
                  >
                    + Adicionar
                  </button>
                </div>
                {selectedCities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedCities.map((city) => (
                      <span
                        key={city}
                        className="px-2.5 py-1 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-800 text-xs flex items-center gap-1.5"
                      >
                        {city}
                        <button type="button" onClick={() => removeCity(city)} className="text-indigo-400 hover:text-rose-400">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Data de Abertura (Reutilizando a implementação validada da Fase 1) */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
                4. Data de Abertura da Empresa
              </h3>

              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setDateMode("PRESET")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    dateMode === "PRESET" ? "bg-indigo-600 text-white" : "bg-slate-950 text-slate-400 border border-slate-800"
                  }`}
                >
                  Opção A — Períodos Rápidos
                </button>
                <button
                  type="button"
                  onClick={() => setDateMode("CUSTOM")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    dateMode === "CUSTOM" ? "bg-indigo-600 text-white" : "bg-slate-950 text-slate-400 border border-slate-800"
                  }`}
                >
                  Opção B — Período Personalizado
                </button>
              </div>

              {dateMode === "PRESET" && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {DATE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setDatePreset(p.id)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold ${
                        datePreset === p.id
                          ? "bg-indigo-600 text-white border-indigo-500"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}

              {dateMode === "CUSTOM" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Data Inicial</label>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Data Final</label>
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              <div className="text-xs text-slate-400 font-mono">
                Período calculado: <strong className="text-indigo-300">{resolvedRange.label}</strong>
              </div>
            </div>

            {/* Porte & Capital Social */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
                5. Porte & Capital Social
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Porte Permitido</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["MEI", "ME", "EPP"].map((porte) => (
                      <button
                        key={porte}
                        type="button"
                        onClick={() => togglePorte(porte)}
                        className={`py-2 rounded-xl border text-xs font-bold ${
                          selectedPortes.includes(porte)
                            ? "bg-indigo-600 text-white border-indigo-500"
                            : "bg-slate-950 border-slate-800 text-slate-400"
                        }`}
                      >
                        {porte}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Capital Social Mínimo (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={minCapital}
                    onChange={(e) => setMinCapital(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Score Mínimo & Pesos */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white uppercase tracking-wider">
                  6. Score Mínimo de Aprovação (Threshold): <span className="text-indigo-400 font-bold">{minScore}%</span>
                </span>
              </div>
              <input
                type="range"
                min="40"
                max="95"
                step="5"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. SANDBOX INTERATIVO: TESTAR ICP (SECTION 29) */}
        {/* ========================================================================= */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                Explorador & Sandbox: Testar ICP em Tempo Real
              </h3>
              <p className="text-xs text-slate-400">
                Simule instantaneamente a taxa de aprovação contra a base real de empresas antes de ativar.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunIcpTest}
              disabled={isTestingIcp}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              <Play className="w-4 h-4 text-emerald-300" />
              {isTestingIcp ? "Simulando Universo..." : "Testar ICP Agora"}
            </button>
          </div>

          {/* Test Results Display */}
          {testResults && (
            <div className="space-y-4 pt-2">
              {/* Quality Banner */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Qualidade do ICP</div>
                  <div className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        testResults.quality?.rating === "Excelente"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : testResults.quality?.rating === "Bom"
                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {testResults.quality?.rating}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({Math.round((testResults.quality?.matchedRatio || 0) * 100)}% de taxa de aprovação)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>Universo: <strong className="text-white">{testResults.totalUniverse}</strong></div>
                  <div>Matches: <strong className="text-emerald-400">{testResults.matchedCount}</strong></div>
                  <div>Rejeitados: <strong className="text-rose-400">{testResults.rejectedCount}</strong></div>
                </div>
              </div>

              {/* Suggestions */}
              {testResults.quality?.suggestions?.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Sugestões Automáticas de Refinamento:
                  </span>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {testResults.quality.suggestions.map((sug: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-indigo-400">→</span> {sug}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Score Distribution Histogram */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Distribuição de Scores na Base:
                </span>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {Object.entries(testResults.distribution || {}).map(([range, count]: any) => (
                    <div key={range} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-mono">{range} pts</div>
                      <div className="text-sm font-bold text-indigo-300 mt-0.5">{count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex justify-end gap-3 pt-4">
          <Link
            href="/campaigns"
            className="px-5 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
          >
            Salvar e Iniciar Simulação da Campanha
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
