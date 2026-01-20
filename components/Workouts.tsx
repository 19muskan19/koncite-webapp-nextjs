
import React, { useState } from 'react';
/* Added TrendingUp to imports */
import { Dumbbell, Plus, Play, Info, Sparkles, Clock, Flame, TrendingUp } from 'lucide-react';
import { generateWorkoutPlan } from '../services/gemini';

const Workouts: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [goal, setGoal] = useState('');

  const handleGenerate = async () => {
    if (!goal) return;
    setIsGenerating(true);
    try {
      const plan = await generateWorkoutPlan(goal);
      setAiResult(plan);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const categories = ['All', 'Strength', 'Cardio', 'Yoga', 'HIIT', 'Mobility'];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Your Workouts</h1>
          <p className="text-slate-500 mt-1">Ready to break a sweat? Choose your session or generate a new one.</p>
        </div>
      </div>

      {/* AI Generator Section */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-3xl text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-200" />
            <span className="text-indigo-100 font-semibold tracking-wider text-sm uppercase">AI Workout Architect</span>
          </div>
          <h2 className="text-2xl font-bold mb-4">Personalized Training on Demand</h2>
          <p className="text-indigo-100 mb-6 opacity-90">
            Tell PulseAI your goals, available equipment, and time. We'll build a science-backed routine tailored just for you.
          </p>
          <div className="flex gap-3">
            <input 
              type="text" 
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g., 30 min home HIIT for fat loss with no equipment"
              className="flex-1 px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all backdrop-blur-sm"
            />
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-6 py-3 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 transition-all flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              {isGenerating ? 'Architecting...' : 'Generate Plan'}
            </button>
          </div>
        </div>
        <Dumbbell className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 rotate-12" />
      </div>

      {/* AI Result Modal (In-page) */}
      {aiResult && (
        <div className="bg-white border border-indigo-100 rounded-2xl p-6 shadow-lg animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">{aiResult.workoutName}</h3>
            <div className="flex gap-3">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold flex items-center gap-1">
                <Clock className="w-3 h-3" /> {aiResult.duration}m
              </span>
              <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-bold flex items-center gap-1">
                <Flame className="w-3 h-3" /> {aiResult.intensity}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiResult.exercises.map((ex: any, idx: number) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900">{ex.name}</p>
                <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                  <span>{ex.sets} sets</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span>{ex.reps}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span>Rest: {ex.rest}</span>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setAiResult(null)}
            className="mt-6 text-sm text-slate-400 hover:text-slate-600"
          >
            Clear generated plan
          </button>
        </div>
      )}

      {/* Library */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xl">Workout Library</h3>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {categories.map((cat) => (
              <button key={cat} className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all whitespace-nowrap">
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { name: 'Morning Power Flow', type: 'Yoga', time: '20m', difficulty: 'Beginner', image: 'yoga' },
            { name: 'Full Body HIIT', type: 'Cardio', time: '45m', difficulty: 'Advanced', image: 'hiit' },
            { name: 'Core Crusher', type: 'Strength', time: '15m', difficulty: 'Intermediate', image: 'core' },
            { name: 'Leg Day Blast', type: 'Strength', time: '60m', difficulty: 'Intermediate', image: 'legs' },
            { name: 'Mobility Routine', type: 'Stretching', time: '10m', difficulty: 'Beginner', image: 'stretch' },
            { name: 'Sprint Interval', type: 'Running', time: '30m', difficulty: 'Advanced', image: 'run' },
          ].map((workout, i) => (
            <div key={i} className="group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="relative h-48">
                <img 
                  src={`https://picsum.photos/seed/${workout.image}/600/400`} 
                  alt={workout.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full">
                  <span className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">{workout.type}</span>
                </div>
              </div>
              <div className="p-5">
                <h4 className="font-bold text-lg group-hover:text-indigo-600 transition-colors">{workout.name}</h4>
                <div className="flex items-center gap-4 mt-3 text-sm text-slate-500 font-medium">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {workout.time}
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" /> {workout.difficulty}
                  </div>
                </div>
                <button className="w-full mt-5 py-2.5 bg-slate-50 text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Play className="w-4 h-4" /> Start Workout
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Workouts;
