
import React, { useState, useRef, useEffect } from 'react';
/* Added Activity to imports */
import { Send, Sparkles, User, Bot, RotateCcw, BrainCircuit, Maximize2, Activity } from 'lucide-react';
import { generateHealthAdvice } from '../services/gemini';
import { Message } from '../types';

const AICoach: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm Koncite AI, your construction management assistant. How can I help you manage your construction projects today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await generateHealthAdvice(input);
      setMessages(prev => [...prev, { role: 'assistant', content: response || "I'm sorry, I couldn't process that. Try again?" }]);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.message?.includes('API key') 
        ? "⚠️ Gemini API key is not configured. Please create a .env.local file in the project root and add: GEMINI_API_KEY=your_api_key_here"
        : "Oops, looks like there was an issue processing your request. Please try again later.";
      setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col gap-6 animate-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Koncite AI Coach <Sparkles className="w-6 h-6 text-indigo-500" />
          </h1>
          <p className="text-slate-500 mt-1">24/7 construction management assistance powered by AI.</p>
        </div>
        <div className="flex gap-2">
          <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-all" title="Reset Session">
            <RotateCcw className="w-5 h-5" />
          </button>
          <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-all">
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col overflow-hidden">
        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30"
        >
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[80%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-indigo-600' : 'bg-slate-900 shadow-md shadow-slate-200'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                    : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center animate-pulse">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-slate-100">
          <div className="relative flex items-center gap-3">
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about construction management, documents, labour, or project operations..." 
                className="w-full pl-6 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Quick Actions:</span>
            {['Plan HIIT Workout', 'Analyze my macros', 'Sleep tips'].map(action => (
              <button 
                key={action}
                onClick={() => setInput(action)}
                className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: BrainCircuit, title: 'Deep Knowledge', desc: 'Expertise across sports science and dietetics.' },
          { icon: Sparkles, title: 'Personalized', desc: 'Advice tailored to your unique biometrics.' },
          { icon: Activity, title: 'Data-Driven', desc: 'Integrated with your real-time activity logs.' },
        ].map((feat, i) => (
          <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-100">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <feat.icon className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-sm text-slate-900">{feat.title}</h5>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{feat.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AICoach;
