
import React from 'react';
import { Apple, Plus, Camera, PieChart, Info, Trash2, Edit2, Flame, Droplet, Beef, Wheat } from 'lucide-react';

const Nutrition: React.FC = () => {
  const macros = [
    { label: 'Protein', current: 120, target: 160, unit: 'g', color: 'bg-emerald-500', icon: Beef },
    { label: 'Carbs', current: 210, target: 280, unit: 'g', color: 'bg-orange-500', icon: Wheat },
    { label: 'Fats', current: 55, target: 75, unit: 'g', color: 'bg-indigo-500', icon: Droplet },
  ];

  const meals = [
    { name: 'Oatmeal with Berries', calories: 350, protein: 12, carbs: 65, fats: 8, time: '08:30 AM', type: 'Breakfast' },
    { name: 'Grilled Chicken Salad', calories: 420, protein: 45, carbs: 12, fats: 22, time: '01:15 PM', type: 'Lunch' },
    { name: 'Protein Shake', calories: 180, protein: 30, carbs: 5, fats: 3, time: '04:00 PM', type: 'Snack' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Nutrition Hub</h1>
          <p className="text-slate-500 mt-1">Fuelling your potential. 1,650 / 2,400 kcal remaining.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 transition-all">
            <Camera className="w-4 h-4" /> AI Snap Log
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
            <Plus className="w-4 h-4" /> Add Meal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Daily Summary */}
        <div className="lg:col-span-2 space-y-8">
          {/* Main Calorie Ring Card */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-12">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="80" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                <circle 
                  cx="96" 
                  cy="96" 
                  r="80" 
                  stroke="#6366f1" 
                  strokeWidth="12" 
                  strokeDasharray={2 * Math.PI * 80}
                  strokeDashoffset={2 * Math.PI * 80 * (1 - 1650/2400)}
                  strokeLinecap="round" 
                  fill="none" 
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-black">1,650</span>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">kcal left</span>
              </div>
            </div>
            
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase mb-2">
                  <Flame className="w-3.5 h-3.5 text-orange-500" /> Burned Today
                </div>
                <div className="text-2xl font-bold">2,420 <span className="text-xs text-slate-400 font-medium">kcal</span></div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase mb-2">
                  <Droplet className="w-3.5 h-3.5 text-blue-500" /> Hydration
                </div>
                <div className="text-2xl font-bold">2.4 <span className="text-xs text-slate-400 font-medium">Liters</span></div>
              </div>
            </div>
          </div>

          {/* Meal List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xl">Recent Meals</h3>
              <button className="text-indigo-600 text-sm font-bold hover:underline">See Analysis</button>
            </div>
            <div className="space-y-3">
              {meals.map((meal, i) => (
                <div key={i} className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden">
                      <img src={`https://picsum.photos/seed/${meal.name}/100/100`} alt={meal.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{meal.name}</h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">{meal.type} • {meal.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right hidden sm:block">
                      <p className="text-lg font-bold text-slate-900">{meal.calories}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Calories</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Macros & Insights */}
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-lg mb-6">Macro Distribution</h3>
            <div className="space-y-8">
              {macros.map((macro, i) => {
                const Icon = macro.icon;
                const progress = (macro.current / macro.target) * 100;
                return (
                  <div key={i} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${macro.color}/10`}>
                          <Icon className={`w-4 h-4 ${macro.color.replace('bg-', 'text-')}`} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{macro.label}</p>
                          <p className="text-xs text-slate-500">{macro.current}g of {macro.target}g</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-400">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${macro.color} rounded-full transition-all duration-1000`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-emerald-600 p-6 rounded-3xl shadow-xl shadow-emerald-100 text-white relative overflow-hidden">
            <div className="relative z-10">
              <PieChart className="w-8 h-8 text-white/40 mb-4" />
              <h4 className="font-bold text-lg">Smart Suggestion</h4>
              <p className="text-emerald-50 text-sm mt-2 leading-relaxed opacity-90">
                You're low on Protein today. Consider adding a scoop of whey or a Greek yogurt for your next snack to reach your recovery goal.
              </p>
              <button className="mt-4 px-4 py-2 bg-white text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-all">
                Add Recommended
              </button>
            </div>
            <Apple className="absolute -bottom-6 -right-6 w-32 h-32 text-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Nutrition;
