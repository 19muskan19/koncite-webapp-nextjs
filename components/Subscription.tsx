'use client';

import React, { useState } from 'react';
import { ThemeType } from '../types';
import { 
  CreditCard,
  Check,
  Zap
} from 'lucide-react';

interface SubscriptionProps {
  theme: ThemeType;
}

const Subscription: React.FC<SubscriptionProps> = ({ theme }) => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';
  const bgSecondary = isDark ? 'bg-slate-800' : 'bg-slate-50';

  const pricingPlans = [
    {
      name: 'Starter',
      monthlyPrice: '$99',
      yearlyPrice: '$990',
      features: [
        'Up to 5 users',
        'Document management',
        'Basic reporting',
        'Email support',
        'Basic project tracking',
        'Mobile app access'
      ],
      popular: false
    },
    {
      name: 'Professional',
      monthlyPrice: '$299',
      yearlyPrice: '$2,990',
      features: [
        'Up to 25 users',
        'All Starter features',
        'AI-powered tools',
        'Priority support',
        'Advanced analytics',
        'Custom reports',
        'API access',
        'Advanced security'
      ],
      popular: true
    },
    {
      name: 'Enterprise',
      monthlyPrice: 'Custom',
      yearlyPrice: 'Custom',
      features: [
        'Unlimited users',
        'All Professional features',
        'Custom integrations',
        'Dedicated support',
        'Advanced security',
        'Custom training',
        'SLA guarantee',
        'On-premise deployment'
      ],
      popular: false
    }
  ];

  const getPrice = (plan: typeof pricingPlans[0]) => {
    if (plan.monthlyPrice === 'Custom') return 'Custom';
    return billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  };

  const handleSelectPlan = (planName: string) => {
    if (planName === 'Enterprise') {
      // Handle contact sales
      console.log('Contact sales for Enterprise plan');
    } else {
      // Handle plan selection
      console.log(`Selected ${planName} plan`);
    }
  };

  return (
    <div className={`min-h-[calc(100vh-3.5rem)] ${bgPrimary} -m-4 p-4 sm:p-6 rounded-xl`}>
      <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-2">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`p-2 sm:p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
            <CreditCard className={`w-5 h-5 sm:w-6 sm:h-6 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} />
          </div>
          <div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary}`}>Subscription Plans</h1>
            <p className={`text-[10px] sm:text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Choose the plan that fits your team size and needs
            </p>
          </div>
        </div>
      </div>

      {/* Billing Period Toggle */}
      <div className={`rounded-xl border ${cardClass} p-3 sm:p-4`}>
        <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
          <span className={`text-xs sm:text-sm font-bold ${billingPeriod === 'monthly' ? textPrimary : textSecondary}`}>
            Monthly
          </span>
          <button
            onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
            className={`relative w-12 h-6 sm:w-14 sm:h-7 rounded-full transition-colors ${
              billingPeriod === 'yearly' ? 'bg-[#6B8E23]' : isDark ? 'bg-slate-700' : 'bg-slate-300'
            }`}
            aria-label="Toggle billing period"
          >
            <span
              className={`absolute top-0.5 left-0.5 sm:top-1 sm:left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                billingPeriod === 'yearly' ? 'translate-x-6 sm:translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-xs sm:text-sm font-bold ${billingPeriod === 'yearly' ? textPrimary : textSecondary}`}>
            Yearly
          </span>
          {billingPeriod === 'yearly' && (
            <span className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-bold ${isDark ? 'bg-[#C2D642]/20 text-[#C2D642]' : 'bg-[#C2D642]/20 text-[#a8b835]'}`}>
              Save 17%
            </span>
          )}
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {pricingPlans.map((plan, idx) => (
          <div
            key={idx}
            className={`relative p-4 sm:p-6 rounded-xl border transition-all duration-300 ${
              plan.popular
                ? `border-2 border-[#6B8E23] ${isDark ? 'bg-[#6B8E23]/10' : 'bg-[#6B8E23]/5'} shadow-lg`
                : `${cardClass} hover:border-[#6B8E23] hover:shadow-md`
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-2.5 sm:-top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 sm:px-4 py-0.5 sm:py-1 bg-[#6B8E23] text-white text-[10px] sm:text-xs font-bold rounded-full">
                  POPULAR
                </span>
              </div>
            )}

            <div className="mb-4 sm:mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Zap className={`w-4 h-4 sm:w-5 sm:h-5 ${plan.popular ? 'text-[#6B8E23]' : textSecondary}`} />
                <h3 className={`text-lg sm:text-xl font-black ${textPrimary}`}>{plan.name}</h3>
              </div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className={`text-3xl sm:text-4xl font-black ${plan.popular ? 'text-[#6B8E23]' : textPrimary}`}>
                  {getPrice(plan)}
                </span>
                {getPrice(plan) !== 'Custom' && (
                  <span className={`text-xs sm:text-sm font-bold ${textSecondary}`}>
                    /{billingPeriod === 'monthly' ? 'month' : 'year'}
                  </span>
                )}
              </div>
              {billingPeriod === 'yearly' && getPrice(plan) !== 'Custom' && (
                <p className={`text-[10px] sm:text-xs mt-1 ${textSecondary}`}>
                  Billed annually
                </p>
              )}
            </div>

            <ul className={`space-y-2 sm:space-y-3 mb-4 sm:mb-6 ${textSecondary}`}>
              {plan.features.map((feature, fIdx) => (
                <li key={fIdx} className="flex items-start gap-2">
                  <Check className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 ${plan.popular ? 'text-[#6B8E23]' : textSecondary}`} />
                  <span className="text-xs sm:text-sm leading-relaxed">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelectPlan(plan.name)}
              className={`w-full px-4 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-bold transition-all duration-300 ${
                plan.popular
                  ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white shadow-md'
                  : `border-2 border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23] hover:text-white ${isDark ? 'bg-slate-800/50' : 'bg-white'}`
              }`}
            >
              {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
            </button>
          </div>
        ))}
      </div>

      {/* Additional Info */}
      <div className={`rounded-xl border ${cardClass} p-4 sm:p-6`}>
        <h3 className={`text-base sm:text-lg font-black mb-3 sm:mb-4 ${textPrimary}`}>All Plans Include</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <Check className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 text-[#6B8E23]`} />
            <div>
              <h4 className={`text-sm sm:text-base font-bold mb-1 ${textPrimary}`}>24/7 Support</h4>
              <p className={`text-xs sm:text-sm ${textSecondary} leading-relaxed`}>Round-the-clock assistance for all your needs</p>
            </div>
          </div>
          <div className="flex items-start gap-2 sm:gap-3">
            <Check className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 text-[#6B8E23]`} />
            <div>
              <h4 className={`text-sm sm:text-base font-bold mb-1 ${textPrimary}`}>Regular Updates</h4>
              <p className={`text-xs sm:text-sm ${textSecondary} leading-relaxed`}>Access to latest features and improvements</p>
            </div>
          </div>
          <div className="flex items-start gap-2 sm:gap-3">
            <Check className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 text-[#6B8E23]`} />
            <div>
              <h4 className={`text-sm sm:text-base font-bold mb-1 ${textPrimary}`}>Data Security</h4>
              <p className={`text-xs sm:text-sm ${textSecondary} leading-relaxed`}>Enterprise-grade security and encryption</p>
            </div>
          </div>
          <div className="flex items-start gap-2 sm:gap-3">
            <Check className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 text-[#6B8E23]`} />
            <div>
              <h4 className={`text-sm sm:text-base font-bold mb-1 ${textPrimary}`}>Free Migration</h4>
              <p className={`text-xs sm:text-sm ${textSecondary} leading-relaxed`}>We'll help you migrate your existing data</p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Subscription;
