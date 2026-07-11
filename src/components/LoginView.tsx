import React, { useState } from "react";
import { LogIn, ShieldCheck, RefreshCw, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";
import { LogoIcon } from "./LogoIcon";

interface LoginViewProps {
  onLogin: (useRedirect?: boolean, withWorkspaceScopes?: boolean) => void;
  isLoggingIn: boolean;
  error: string | null;
}

export default function LoginView({ onLogin, isLoggingIn, error }: LoginViewProps) {
  const [withWorkspaceScopes] = useState(true);

  const verifyAndTriggerAction = async (actionName: string, callback: (useRedirect?: boolean, withWorkspaceScopes?: boolean) => void, useRedirect?: boolean) => {
    callback(useRedirect, withWorkspaceScopes);
  };

  if (error === "ACCOUNT_NOT_FOUND") {
    return (
      <div className="min-h-screen w-full bg-[#030712] text-gray-100 flex flex-col justify-between p-6 relative overflow-hidden" id="login-container">
        {/* Background ambient light effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <header className="max-w-7xl mx-auto w-full flex items-center justify-between py-4 z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <LogoIcon className="h-6 w-6" />
            <span className="font-sans font-extrabold text-lg tracking-wider text-white uppercase">Life OS</span>
          </div>
        </header>

        {/* Main Block Box */}
        <main className="max-w-md w-full mx-auto my-auto flex flex-col items-center justify-center z-10 space-y-6 py-6 text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center shadow-lg"
          >
            <ShieldAlert className="w-10 h-10 animate-bounce" />
          </motion.div>

          <div className="space-y-3">
            <h2 className="text-2xl font-black tracking-tight text-white uppercase font-sans">
              Account Not Found
            </h2>
            <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
              We couldn't find your account details in our system database. Please create an account using your main Life OS application before attempting to log in.
            </p>
          </div>

          <div className="w-full max-w-sm bg-red-500/5 border border-red-500/10 rounded-2xl p-6 space-y-4">
            <p className="text-sm text-red-300 font-bold uppercase tracking-wider font-mono">
              please create ur account via Life os app
            </p>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold rounded-xl transition-all active:scale-[0.99] text-xs font-mono uppercase tracking-wider cursor-pointer"
            >
              Go Back / Try Again
            </button>
          </div>
        </main>

        <footer className="max-w-7xl mx-auto w-full text-center py-4 z-10 shrink-0">
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest font-mono">
            Powered by Google Cloud Run Container Sandbox & Firestore
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#030712] text-gray-100 flex flex-col justify-between p-6 relative overflow-hidden" id="login-container">
      {/* Background ambient light effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between py-4 z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <LogoIcon className="h-6 w-6" />
          <span className="font-sans font-extrabold text-lg tracking-wider text-white uppercase">Life OS</span>
        </div>
        <span className="text-[10px] font-mono text-gray-500 bg-gray-900/60 border border-gray-800 px-3 py-1 rounded-full uppercase font-bold tracking-wider">
          v2.1.0 Cloud Core
        </span>
      </header>

      {/* Main Content Area */}
      <main className="max-w-sm w-full mx-auto my-auto flex flex-col items-center justify-center z-10 space-y-8 py-6">
        
        {/* Brand visual identity header */}
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="w-24 h-24 mx-auto shadow-xl shadow-blue-500/5 mb-2"
          >
            <LogoIcon className="w-24 h-24 animate-pulse" />
          </motion.div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-white uppercase font-sans">
              Welcome to Life OS
            </h2>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
              Your comprehensive real-time desktop for task planning, pomodoro study sessions, journal writing, and ledger bookkeeping.
            </p>
          </div>
        </div>

        {/* Action Buttons & Standard Error display */}
        <div className="w-full space-y-4">
          <div className="space-y-3 pt-2">
            {error && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Google Auth Connection Failed</p>
                    <p className="opacity-90 font-mono text-[10px] break-all">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Primary Google Login Button */}
            <button
              onClick={() => verifyAndTriggerAction("LOGIN", onLogin, false)}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-850 text-white font-bold rounded-2xl transition-all cursor-pointer shadow-lg shadow-blue-500/20 active:scale-[0.99] text-sm"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                  <span>Connecting Secure Session...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4.5 w-4.5" />
                  <span>Connect via Google Account</span>
                </>
              )}
            </button>
          </div>
          
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500 font-mono pt-2">
            <ShieldCheck className="h-3.5 w-3.5 text-gray-600" />
            <span>Secured by Google OAuth & Firebase</span>
          </div>
        </div>

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
