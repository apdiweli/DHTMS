import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

export default function SummaryCard({ title, value, icon, color, trend, trendValue }) {
  const Icon = icon;

  // Extract base color class for gradients (a simple hack for the provided color props)
  // Assumes color.bg is something like 'bg-indigo-50' -> we want 'indigo'
  const colorName = color.bg.split('-')[1] || 'gray'; 

  const isPositive = trend === 'up';
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;
  
  // Custom styling based on trend
  const trendClasses = isPositive 
    ? 'text-emerald-600 bg-emerald-100/50 dark:bg-emerald-500/10 dark:text-emerald-400' 
    : 'text-rose-600 bg-rose-100/50 dark:bg-rose-500/10 dark:text-rose-400';

  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] transition-all duration-300 group z-0">
      
      {/* Dynamic Background Blob/Glow */}
      <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full bg-${colorName}-400/20 blur-[50px] group-hover:bg-${colorName}-500/30 transition-all duration-700 pointer-events-none`}></div>

      <div className="relative z-10 flex flex-col h-full justify-between">
        
        {/* Header: Icon + Title */}
        <div className="flex justify-between items-start mb-6">
          <div className={`p-3.5 rounded-2xl ${color.bg} ${color.text} backdrop-blur-sm bg-opacity-80 dark:bg-opacity-20 shadow-sm ring-1 ring-black/5 dark:ring-white/10`}>
            <Icon className="w-6 h-6" />
          </div>
          {trendValue && (
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${trendClasses}`}>
               <TrendIcon size={14} strokeWidth={2.5} />
               <span>{trendValue}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div>
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 mb-1">{title}</p>
          <h3 className="text-[2.5rem] leading-none font-bold text-slate-800 dark:text-white tracking-tight group-hover:scale-105 origin-left transition-transform duration-300">
            {value}
          </h3>
        </div>

        {/* Footer Decorative Line */}
        <div className="mt-6 w-full h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full bg-${colorName}-500 w-2/3 rounded-full opacity-80 group-hover:w-full transition-all duration-700 ease-out`}></div>
        </div>
      </div>
    </div>
  );
}