import React, { useState } from "react";
import { Sliders, Save, Database, RefreshCw, User, AlertTriangle, ShieldCheck, Settings, ChevronRight, ArrowLeft } from "lucide-react";

interface SystemSettingsViewProps {
  myProfile: { nickname: string; emoji: string };
  onUpdateProfile: (profile: { nickname: string; emoji: string }) => void;
}

export default function SystemSettingsView({ myProfile, onUpdateProfile }: SystemSettingsViewProps) {
  const [activePage, setActivePage] = useState<string | null>(null);
  const [nickname, setNickname] = useState(myProfile.nickname || "User");
  const [emoji, setEmoji] = useState(myProfile.emoji || "👤");
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({ nickname: nickname.trim(), emoji });
    setBackupMsg("Display profile saved successfully.");
    setTimeout(() => setBackupMsg(null), 3000);
  };

  const triggerFullBackup = async () => {
    try {
      const dataToBackup = {
        tasks: JSON.parse(localStorage.getItem("life_os_tasks") || "[]"),
        habits: JSON.parse(localStorage.getItem("life_os_habits") || "[]"),
        journal_entries: JSON.parse(localStorage.getItem("life_os_journal_entries") || "[]"),
        finance_ledger: JSON.parse(localStorage.getItem("life_os_finance_ledger") || "[]"),
        keep_notes: JSON.parse(localStorage.getItem("life_os_keep_notes") || "[]"),
        files: JSON.parse(localStorage.getItem("life_os_files") || "[]"),
        contacts: JSON.parse(localStorage.getItem("life_os_contacts") || "[]")
      };

      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToBackup)
      });

      const result = await res.json();
      if (result.success) {
        setBackupMsg("System database backup saved securely to cloud server.");
      } else {
        setBackupMsg("Backup failed: " + result.error);
      }
      setTimeout(() => setBackupMsg(null), 4000);
    } catch (e: any) {
      setBackupMsg("Error executing backup: " + e.message);
      setTimeout(() => setBackupMsg(null), 4000);
    }
  };

  const triggerFullRestore = async () => {
    if (!window.confirm("Warning: Restoring backup will overwrite all current local data. Continue?")) return;
    try {
      const res = await fetch("/api/restore");
      const result = await res.json();
      if (result.success && result.data) {
        const d = result.data;
        if (d.tasks) localStorage.setItem("life_os_tasks", JSON.stringify(d.tasks));
        if (d.habits) localStorage.setItem("life_os_habits", JSON.stringify(d.habits));
        if (d.journal_entries) localStorage.setItem("life_os_journal_entries", JSON.stringify(d.journal_entries));
        if (d.finance_ledger) localStorage.setItem("life_os_finance_ledger", JSON.stringify(d.finance_ledger));
        if (d.keep_notes) localStorage.setItem("life_os_keep_notes", JSON.stringify(d.keep_notes));
        if (d.files) localStorage.setItem("life_os_files", JSON.stringify(d.files));
        if (d.contacts) localStorage.setItem("life_os_contacts", JSON.stringify(d.contacts));

        setBackupMsg("System database restored from backup successfully! Reloading page...");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setBackupMsg("No backup file found on server: " + (result.message || ""));
      }
      setTimeout(() => setBackupMsg(null), 4000);
    } catch (e: any) {
      setBackupMsg("Error executing restore: " + e.message);
      setTimeout(() => setBackupMsg(null), 4000);
    }
  };

  const purgeCache = () => {
    if (window.confirm("Warning: This will delete ALL local storage data for all modules. This is irreversible. Continue?")) {
      localStorage.clear();
      setBackupMsg("Local cache purged. Resetting database...");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  if (activePage === 'profile') {
    return (
      <div className="max-w-2xl mx-auto h-full space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <button onClick={() => setActivePage(null)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-bold tracking-wider">
          <ArrowLeft size={16} /> BACK TO SETTINGS
        </button>
        
        <div className="bg-[#09090C] border border-gray-900 rounded-2xl p-6 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0" />
          
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white">AI & User Profile</h2>
            <p className="text-xs text-gray-500 mt-1">Personalize your identity across the ecosystem</p>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-5">
            <div className="grid grid-cols-4 gap-4 items-end">
              <div className="col-span-1">
                <label className="block text-[10px] font-mono text-gray-500 uppercase mb-2">Avatar</label>
                <select
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  className="w-full bg-[#121216] border border-gray-800 text-base p-2 rounded-xl outline-none text-white h-12 text-center focus:border-cyan-500/50 transition-colors"
                >
                  <option value="👤">👤</option>
                  <option value="🧘">🧘</option>
                  <option value="💻">💻</option>
                  <option value="🚀">🚀</option>
                  <option value="🔥">🔥</option>
                  <option value="🤖">🤖</option>
                  <option value="⭐">⭐</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-[10px] font-mono text-gray-500 uppercase mb-2">Display Nickname</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-[#121216] border border-gray-800 focus:border-cyan-500/50 text-sm px-4 h-12 rounded-xl outline-none text-white transition-all font-bold"
                  required
                />
              </div>
            </div>

            {backupMsg && (
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs rounded-xl flex items-center gap-2 font-mono">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>{backupMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full h-12 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-600/20"
            >
              <Save className="h-4 w-4" /> SAVE PROFILE PREFERENCES
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (activePage === 'data') {
    return (
      <div className="max-w-2xl mx-auto h-full space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <button onClick={() => setActivePage(null)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-bold tracking-wider">
          <ArrowLeft size={16} /> BACK TO SETTINGS
        </button>

        <div className="bg-[#09090C] border border-gray-900 rounded-2xl p-6 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/0 via-amber-500/50 to-amber-500/0" />
          
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Data & Connections</h2>
            <p className="text-xs text-gray-500 mt-1">JSON backup/restore, Drive sync, permissions, database tools</p>
          </div>

          {backupMsg && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-xl flex items-center gap-2 font-mono">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>{backupMsg}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={triggerFullBackup}
                className="flex-1 h-12 bg-[#121216] border border-gray-800 hover:border-amber-500/50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Database className="h-4 w-4 text-amber-500" /> BACKUP DATABASE
              </button>
              <button
                onClick={triggerFullRestore}
                className="flex-1 h-12 bg-[#121216] border border-gray-800 hover:border-amber-500/50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="h-4 w-4 text-emerald-400" /> RESTORE DATABASE
              </button>
            </div>

            <div className="border-t border-gray-800 pt-5 space-y-3 mt-4">
              <div className="flex items-center gap-2 text-[10px] font-mono text-red-400 uppercase font-bold">
                <AlertTriangle className="h-4 w-4" /> Danger Zone
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Purging local data will clear all stored checklists, custom financial logs, and sticky notes completely. This action cannot be reversed.
              </p>
              <button
                onClick={purgeCache}
                className="w-full h-12 bg-red-950/30 border border-red-900/50 hover:bg-red-900/50 hover:border-red-500/50 text-red-400 text-xs font-bold rounded-xl flex items-center justify-center transition-all cursor-pointer"
              >
                PURGE LOCAL CACHE & DATABASE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto h-full space-y-6 select-none animate-in fade-in duration-300">
      
      {/* Header matching Android */}
      <div className="bg-[#09090C] rounded-2xl p-5 border border-blue-500/20 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-blue-500/15 p-3 rounded-full text-blue-500 border border-blue-500/30">
            <Settings size={22} />
          </div>
          <div>
            <h1 className="text-white font-black text-base tracking-wide uppercase">Settings Center</h1>
            <p className="text-gray-400 text-xs mt-1">Configure and personalize your localized Life OS experience.</p>
          </div>
        </div>
      </div>

      {/* Group 1: Core Settings */}
      <div className="bg-[#09090C] rounded-2xl border border-gray-900 shadow-xl overflow-hidden">
        <div className="bg-[#121216] px-5 py-3 border-b border-gray-900">
          <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Core Settings</h2>
        </div>
        
        <div className="p-2">
          {/* SYSTEM & DIAGNOSTICS */}
          <button className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-xl text-left transition-colors cursor-not-allowed opacity-50 group">
            <div className="flex items-center gap-4">
              <div className="bg-blue-500 p-2.5 rounded-full text-black"><Settings size={20} /></div>
              <div>
                <div className="text-white font-bold text-sm tracking-wide">SYSTEM & DIAGNOSTICS</div>
                <div className="text-gray-500 text-xs mt-0.5">General options, background diagnostics, updates</div>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-600" />
          </button>
          
          <div className="h-px bg-gray-900 ml-16 mr-4 my-1" />

          {/* AI & USER PROFILE */}
          <button onClick={() => setActivePage('profile')} className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-xl text-left transition-colors group">
            <div className="flex items-center gap-4">
              <div className="bg-cyan-400 p-2.5 rounded-full text-black"><User size={20} /></div>
              <div>
                <div className="text-white font-bold text-sm tracking-wide group-hover:text-cyan-400 transition-colors">AI & USER PROFILE</div>
                <div className="text-gray-500 text-xs mt-0.5">Personalize profile, edit nickname, identity</div>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-600 group-hover:text-cyan-400 transition-colors" />
          </button>

          <div className="h-px bg-gray-900 ml-16 mr-4 my-1" />

          {/* DATA & CONNECTIONS */}
          <button onClick={() => setActivePage('data')} className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-xl text-left transition-colors group">
            <div className="flex items-center gap-4">
              <div className="bg-amber-500 p-2.5 rounded-full text-black"><Database size={20} /></div>
              <div>
                <div className="text-white font-bold text-sm tracking-wide group-hover:text-amber-500 transition-colors">DATA & CONNECTIONS</div>
                <div className="text-gray-500 text-xs mt-0.5">JSON backup/restore, cache, database tools</div>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-600 group-hover:text-amber-500 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}
