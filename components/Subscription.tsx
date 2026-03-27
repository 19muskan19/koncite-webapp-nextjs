'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../types';
import {
  CreditCard,
  Check,
  Zap,
  Users,
  FolderKanban,
  HardDrive,
  Sparkles,
  GraduationCap,
  PlusCircle,
  Globe,
} from 'lucide-react';

interface SubscriptionProps {
  theme: ThemeType;
}

type Region = 'india' | 'global';

const COMMON_FEATURES = [
  'Daily Progress',
  'Workforce',
  'Tasks',
  'Inventory',
  'Documents',
  'AI Accounts',
  'AI Hub',
] as const;

type PlanId = 'starter' | 'business' | 'enterprise';

interface Plan {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  projects: number;
  users: number;
  storageGb: number;
  aiCredits: number;
  trainingHours: number;
  popular: boolean;
}

interface AddOnRowData {
  label: string;
  unit: string;
  starter: number;
  business: number;
  enterprise: number;
}

interface RegionPricing {
  label: string;
  currency: 'INR' | 'USD';
  plans: Plan[];
  addOns: {
    extraProject: AddOnRowData;
    extraUser: AddOnRowData;
    extraStorageGb: AddOnRowData;
    extraAiCredits: AddOnRowData;
  };
}

const PRICING: Record<Region, RegionPricing> = {
  india: {
    label: 'India',
    currency: 'INR',
    plans: [
      {
        id: 'starter',
        name: 'Starter',
        monthlyPrice: 5000,
        projects: 3,
        users: 10,
        storageGb: 20,
        aiCredits: 500,
        trainingHours: 10,
        popular: false,
      },
      {
        id: 'business',
        name: 'Business',
        monthlyPrice: 10000,
        projects: 6,
        users: 35,
        storageGb: 100,
        aiCredits: 2000,
        trainingHours: 50,
        popular: true,
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        monthlyPrice: 25000,
        projects: 12,
        users: 75,
        storageGb: 500,
        aiCredits: 5000,
        trainingHours: 100,
        popular: false,
      },
    ],
    addOns: {
      extraProject: {
        label: 'Additional project',
        unit: 'per project',
        starter: 1500,
        business: 1500,
        enterprise: 1500,
      },
      extraUser: {
        label: 'Additional user',
        unit: 'per user',
        starter: 300,
        business: 200,
        enterprise: 200,
      },
      extraStorageGb: {
        label: 'Document storage',
        unit: 'per GB',
        starter: 3,
        business: 2.5,
        enterprise: 2,
      },
      extraAiCredits: {
        label: 'AI credits',
        unit: 'per 1,000 credits',
        starter: 500,
        business: 400,
        enterprise: 300,
      },
    },
  },
  global: {
    label: 'Global',
    currency: 'USD',
    plans: [
      {
        id: 'starter',
        name: 'Starter',
        monthlyPrice: 250,
        projects: 3,
        users: 10,
        storageGb: 20,
        aiCredits: 1000,
        trainingHours: 10,
        popular: false,
      },
      {
        id: 'business',
        name: 'Business',
        monthlyPrice: 500,
        projects: 6,
        users: 35,
        storageGb: 100,
        aiCredits: 3000,
        trainingHours: 50,
        popular: true,
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        monthlyPrice: 950,
        projects: 12,
        users: 75,
        storageGb: 500,
        aiCredits: 6000,
        trainingHours: 100,
        popular: false,
      },
    ],
    addOns: {
      extraProject: {
        label: 'Additional project',
        unit: 'per project',
        starter: 60,
        business: 60,
        enterprise: 60,
      },
      extraUser: {
        label: 'Additional user',
        unit: 'per user',
        starter: 20,
        business: 15,
        enterprise: 15,
      },
      extraStorageGb: {
        label: 'Document storage',
        unit: 'per GB',
        starter: 0.08,
        business: 0.06,
        enterprise: 0.05,
      },
      extraAiCredits: {
        label: 'AI credits',
        unit: 'per 1,000 credits',
        starter: 10,
        business: 8,
        enterprise: 6,
      },
    },
  },
};

function formatPrice(amount: number, region: Region): string {
  if (region === 'india') {
    const hasDecimals = amount % 1 !== 0;
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    })}`;
  }
  if (amount < 1) return `$${amount.toFixed(2)}`;
  if (amount % 1 === 0) return `$${amount}`;
  return `$${amount.toFixed(2)}`;
}

type AddonKey = 'extraProject' | 'extraUser' | 'extraStorageGb' | 'extraAiCredits';

const ADDON_KEYS: AddonKey[] = ['extraProject', 'extraUser', 'extraStorageGb', 'extraAiCredits'];

function getUnitPrice(row: AddOnRowData, tier: PlanId): number {
  if (tier === 'starter') return row.starter;
  if (tier === 'business') return row.business;
  return row.enterprise;
}

function parseAddonQty(key: AddonKey, raw: string): number {
  const n = parseFloat(String(raw).replace(/,/g, '').trim());
  if (Number.isNaN(n) || n < 0) return 0;
  if (key === 'extraStorageGb') return Math.round(n * 1000) / 1000;
  return Math.floor(n);
}

const emptyAddonState = (): { enabled: Record<AddonKey, boolean>; qty: Record<AddonKey, string> } => ({
  enabled: {
    extraProject: false,
    extraUser: false,
    extraStorageGb: false,
    extraAiCredits: false,
  },
  qty: {
    extraProject: '',
    extraUser: '',
    extraStorageGb: '',
    extraAiCredits: '',
  },
});

function QuotaRow({
  icon,
  label,
  value,
  isDark,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isDark: boolean;
  highlight: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`flex items-center gap-2 text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
        <span className={highlight ? 'text-[#C2D642]' : ''}>{icon}</span>
        {label}
      </span>
      <span
        className={`text-xs sm:text-sm font-bold tabular-nums ${highlight ? 'text-[#C2D642]' : isDark ? 'text-slate-100' : 'text-slate-900'}`}
      >
        {value}
      </span>
    </div>
  );
}

function AddonReferenceRow({
  row,
  region,
  textPrimary,
  textSecondary,
}: {
  row: AddOnRowData;
  region: Region;
  textPrimary: string;
  textSecondary: string;
}) {
  return (
    <tr>
      <td className={`px-4 sm:px-6 py-3.5 ${textSecondary}`}>
        <span className={`font-semibold ${textPrimary}`}>{row.label}</span>
        <span className="block text-xs mt-0.5 opacity-90">{row.unit}</span>
      </td>
      <td className={`px-3 py-3.5 text-center font-bold tabular-nums ${textPrimary}`}>
        {formatPrice(row.starter, region)}
      </td>
      <td className="px-3 py-3.5 text-center font-bold tabular-nums text-[#C2D642]">
        {formatPrice(row.business, region)}
      </td>
      <td className={`px-4 sm:px-6 py-3.5 text-center font-bold tabular-nums ${textPrimary}`}>
        {formatPrice(row.enterprise, region)}
      </td>
    </tr>
  );
}

const Subscription: React.FC<SubscriptionProps> = ({ theme }) => {
  const [region, setRegion] = useState<Region>('india');

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';
  const mutedBorder = isDark ? 'border-slate-700/80' : 'border-slate-200';

  const data = PRICING[region];

  const [addonBaseTier, setAddonBaseTier] = useState<PlanId>('business');
  const [addonEnabled, setAddonEnabled] = useState(emptyAddonState().enabled);
  const [addonQty, setAddonQty] = useState(emptyAddonState().qty);

  useEffect(() => {
    const fresh = emptyAddonState();
    setAddonEnabled(fresh.enabled);
    setAddonQty(fresh.qty);
  }, [region]);

  const basePlanMonthly = useMemo(() => {
    const plan = data.plans.find((p) => p.id === addonBaseTier);
    return plan?.monthlyPrice ?? 0;
  }, [data.plans, addonBaseTier]);

  const addonTotal = useMemo(() => {
    let sum = 0;
    for (const key of ADDON_KEYS) {
      if (!addonEnabled[key]) continue;
      const row = data.addOns[key];
      const q = parseAddonQty(key, addonQty[key]);
      sum += q * getUnitPrice(row, addonBaseTier);
    }
    return sum;
  }, [addonEnabled, addonQty, addonBaseTier, data.addOns]);

  const selectedPaymentMonthly = basePlanMonthly + addonTotal;

  const setAddonChecked = (key: AddonKey, checked: boolean) => {
    setAddonEnabled((prev) => ({ ...prev, [key]: checked }));
    if (checked) {
      setAddonQty((prev) => {
        const cur = parseAddonQty(key, prev[key]);
        if (cur < 1) return { ...prev, [key]: '1' };
        return prev;
      });
    } else {
      setAddonQty((prev) => ({ ...prev, [key]: '' }));
    }
  };

  const handleSelectPlan = (planName: string) => {
    console.log(`Selected ${planName} plan (${region})`);
  };

  return (
    <div className={`min-h-[calc(100vh-3.5rem)] ${bgPrimary} -m-4 p-4 sm:p-6 rounded-xl`}>
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* Header + region toggle */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex items-start gap-3 sm:gap-4 min-w-0">
              <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                <CreditCard className={`w-5 h-5 sm:w-6 sm:h-6 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} />
              </div>
              <div className="min-w-0">
                <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary}`}>
                  Subscription & billing
                </h1>
                <p className={`text-sm sm:text-base mt-1.5 ${textSecondary} max-w-2xl leading-relaxed`}>
                  Prices are shown <span className="font-semibold text-[#C2D642]">per month</span>. Plans are{' '}
                  <span className="font-semibold text-[#C2D642]">yearly subscriptions</span> — you pay once per year (12 × the monthly rate).{' '}
                  <span className="font-medium text-[#C2D642]">
                    {region === 'india' ? 'India (₹)' : 'International (USD)'}
                  </span>
                  .
                </p>
              </div>
            </div>

            <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>Region</span>
              <div
                className={`inline-flex rounded-xl p-1 border ${mutedBorder} ${
                  isDark ? 'bg-slate-800/80' : 'bg-slate-100/90'
                }`}
                role="group"
                aria-label="Pricing region"
              >
                <button
                  type="button"
                  onClick={() => setRegion('india')}
                  className={`px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    region === 'india'
                      ? 'bg-[#C2D642] text-white shadow-md'
                      : isDark
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  India
                </button>
                <button
                  type="button"
                  onClick={() => setRegion('global')}
                  className={`flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    region === 'global'
                      ? 'bg-[#C2D642] text-white shadow-md'
                      : isDark
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden />
                  Global
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-stretch">
          {data.plans.map((plan) => {
            const isPopular = plan.popular;
            return (
              <div
                key={`${region}-${plan.id}`}
                className={`relative flex flex-col rounded-2xl border transition-all duration-300 ${
                  isPopular
                    ? `border-2 border-[#C2D642] shadow-xl shadow-[#C2D642]/10 ${isDark ? 'bg-[#C2D642]/[0.07]' : 'bg-[#C2D642]/5'}`
                    : `${cardClass} border ${mutedBorder} hover:border-[#C2D642]/40`
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="px-4 py-1 bg-[#C2D642] text-white text-[11px] sm:text-xs font-black uppercase tracking-wide rounded-full shadow-md">
                      Most popular
                    </span>
                  </div>
                )}

                <div className={`p-5 sm:p-6 flex flex-col flex-1 ${isPopular ? 'pt-8' : ''}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className={`w-5 h-5 ${isPopular ? 'text-[#C2D642]' : textSecondary}`} />
                    <h2 className={`text-lg sm:text-xl font-black ${textPrimary}`}>{plan.name}</h2>
                  </div>

                  <div className="mb-5">
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span
                        className={`text-3xl sm:text-4xl md:text-[2.5rem] font-black tabular-nums leading-none ${
                          isPopular ? 'text-[#C2D642]' : textPrimary
                        }`}
                      >
                        {formatPrice(plan.monthlyPrice, region)}
                      </span>
                      <span className={`text-sm font-bold ${textSecondary}`}>/month</span>
                    </div>
                    <p className={`text-xs sm:text-sm mt-2 ${textSecondary}`}>Yearly plan — billed annually</p>
                  </div>

                  <div className={`space-y-3 mb-5 pb-5 border-b ${mutedBorder}`}>
                    <QuotaRow
                      icon={<FolderKanban className="w-4 h-4" />}
                      label="Projects included"
                      value={String(plan.projects)}
                      isDark={isDark}
                      highlight={isPopular}
                    />
                    <QuotaRow
                      icon={<Users className="w-4 h-4" />}
                      label="Users included"
                      value={String(plan.users)}
                      isDark={isDark}
                      highlight={isPopular}
                    />
                    <QuotaRow
                      icon={<HardDrive className="w-4 h-4" />}
                      label="Document storage"
                      value={`${plan.storageGb} GB`}
                      isDark={isDark}
                      highlight={isPopular}
                    />
                    <QuotaRow
                      icon={<Sparkles className="w-4 h-4" />}
                      label="AI monthly credits"
                      value={plan.aiCredits.toLocaleString(region === 'india' ? 'en-IN' : 'en-US')}
                      isDark={isDark}
                      highlight={isPopular}
                    />
                    <QuotaRow
                      icon={<GraduationCap className="w-4 h-4" />}
                      label="Online training support"
                      value={`${plan.trainingHours} hrs`}
                      isDark={isDark}
                      highlight={isPopular}
                    />
                  </div>

                  <p className={`text-[11px] sm:text-xs ${textSecondary} mb-4 leading-relaxed`}>
                    AI includes free credits to get started; additional usage can be purchased as needed.
                  </p>

                  <div className="mb-5">
                    <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                      Included in every plan
                    </p>
                    <ul className="space-y-2">
                      {COMMON_FEATURES.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check
                            className={`w-4 h-4 shrink-0 mt-0.5 ${isPopular ? 'text-[#C2D642]' : 'text-[#C2D642]/90'}`}
                          />
                          <span className={`text-xs sm:text-sm ${textPrimary}`}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto pt-2">
                    <button
                      type="button"
                      onClick={() => handleSelectPlan(plan.name)}
                      className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
                        isPopular
                          ? 'bg-[#C2D642] hover:bg-[#b8cc3a] text-white shadow-lg shadow-[#C2D642]/25'
                          : `border-2 border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642] hover:text-white ${
                              isDark ? 'bg-slate-900/40' : 'bg-white'
                            }`
                      }`}
                    >
                      Choose yearly plan
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add-ons */}
        <div className={`rounded-2xl border ${cardClass} overflow-hidden`}>
          <div className={`px-5 sm:px-6 py-4 border-b ${mutedBorder}`}>
            <div className="flex items-start gap-2">
              <PlusCircle className={`w-5 h-5 text-[#C2D642] shrink-0 mt-0.5`} />
              <div className="min-w-0">
                <h3 className={`text-base sm:text-lg font-black ${textPrimary}`}>Add-on pricing</h3>
                <p className={`text-xs sm:text-sm ${textSecondary} mt-0.5`}>
                  Rates depend on your base plan tier. Select add-ons, enter quantities, and see your estimated total.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
              <label htmlFor="addon-base-tier" className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
                Your base plan
              </label>
              <select
                id="addon-base-tier"
                value={addonBaseTier}
                onChange={(e) => setAddonBaseTier(e.target.value as PlanId)}
                className={`max-w-xs rounded-lg px-3 py-2 text-sm font-bold border outline-none focus:ring-2 focus:ring-[#C2D642]/40 ${
                  isDark
                    ? 'bg-slate-800 border-slate-600 text-slate-100'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                {data.plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={`divide-y ${mutedBorder}`}>
            {ADDON_KEYS.map((key) => {
              const row = data.addOns[key];
              const unit = getUnitPrice(row, addonBaseTier);
              const q = parseAddonQty(key, addonQty[key]);
              const lineTotal = addonEnabled[key] ? q * unit : 0;
              const inputClass = `w-full min-w-0 max-w-[120px] rounded-lg px-2 py-1.5 text-sm font-bold tabular-nums border outline-none focus:ring-2 focus:ring-[#C2D642]/30 ${
                isDark
                  ? 'bg-slate-800/80 border-slate-600 text-slate-100'
                  : 'bg-white border-slate-300 text-slate-900'
              }`;
              const step =
                key === 'extraStorageGb' ? '0.1' : '1';
              const qtyHint =
                key === 'extraAiCredits'
                  ? 'Number of 1,000-credit packs'
                  : key === 'extraStorageGb'
                    ? 'Extra GB'
                    : key === 'extraUser'
                      ? 'Number of users'
                      : 'Number of projects';

              return (
                <div
                  key={key}
                  className={`px-4 sm:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 ${
                    addonEnabled[key] ? (isDark ? 'bg-slate-800/30' : 'bg-[#C2D642]/5') : ''
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer sm:min-w-[200px] sm:max-w-[240px]">
                    <input
                      type="checkbox"
                      checked={addonEnabled[key]}
                      onChange={(e) => setAddonChecked(key, e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-slate-500 text-[#C2D642] focus:ring-[#C2D642]"
                    />
                    <span>
                      <span className={`font-semibold ${textPrimary} block`}>{row.label}</span>
                      <span className={`text-xs ${textSecondary}`} title={qtyHint}>
                        {row.unit} · {formatPrice(unit, region)} each
                      </span>
                    </span>
                  </label>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 flex-1 sm:justify-end">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold uppercase ${textSecondary}`}>Qty</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={step}
                        disabled={!addonEnabled[key]}
                        value={addonQty[key]}
                        onChange={(e) => setAddonQty((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder="0"
                        aria-label={`${row.label} quantity`}
                        className={`${inputClass} disabled:opacity-40 disabled:cursor-not-allowed`}
                      />
                    </div>
                    <div
                      className={`text-sm font-black tabular-nums min-w-[100px] text-right ${
                        addonEnabled[key] && q > 0 ? 'text-[#C2D642]' : textSecondary
                      }`}
                    >
                      {addonEnabled[key] && q > 0 ? formatPrice(lineTotal, region) : '—'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className={`px-5 sm:px-6 py-4 border-t ${mutedBorder} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
              isDark ? 'bg-slate-800/40' : 'bg-slate-50/90'
            }`}
          >
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Selected pay amount</p>
              <p className={`text-2xl sm:text-3xl font-black tabular-nums mt-1 ${textPrimary}`}>
                {selectedPaymentMonthly > 0 ? formatPrice(selectedPaymentMonthly, region) : '—'}
                <span className={`text-sm font-bold ${textSecondary} ml-1`}>/month</span>
              </p>
              <p className={`text-[11px] mt-1 ${textSecondary}`}>
                Base plan ({formatPrice(basePlanMonthly, region)}/mo) + selected add-ons ({formatPrice(addonTotal, region)}
                /mo). Yearly billing is 12× this total. Estimates before taxes; final billing may vary.
              </p>
            </div>
            <button
              type="button"
              disabled={selectedPaymentMonthly <= 0}
              onClick={() =>
                console.log('Proceed to pay', {
                  basePlanMonthly,
                  addonTotal,
                  selectedPaymentMonthly,
                  region,
                  addonBaseTier,
                  addonEnabled,
                  addonQty,
                })
              }
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all shrink-0 ${
                selectedPaymentMonthly > 0
                  ? 'bg-[#C2D642] hover:bg-[#b8cc3a] text-white shadow-md'
                  : 'bg-slate-600/40 text-slate-500 cursor-not-allowed'
              }`}
            >
              Proceed to pay
            </button>
          </div>

          <details className={`border-t ${mutedBorder} group`}>
            <summary
              className={`px-5 sm:px-6 py-3 cursor-pointer text-sm font-bold list-none flex items-center [&::-webkit-details-marker]:hidden ${
                isDark ? `${textSecondary} hover:text-slate-200` : `${textSecondary} hover:text-slate-800`
              }`}
            >
              <span className="underline underline-offset-2">View rates for all tiers</span>
            </summary>
            <div className="overflow-x-auto px-2 pb-4">
              <table className="w-full text-left text-sm min-w-[520px]">
                <thead>
                  <tr className={`${isDark ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                    <th className={`px-4 sm:px-6 py-3 font-bold ${textSecondary}`}>Add-on</th>
                    <th className={`px-3 py-3 font-bold text-center ${textPrimary}`}>Starter</th>
                    <th className={`px-3 py-3 font-bold text-center text-[#C2D642]`}>Business</th>
                    <th className={`px-4 sm:px-6 py-3 font-bold text-center ${textPrimary}`}>Enterprise</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${mutedBorder}`}>
                  {ADDON_KEYS.map((key) => (
                    <AddonReferenceRow key={key} row={data.addOns[key]} region={region} textPrimary={textPrimary} textSecondary={textSecondary} />
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>

        <p className={`text-center text-xs ${textSecondary} max-w-2xl mx-auto pb-2`}>
          Prices and limits are subject to change. Need a custom deployment or higher limits?{' '}
          <span className={`font-semibold ${textPrimary}`}>Enterprise</span> includes the highest default quotas; our team can tailor add-ons for your organization.
        </p>
      </div>
    </div>
  );
};

export default Subscription;
