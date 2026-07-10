import React, { useState } from "react";
import { LogIn, Landmark, Cloud, BellRing, HardDrive, ShieldCheck, Sparkles, RefreshCw, ShieldAlert, Copy, Check, ExternalLink, Users, ArrowRight, UserCheck } from "lucide-react";
import { motion } from "motion/react";
import firebaseConfig from "../../firebase-applet-config.json";

interface LoginViewProps {
  onLogin: () => void;
  isLoggingIn: boolean;
  error: string | null;
}

export default function LoginView({ onLogin, isLoggingIn, error }: LoginViewProps) {
  const [copiedCurrent, setCopiedCurrent] = useState(false);
  const [copiedDev, setCopiedDev] = useState(false);
  const [copiedPre, setCopiedPre] = useState(false);

  // reCAPTCHA states disabled

  const currentHostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isUnauthorizedDomain = error && (error.includes("auth/unauthorized-domain") || error.includes("unauthorized-domain"));

  // Extracted dynamically from metadata / common paths
  let devDomain = "ais-dev-4aiasr6cf45665loordfzj-974471247877.asia-southeast1.run.app";
  let preDomain = "ais-pre-4aiasr6cf45665loordfzj-974471247877.asia-southeast1.run.app";

  if (currentHostname) {
    if (currentHostname.includes("-dev-")) {
      devDomain = currentHostname;
      preDomain = currentHostname.replace("-dev-", "-pre-");
    } else if (currentHostname.includes("-pre-")) {
      preDomain = currentHostname;
      devDomain = currentHostname.replace("-pre-", "-dev-");
    }
  }

  const copyToClipboard = async (text: string, setCopiedState: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const firebaseAuthSettingsUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;

  const verifyAndTriggerAction = async (actionName: string, callback: () => void) => {
    callback();
  };

  return (
    <div className="min-h-screen w-full bg-[#030712] text-gray-100 flex flex-col justify-between p-6 relative overflow-hidden" id="login-container">
      {/* Background ambient light effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between py-4 z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-6 w-6 text-blue-400" />
          <span className="font-sans font-extrabold text-lg tracking-wider text-white uppercase">Life OS</span>
        </div>
        <span className="text-[10px] font-mono text-gray-500 bg-gray-900/60 border border-gray-800 px-3 py-1 rounded-full uppercase font-bold tracking-wider">
          v2.1.0 Cloud Core
        </span>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md w-full mx-auto my-auto flex flex-col items-center justify-center z-10 space-y-6 py-6">
        
        {/* Brand visual identity header */}
        <div className="text-center space-y-3">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="w-20 h-20 rounded-2xl bg-[#090d16] border border-gray-800/80 flex items-center justify-center mx-auto shadow-xl shadow-blue-500/5 p-2 overflow-hidden"
          >
            <Sparkles className="w-10 h-10 text-blue-400 animate-pulse" />
          </motion.div>
          
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-white uppercase font-sans">
              Welcome to Life OS
            </h2>
            <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
              Your comprehensive real-time desktop for task planning, pomodoro study sessions, journal writing, and ledger bookkeeping.
            </p>
          </div>
        </div>

        {/* Feature Highlights Grid - Only shown if no error or not unauthorized-domain */}
        {!isUnauthorizedDomain && (
          <div className="w-full space-y-3">
            <div className="p-4 bg-gray-900/30 border border-gray-800/80 rounded-2xl flex items-start gap-3.5 hover:border-gray-750 transition-all">
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/10 shrink-0 mt-0.5">
                <Cloud className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Real-time Multi-Device Sync</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Connect seamlessly with Firebase RTDB to sync your Pomodoro countdowns, metrics, and diaries across all screen containers instantly.
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-900/30 border border-gray-800/80 rounded-2xl flex items-start gap-3.5 hover:border-gray-750 transition-all">
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/10 shrink-0 mt-0.5">
                <BellRing className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Peer Study Reminders</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  See real-time focus activities of online friends, and ping study chime signals to help each other stay accountable.
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-900/30 border border-gray-800/80 rounded-2xl flex items-start gap-3.5 hover:border-gray-750 transition-all">
              <div className="p-2 bg-green-500/10 rounded-xl text-green-400 border border-green-500/10 shrink-0 mt-0.5">
                <HardDrive className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Google Drive Documents Explorer</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Unlock direct file imports! Seamlessly browse and transfer cloud PDF spreadsheets and photos straight into your local workspace.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons & Standard Error display */}
        <div className="w-full space-y-4">
          <div className="space-y-3 pt-2">
            {error && !isUnauthorizedDomain && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Google Auth Connection Failed</p>
                    <p className="opacity-90 font-mono text-[10px] break-all">{error}</p>
                  </div>
                </div>
                {(error.includes("auth/internal-error") || error.includes("internal-error")) && (
                  <div className="mt-2 p-2.5 bg-gray-950/60 rounded-lg border border-red-500/15 text-[10.5px] text-gray-300 space-y-1.5 leading-relaxed">
                    <p className="font-bold text-red-300">💡 Dynamic Iframe Constraint Detected:</p>
                    <p>
                      Chrome and other browsers block popup authentication within embedded sandboxed iframes. To resolve this:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-gray-400">
                      <li>
                        Click the <span className="font-bold text-white">"Open in New Tab"</span> button at the top right of the preview pane to run outside the iframe.
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Primary Google Login Button */}
            <button
              onClick={() => verifyAndTriggerAction("LOGIN", onLogin)}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold rounded-2xl transition-all cursor-pointer shadow-lg shadow-blue-500/25 active:scale-[0.99]"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                  <span>Configuring Cloud Session...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4.5 w-4.5" />
                  <span>Connect via Google Sync</span>
                </>
              )}
            </button>
          </div>
          
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500 font-mono">
            <ShieldCheck className="h-3.5 w-3.5 text-gray-600" />
            <span>Authenticated and secured by Google OAuth & Firebase auth</span>
          </div>
        </div>

        {/* Actionable Authorized Domain Guide */}
        {isUnauthorizedDomain && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-orange-950/20 border border-orange-500/20 p-5 rounded-2xl space-y-4"
          >
            <div className="flex items-start gap-2 text-orange-400">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-left">Domain Authorization Required</h4>
                <p className="text-[11px] text-gray-300 leading-relaxed text-left">
                  Firebase Authentication restricts logins to verified domains. To unlock native Google Sync, you must add the active container domains to your Firebase Console settings.
                </p>
              </div>
            </div>

            {/* Direct Link button */}
            <a 
              href={firebaseAuthSettingsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 p-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-300 rounded-xl text-xs font-bold transition-all text-left"
            >
              <span className="flex items-center gap-1.5">
                Go to Firebase Auth Settings
              </span>
              <ExternalLink className="h-4 w-4" />
            </a>

            <div className="space-y-3 pt-1 text-left">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">
                Authorized Domains to Add:
              </p>

              {/* Dynamic current domain */}
              {currentHostname && (
                <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-850 flex items-center justify-between gap-3 font-mono text-[10.5px]">
                  <span className="text-gray-300 truncate font-bold">{currentHostname}</span>
                  <button
                    onClick={() => copyToClipboard(currentHostname, setCopiedCurrent)}
                    className="p-1.5 hover:bg-gray-900 border border-gray-850 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
                    title="Copy hostname"
                  >
                    {copiedCurrent ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              )}

              {/* Dev URL Domain */}
              {currentHostname !== devDomain && (
                <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-850 flex items-center justify-between gap-3 font-mono text-[10.5px]">
                  <span className="text-gray-400 truncate">ais-dev-...run.app</span>
                  <button
                    onClick={() => copyToClipboard(devDomain, setCopiedDev)}
                    className="p-1.5 hover:bg-gray-900 border border-gray-850 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
                    title="Copy development domain"
                  >
                    {copiedDev ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              )}

              {/* Pre URL Domain */}
              {currentHostname !== preDomain && (
                <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-850 flex items-center justify-between gap-3 font-mono text-[10.5px]">
                  <span className="text-gray-400 truncate">ais-pre-...run.app</span>
                  <button
                    onClick={() => copyToClipboard(preDomain, setCopiedPre)}
                    className="p-1.5 hover:bg-gray-900 border border-gray-850 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
                    title="Copy preview domain"
                  >
                    {copiedPre ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              )}
            </div>

            <p className="text-[10px] text-gray-400 leading-relaxed pt-1 italic text-left">
              * In the Firebase Console, click "Add domain" under "Authorized domains" and paste each of the above domains. No reload of this page is required after saving!
            </p>
          </motion.div>
        )}

      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full text-center py-4 z-10 shrink-0">
        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest font-mono">
          Powered by Google Cloud Run Container Sandbox & Firestore
        </p>
      </footer>
    </div>
  );
}
