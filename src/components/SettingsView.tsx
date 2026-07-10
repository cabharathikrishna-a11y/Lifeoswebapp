import React, { useState, useEffect } from "react";
import { Deadline } from "../types.ts";
import { 
  Calendar, Save, Download, RefreshCw, Trash2, ShieldAlert, CheckCircle2, Circle, 
  Plus, Info, CheckSquare, LogIn, LogOut, Cloud, Bell, Key, Copy, Send, Check, Terminal 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { store } from "../lib/store.ts";
import { User } from "firebase/auth";
import { 
  updateMyProfile,
  requestNotificationPermission, 
  registerFCMServiceWorker, 
  onFCMRegistered, 
  getFCMToken, 
  onFCMForegroundMessage,
  checkFCMSupport,
  logFirebaseEvent
} from "../lib/firebase.ts";

interface SettingsViewProps {
  deadlines: Deadline[];
  onDeadlinesChange: (deadlines: Deadline[]) => void;
  onHardReset: () => void;
  currentUser: User | null;
  onLogin: () => void;
  onLogout: () => void;
  myProfile?: { nickname: string; emoji: string };
}

export default function SettingsView({ 
  deadlines, 
  onDeadlinesChange, 
  onHardReset,
  currentUser,
  onLogin,
  onLogout,
  myProfile = { nickname: "User", emoji: "👨‍💻" }
}: SettingsViewProps) {
  // Focus Profile customization state
  const [profileNickname, setProfileNickname] = useState(myProfile.nickname);
  const [profileEmoji, setProfileEmoji] = useState(myProfile.emoji);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState(false);

  // Firebase Cloud Messaging (FCM) state
  const [isFcmSupported, setIsFcmSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default");
  const [vapidKey, setVapidKey] = useState(() => localStorage.getItem("fcm_vapid_key") || "BPlz7gC8gY-yRptUe_7q6y88nI1Gf8t-82ZlF57s5v1C9a3x6v7b8n9m0a1s2d3f4g5h6j7k8l9o_b7v6c5x4z"); // Default demo/sandbox VAPID key
  const [installationId, setInstallationId] = useState(() => localStorage.getItem("fcm_installation_id") || "");
  const [registrationToken, setRegistrationToken] = useState(() => localStorage.getItem("fcm_registration_token") || "");
  const [fcmStatus, setFcmStatus] = useState<"idle" | "registering" | "registered" | "error">("idle");
  const [fcmErrorMessage, setFcmErrorMessage] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [foregroundMessages, setForegroundMessages] = useState<any[]>([]);

  // Initialize FCM support & permission check on mount
  useEffect(() => {
    checkFCMSupport().then((supported) => {
      setIsFcmSupported(supported);
      if (supported && "Notification" in window) {
        setNotificationPermission(Notification.permission);
      } else {
        setNotificationPermission("unsupported");
      }
    });

    // Listen for foreground messages
    const unsubscribeMessage = onFCMForegroundMessage((payload) => {
      console.log("[SettingsView] Received foreground message:", payload);
      setForegroundMessages((prev) => [payload, ...prev].slice(0, 5));
      
      // Log Recommended Firebase Analytics event
      logFirebaseEvent("notification_received", {
        title: payload.notification?.title || "No Title",
        body: payload.notification?.body || "No Body",
        foreground: true
      });

      // Trigger native notification if permission is granted
      if (Notification.permission === "granted") {
        new Notification(payload.notification?.title || "Life OS Update", {
          body: payload.notification?.body || "You received a foreground message!",
          icon: "https://api.dicebear.com/7.x/bottts/svg?seed=LifeOS",
        });
      }
    });

    // Listen for registration ID callback
    const unsubscribeRegister = onFCMRegistered((id) => {
      console.log("[SettingsView] Registration Callback received FID:", id);
      setInstallationId(id);
      localStorage.setItem("fcm_installation_id", id);
      setFcmStatus("registered");
    });

    return () => {
      unsubscribeMessage();
      unsubscribeRegister();
    };
  }, []);

  const handleRequestPermission = async () => {
    try {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
    } catch (err: any) {
      console.error("Error requesting permission:", err);
      alert(err.message || "Failed to request notification permission.");
    }
  };

  const handleRegisterFCM = async () => {
    if (!vapidKey.trim()) {
      alert("Please enter a valid VAPID Key first.");
      return;
    }
    setFcmStatus("registering");
    setFcmErrorMessage("");
    localStorage.setItem("fcm_vapid_key", vapidKey);
    try {
      // 1. Ensure permission is granted
      if (Notification.permission !== "granted") {
        const perm = await requestNotificationPermission();
        setNotificationPermission(perm);
        if (perm !== "granted") {
          throw new Error("Notification permission denied by user.");
        }
      }

      // 2. Register service worker with FCM using specified VAPID key
      await registerFCMServiceWorker(vapidKey);
      
      // 3. Traditional Token fetch as fallback/secondary representation
      const token = await getFCMToken(vapidKey);
      if (token) {
        setRegistrationToken(token);
        localStorage.setItem("fcm_registration_token", token);
      }
      
      setFcmStatus("registered");
    } catch (err: any) {
      console.error("FCM registration failed:", err);
      setFcmStatus("error");
      setFcmErrorMessage(err.message || "An error occurred during registration. Check service worker or console logs.");
    }
  };

  const handleSimulateNotification = () => {
    if (Notification.permission !== "granted" && notificationPermission !== "granted") {
      alert("Please grant notification permission first.");
      return;
    }
    
    // Show local browser notification
    try {
      new Notification("🎯 Life OS Push Check", {
        body: "Fantastic! This is a test push notification simulated from your Life OS client setup.",
        icon: "https://api.dicebear.com/7.x/bottts/svg?seed=LifeOS",
      });
    } catch (e) {
      console.warn("Direct Notification creation failed, falls back to document notification simulation:", e);
    }

    // Log Recommended Firebase Analytics event
    logFirebaseEvent("notification_received", {
      title: "🎯 Life OS Push Check",
      body: "Fantastic! This is a test push notification simulated from your Life OS client setup.",
      simulated: true
    });

    // Also inject mock message to foreground state
    const mockPayload = {
      notification: {
        title: "🎯 Life OS Push Check",
        body: "Fantastic! This is a test push notification simulated from your Life OS client setup."
      },
      sentTime: String(Date.now())
    };
    setForegroundMessages((prev) => [mockPayload, ...prev]);
  };

  // Keep focus profile customized states synchronized with incoming props
  useEffect(() => {
    if (myProfile) {
      setProfileNickname(myProfile.nickname);
      setProfileEmoji(myProfile.emoji);
    }
  }, [myProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileNickname.trim() || !currentUser) return;
    setIsUpdatingProfile(true);
    setProfileUpdateSuccess(false);
    try {
      await updateMyProfile(currentUser.email, profileNickname.trim(), profileEmoji);
      setProfileUpdateSuccess(true);
      setTimeout(() => setProfileUpdateSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Deadline adding form state
  const [deadlineName, setDeadlineName] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [isAddingDeadline, setIsAddingDeadline] = useState(false);

  // Backup loading status states
  const [syncMessage, setSyncMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleBackup = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const result = await store.backupToServer();
      if (result.success) {
        setSyncMessage({ text: "Database state backed up to server successfully.", error: false });
      } else {
        setSyncMessage({ text: result.message || "Failed to backup on server.", error: true });
      }
    } catch (e: any) {
      setSyncMessage({ text: e.message || "Communication failure calling backup endpoint.", error: true });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestore = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const result = await store.restoreFromServer();
      if (result.success) {
        setSyncMessage({ text: "Database state restored from server. Reloading...", error: false });
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setSyncMessage({ text: result.message || "No backup file exists on the server yet.", error: true });
      }
    } catch (e: any) {
      setSyncMessage({ text: e.message || "Communication failure calling restore endpoint.", error: true });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deadlineName.trim() || !deadlineDate) return;

    const newDeadline: Deadline = {
      id: deadlines.length ? Math.max(...deadlines.map(d => d.id)) + 1 : 1,
      name: deadlineName,
      targetTimestamp: new Date(deadlineDate).getTime(),
      isCompleted: false
    };

    onDeadlinesChange([...deadlines, newDeadline]);
    setDeadlineName("");
    setDeadlineDate("");
    setIsAddingDeadline(false);
  };

  const handleToggleDeadline = (id: number) => {
    onDeadlinesChange(deadlines.map(d => d.id === id ? { ...d, isCompleted: !d.isCompleted } : d));
  };

  const handleDeleteDeadline = (id: number) => {
    onDeadlinesChange(deadlines.filter(d => d.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="settings-container">
      {/* Sync panel & resetting operations (col-span-2) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Google Authentication & Sync Card */}
        <div className="bg-gray-900/40 border border-gray-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5 border-b border-gray-800 pb-2">
            <Cloud className="h-4.5 w-4.5 text-blue-400 animate-pulse-soft" /> Google Cloud Synchronization
          </h3>
          
          {currentUser ? (
            <div className="space-y-4">
              <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-md font-semibold text-blue-400 border border-blue-500/30">
                    {currentUser.displayName ? currentUser.displayName[0] : "U"}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#070b12]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-gray-200">{currentUser.displayName || "Online Peer"}</h4>
                  <p className="text-[10px] text-gray-400 truncate">{currentUser.email}</p>
                </div>
                <span className="text-[9px] font-mono font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full uppercase">
                  Connected
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                Your Life OS is connected to the Firebase Realtime Database. All live pomodoro timers, stopwatch sessions, and study activities are synced in real-time. You can now ring reminders for other online buddies and browse Google Drive cloud documents!
              </p>
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-950 hover:bg-red-950/20 border border-gray-850 hover:border-red-900/20 text-gray-400 hover:text-red-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4" /> Disconnect Google Account
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-300 leading-relaxed">
                Connect your Google Account to unlock real-time peer-to-peer productivity features! Collaborate on studying pomodoros, ring live focus bells, and seamlessly import remote documents from Google Drive into your workspace explorer.
              </p>
              <button
                onClick={onLogin}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-500/10"
              >
                <LogIn className="h-4 w-4" /> Sign In with Google Sync
              </button>
            </div>
          )}
        </div>

        {/* Real-time Focus Profile Customization */}
        {currentUser && (
          <div className="bg-gray-900/40 border border-gray-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5 border-b border-gray-800 pb-2">
              <Info className="h-4.5 w-4.5 text-blue-400" /> Focus Peer Identity Settings
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Customize your nickname and avatar emoji that other online friends see in their live Friends Focus feed.
            </p>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Nickname input */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">Your Focus Nickname</label>
                  <input
                    type="text"
                    required
                    value={profileNickname}
                    onChange={(e) => setProfileNickname(e.target.value)}
                    placeholder="Nickname"
                    className="w-full bg-gray-950 border border-gray-850 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  />
                </div>

                {/* Avatar Emoji Select */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">Avatar Status Emoji</label>
                  <select
                    value={profileEmoji.startsWith("data:image/") || profileEmoji.startsWith("base64:") ? "custom" : profileEmoji}
                    onChange={(e) => {
                      if (e.target.value !== "custom") {
                        setProfileEmoji(e.target.value);
                      }
                    }}
                    className="w-full bg-gray-950 border border-gray-850 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  >
                    <option value="👨‍💻">👨‍💻 Coder</option>
                    <option value="🔥">🔥 On Fire</option>
                    <option value="🧠">🧠 Laser Focus</option>
                    <option value="📚">📚 Reading</option>
                    <option value="🚀">🚀 Studying</option>
                    <option value="🎓">🎓 Academic</option>
                    <option value="🧘">🧘 Mindful</option>
                    <option value="☕">☕ Coding Break</option>
                    {(profileEmoji.startsWith("data:image/") || profileEmoji.startsWith("base64:")) && (
                      <option value="custom">🖼️ Custom Image</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Custom Image Avatar Uploader */}
              <div className="p-4 bg-gray-950 rounded-xl border border-gray-850/80 space-y-3">
                <div className="flex items-center gap-4">
                  {/* Preview avatar */}
                  <div className="shrink-0">
                    {(() => {
                      const isImage = profileEmoji.startsWith("data:image/") || profileEmoji.startsWith("base64:") || profileEmoji.startsWith("http");
                      let src = profileEmoji;
                      if (profileEmoji.startsWith("base64:")) {
                        src = `data:image/jpeg;base64,${profileEmoji.substring(7)}`;
                      }
                      if (isImage) {
                        return (
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-850 bg-black flex items-center justify-center">
                            <img src={src} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="Avatar Preview" />
                          </div>
                        );
                      }
                      return (
                        <div className="w-12 h-12 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-2xl select-none text-white">
                          {profileEmoji || "👨‍💻"}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Upload input */}
                  <div className="flex-1 space-y-1.5">
                    <h5 className="text-xs font-bold text-gray-200">Custom Profile Picture</h5>
                    <p className="text-[10px] text-gray-500 font-medium">Upload a custom image to use as your avatar badge.</p>
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 text-gray-300 rounded-lg text-[10px] font-bold cursor-pointer transition-all">
                        <span>Choose Image File</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (!file.type.startsWith("image/")) {
                                alert("Please select a valid image file.");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const base64 = event.target?.result as string;
                                setProfileEmoji(base64);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      
                      {(profileEmoji.startsWith("data:image/") || profileEmoji.startsWith("base64:")) && (
                        <button
                          type="button"
                          onClick={() => setProfileEmoji("👨‍💻")}
                          className="px-2.5 py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/20 hover:border-red-900/30 text-red-400 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                        >
                          Reset to Emoji
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-1">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="flex items-center gap-1.5 py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
                >
                  {isUpdatingProfile ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Profile Details</span>
                    </>
                  )}
                </button>

                <AnimatePresence>
                  {profileUpdateSuccess && (
                    <motion.span
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="text-[11px] font-semibold text-green-400 flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                      Profile details synchronized!
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </form>
          </div>
        )}

        {/* Core Cloud Server backup & restore sync */}
        <div className="bg-gray-900/40 border border-gray-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5 border-b border-gray-800 pb-2">
            <Save className="h-4.5 w-4.5 text-blue-400" /> Database Backup Synchronization
          </h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            "Your Life OS uses client-side localStorage by default. You can manually synchronize a complete JSON representation of your workspace database onto the server's cloud-hosted storage for durability across devices."
          </p>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleBackup}
              disabled={isSyncing}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-all"
            >
              <Save className="h-4 w-4" /> Backup to Server
            </button>
            <button
              onClick={handleRestore}
              disabled={isSyncing}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-950 hover:bg-gray-900 border border-gray-800 hover:border-gray-700 disabled:opacity-40 text-gray-300 text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-all"
            >
              <Download className="h-4 w-4" /> Restore from Server
            </button>
          </div>

          <AnimatePresence>
            {syncMessage && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className={`p-3 rounded-lg text-xs font-semibold ${
                  syncMessage.error 
                    ? "bg-red-500/10 text-red-400 border border-red-500/15" 
                    : "bg-green-500/10 text-green-400 border border-green-500/15"
                }`}
              >
                {syncMessage.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Firebase Cloud Messaging (FCM) Card */}
        <div className="bg-gray-900/40 border border-gray-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5 border-b border-gray-800 pb-2">
            <Bell className="h-4.5 w-4.5 text-blue-400" /> Firebase Cloud Messaging (FCM)
          </h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            Configure your Web push credentials, request browser notifications permission, and obtain your application's unique registration identifiers to enable real-time device updates.
          </p>

          <div className="space-y-4">
            {/* Notification Permission block */}
            <div className="p-3 bg-gray-950 rounded-xl border border-gray-850 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-gray-200">Push Notification Permission</h4>
                <p className="text-[10px] text-gray-500 font-medium">Allows browser popup and audio alert cues.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${
                  notificationPermission === "granted" 
                    ? "bg-green-500/10 text-green-400 border-green-500/20" 
                    : notificationPermission === "denied"
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : "bg-gray-500/10 text-gray-400 border-gray-850"
                }`}>
                  {notificationPermission}
                </span>
                {notificationPermission !== "granted" && notificationPermission !== "unsupported" && (
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer"
                  >
                    Grant
                  </button>
                )}
              </div>
            </div>

            {/* VAPID Key Form */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold flex items-center gap-1">
                <Key className="h-3 w-3 text-blue-400" /> Web Push VAPID Key
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={vapidKey}
                  onChange={(e) => setVapidKey(e.target.value)}
                  placeholder="Paste your Public VAPID Key from Firebase Console"
                  className="flex-1 bg-gray-950 border border-gray-850 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono text-[9px] tracking-tight truncate hover:whitespace-normal hover:break-all"
                />
                <button
                  type="button"
                  onClick={handleRegisterFCM}
                  disabled={fcmStatus === "registering"}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold px-4 rounded-xl cursor-pointer transition-all shrink-0"
                >
                  {fcmStatus === "registering" ? "Registering..." : "Register"}
                </button>
              </div>
            </div>

            {/* FCM Status Feedback */}
            {fcmStatus === "error" && (
              <div className="p-3 bg-red-500/10 text-red-400 border border-red-500/15 rounded-xl text-xs font-semibold flex items-start gap-1.5">
                <ShieldAlert className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Registration Failed</p>
                  <p className="text-[10px] font-medium leading-relaxed font-mono">{fcmErrorMessage}</p>
                </div>
              </div>
            )}

            {/* Registration Output / Installation IDs */}
            <div className="space-y-3 pt-1">
              {/* Firebase Installation ID (FID) */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">
                  Firebase Installation ID (FID)
                </span>
                <div className="flex items-center gap-2 bg-gray-950 p-2.5 rounded-xl border border-gray-850">
                  <span className="flex-1 text-[10px] font-mono text-gray-300 break-all select-all">
                    {installationId || "No installation registered yet. Click Register to obtain."}
                  </span>
                  {installationId && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(installationId);
                        setCopiedId(true);
                        setTimeout(() => setCopiedId(false), 2000);
                      }}
                      className="text-gray-500 hover:text-white transition-colors"
                    >
                      {copiedId ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Registration Token */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">
                  FCM Device Registration Token
                </span>
                <div className="flex items-center gap-2 bg-gray-950 p-2.5 rounded-xl border border-gray-850">
                  <span className="flex-1 text-[10px] font-mono text-gray-300 break-all select-all line-clamp-2">
                    {registrationToken || "No token fetched yet. Click Register to trigger."}
                  </span>
                  {registrationToken && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(registrationToken);
                        setCopiedToken(true);
                        setTimeout(() => setCopiedToken(false), 2000);
                      }}
                      className="text-gray-500 hover:text-white transition-colors"
                    >
                      {copiedToken ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Simulate Notification Button */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleSimulateNotification}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-950 hover:bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" /> Simulate Push Alert
              </button>
            </div>

            {/* Foreground Messages Log */}
            {foregroundMessages.length > 0 && (
              <div className="bg-gray-950 border border-gray-850 p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between border-b border-gray-850 pb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                    <Terminal className="h-3 w-3 text-blue-400" /> Foreground Message Logs ({foregroundMessages.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setForegroundMessages([])}
                    className="text-[9px] font-semibold text-red-400 hover:text-red-300 transition-colors"
                  >
                    Clear Logs
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {foregroundMessages.map((msg, idx) => (
                    <div key={idx} className="bg-gray-900/60 p-2 rounded border border-gray-850/60 space-y-1 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-200">
                          {msg.notification?.title || "No Title"}
                        </span>
                        <span className="text-[8px] text-gray-500 font-mono">
                          {new Date(Number(msg.sentTime || Date.now())).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-400 text-[9px] leading-relaxed">
                        {msg.notification?.body || "No message body."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Database Flush & Master reset panel */}
        <div className="bg-gray-900/40 border border-gray-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-red-400 flex items-center gap-1.5 border-b border-gray-800 pb-2">
            <ShieldAlert className="h-4.5 w-4.5 text-red-400" /> Danger Zone
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            "Wiping your database will flush all client-side local storage caches and reseed Life OS with original default productivity presets."
          </p>

          <button
            onClick={() => {
              if (confirm("Are you sure you want to hard reset all localStorage? This cannot be undone unless you backed up first.")) {
                onHardReset();
                alert("Database state successfully re-seeded. The app will reload.");
                window.location.reload();
              }
            }}
            className="flex items-center gap-2 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" /> Hard Reset Database
          </button>
        </div>
      </div>

      {/* Sidebar: Deadlines Tracker */}
      <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
            <Calendar className="h-4.5 w-4.5 text-blue-400" /> Key Milestones & Deadlines
          </h3>
          <button
            onClick={() => setIsAddingDeadline(!isAddingDeadline)}
            className="text-[9px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/15 cursor-pointer"
          >
            <Plus className="h-3 w-3" /> Add Target
          </button>
        </div>

        {/* Create Deadline Form */}
        <AnimatePresence>
          {isAddingDeadline && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddDeadline}
              className="overflow-hidden bg-gray-950/60 p-3.5 rounded-lg border border-gray-850 space-y-2.5"
            >
              <input
                type="text"
                required
                placeholder="Deadline detail..."
                value={deadlineName}
                onChange={(e) => setDeadlineName(e.target.value)}
                className="w-full bg-gray-950 border border-gray-850 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
              />
              <input
                type="date"
                required
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full bg-gray-950 border border-gray-850 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="w-full text-center bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] py-1.5 rounded"
              >
                Create Target
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Deadlines list */}
        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
          {deadlines.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No deadlines configured yet.</p>
          ) : (
            deadlines.map((d) => {
              const daysRemaining = Math.ceil((d.targetTimestamp - Date.now()) / (1000 * 60 * 60 * 24));
              const isOverdue = daysRemaining < 0 && !d.isCompleted;

              return (
                <div key={d.id} className="bg-gray-950 p-3 rounded-lg border border-gray-850 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <button
                      onClick={() => handleToggleDeadline(d.id)}
                      className="text-gray-500 hover:text-blue-500 transition-colors mt-0.5"
                    >
                      {d.isCompleted ? (
                        <CheckCircle2 className="h-4.5 w-4.5 text-blue-500 fill-blue-500/10" />
                      ) : (
                        <Circle className="h-4.5 w-4.5 text-gray-600" />
                      )}
                    </button>

                    <div className="space-y-0.5 min-w-0">
                      <h4 className={`text-xs font-bold truncate ${d.isCompleted ? "line-through text-gray-500" : "text-gray-200"}`}>
                        {d.name}
                      </h4>
                      <p className="text-[9px] text-gray-500 font-mono">
                        Target: {new Date(d.targetTimestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!d.isCompleted && (
                      <span className={`text-[9px] font-bold font-mono px-1.5 py-0.2 rounded border ${
                        isOverdue 
                          ? "bg-red-500/10 text-red-400 border-red-500/15" 
                          : "bg-blue-500/10 text-blue-400 border-blue-500/15"
                      }`}>
                        {isOverdue ? "OVERDUE" : `${daysRemaining}d left`}
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteDeadline(d.id)}
                      className="text-gray-600 hover:text-red-400 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
