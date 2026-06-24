/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, Cpu } from 'lucide-react';
import { AgentProgress } from '../types';
import { motion } from 'motion/react';

interface AgentStepperProps {
  agents: AgentProgress[];
}

export default function AgentStepper({ agents }: AgentStepperProps) {
  const completedCount = agents.filter(a => a.status === 'completed').length;
  const progressPercent = agents.length > 0 ? (completedCount / agents.length) * 100 : 0;

  return (
    <div className="max-w-xl w-full mx-auto space-y-6 pt-6 pb-12">
      
      {/* Stage Header Info */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-2.5 text-center"
      >
        <div className="w-12 h-12 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-sm relative">
          <Cpu className="w-6 h-6 animate-pulse" />
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center">
            <span className="text-[8px] text-white font-sans font-bold leading-none">AI</span>
          </div>
        </div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-zinc-100 font-sans mt-3">
          Running Real Multi-Agent Analysis
        </h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
          Our distributed agents are actively analyzing, auditing, and generating custom reports for your requested repository.
        </p>
      </motion.div>

      {/* Stepper Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-5 relative"
      >
        <div className="absolute top-0 right-0 w-24 h-[1px] bg-gradient-to-r from-transparent to-emerald-500/20" />
        
        <div className="space-y-3.5" role="list" aria-label="Analysis agent progress">
          {agents.map((agent, i) => {
            let statusClass = 'border-slate-100 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 opacity-60 bg-slate-50/30 dark:bg-zinc-950/20';
            let statusIcon = <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-600" />;
            let borderHighlight = 'border-slate-200/60 dark:border-zinc-800/60';

            if (agent.status === 'running') {
              statusClass = 'border-emerald-200 dark:border-emerald-900 text-slate-800 dark:text-zinc-200 opacity-100 ring-4 ring-emerald-50 dark:ring-emerald-950/20 bg-emerald-50/20 dark:bg-emerald-950/10';
              statusIcon = (
                <div className="relative flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 absolute animate-ping" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400 relative z-10" />
                </div>
              );
              borderHighlight = 'border-emerald-300/80 dark:border-emerald-800/80';
            } else if (agent.status === 'completed') {
              statusClass = 'border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-300 opacity-90 bg-white dark:bg-zinc-900/40';
              statusIcon = <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
              borderHighlight = 'border-slate-200 dark:border-zinc-800';
            }

            return (
              <motion.div 
                key={agent.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
                className={`p-3.5 rounded-lg border transition-all duration-300 flex items-start gap-3.5 ${statusClass} ${borderHighlight}`}
                role="listitem"
                aria-current={agent.status === 'running' ? 'step' : undefined}
              >
                {/* Visual line step badge - no preview step numbers */}
                <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-xs bg-slate-50 dark:bg-zinc-950 font-semibold text-slate-600 dark:text-zinc-400">
                  {agent.status === 'completed' ? statusIcon : (
                    agent.status === 'running' ? statusIcon : <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-600" />
                  )}
                </div>

                {/* Info block */}
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-[11px] font-bold uppercase tracking-normal text-slate-700 dark:text-zinc-300">
                      {agent.name}
                    </span>
                    <span className="text-[9px] font-sans leading-none tracking-normal uppercase font-bold text-emerald-600 dark:text-emerald-400">
                      {agent.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal font-sans">
                    {agent.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Outer Linear loading progress bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-[10px] font-sans font-semibold text-slate-400 dark:text-zinc-500">
            <span>PIPELINE DISPATCHED</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div
            className="bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden w-full relative"
            role="progressbar"
            aria-label="Analysis progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPercent)}
          >
            <motion.div 
              className="bg-emerald-500 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        <div className="text-center pt-1 animate-pulse">
          <span className="text-[9px] font-sans text-slate-400 dark:text-zinc-500 uppercase tracking-tight">
            * Calling Google backend servers for live analysis and web insights validation
          </span>
        </div>

      </motion.div>

    </div>
  );
}
