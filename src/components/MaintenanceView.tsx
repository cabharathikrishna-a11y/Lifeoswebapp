import React from "react";
import { Settings, Sparkles, Clock, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";
import { LogoIcon } from "./LogoIcon";

export default function MaintenanceView() {
  const currentYear = new Date().getFullYear();

  // Polished details of maintenance operations
  const upgrades = [
    {
      title: "Real-Time Sync Engine",
      description: "Fine-tuning cross-device sync protocols between Web and Android companions.",
      status: "Optimizing",
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20"
    },
    {
      title: "Focus Database Clusters",
      description: "Implementing strict 20-hour daily focus caps and 6-hour session limitations.",
      status: "Verifying",
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20"
    },
    {
      title: "A.I. Model Refinement",
      description: "Updating the Deepa AI Core context window for faster intelligent summaries.",
      status: "Completed",
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    }
  ];

  return (
    <div 
      className="relative flex flex-col justify-between min-h-screen bg-[#030712] text-gray-100 overflow-hidden font-sans select-none px-6 py-12"
      id="maintenance-screen"
    >
      {/* Background ambient light glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35rem] h-[35rem] bg-blue-600/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -top-10 -right-10 w-96 h-96 bg-[#090d16] rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header Branding */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <LogoIcon className="h-7 w-7" />
          <span className="font-sans font-extrabold text-sm tracking-widest text-white uppercase">Life OS</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-[10px] font-bold text-red-400 uppercase tracking-wider">
          <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
          <span>Under Maintenance</span>
        </div>
      </header>

      {/* Main Hero Visuals */}
      <main className="w-full max-w-lg mx-auto flex flex-col items-center justify-center text-center py-10 relative z-10 flex-1">
        {/* Animated Gears icon */}
        <div className="relative mb-8 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
            className="p-6 bg-gray-900/50 border border-gray-800 rounded-full shadow-2xl relative z-10"
          >
            <Settings className="w-14 h-14 text-blue-500 stroke-[1.25]" />
          </motion.div>
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
            className="absolute -top-3 -right-3 p-3 bg-[#090d16] border border-gray-800 rounded-full shadow-lg"
          >
            <Settings className="w-6 h-6 text-indigo-400 stroke-[1.5]" />
          </motion.div>
        </div>

        {/* Status titles */}
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase mb-4 leading-tight">
          System <span className="text-blue-500">Upgrade</span> Underway
        </h1>
        <p className="text-sm text-gray-400 leading-relaxed max-w-md mb-10">
          We are currently fine-tuning our live database synchronization, optimizing real-time focus limits, and improving overall app workspace performance. We will be back shortly.
        </p>

        {/* Upgrade Checklist Status */}
        <div className="w-full space-y-3.5 text-left mb-8">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 font-mono">
            Maintenance Checklist
          </h2>
          {upgrades.map((item, idx) => (
            <div 
              key={idx}
              className="p-4 bg-[#090d16]/70 border border-gray-800/60 rounded-2xl flex items-start gap-3.5 hover:border-gray-800 transition-all"
            >
              <div className="mt-0.5 shrink-0">
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <h3 className="text-xs font-bold text-gray-200 truncate">{item.title}</h3>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase border ${item.color}`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-normal">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Live heartbeat indicator */}
        <div className="flex items-center gap-2 bg-[#090d16] px-4 py-2 border border-gray-800/50 rounded-xl">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">
            Database Migration In Progress
          </span>
        </div>
      </main>

      {/* Footer Branding Credit */}
      <footer className="w-full max-w-5xl mx-auto flex items-center justify-between text-center relative z-10 shrink-0 border-t border-gray-900 pt-6">
        <span className="text-[10px] font-mono text-gray-600 uppercase font-bold tracking-wider">
          SYSTEM CLUSTER: ASIA-SE-1
        </span>
        <span className="text-[10px] font-mono text-gray-600 uppercase font-bold tracking-wider">
          &copy; {currentYear} LIFE OS INC.
        </span>
      </footer>
    </div>
  );
}
