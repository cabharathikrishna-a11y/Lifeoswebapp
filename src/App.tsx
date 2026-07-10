import React, { useState, useEffect, useMemo } from "react";
import { 
  Task, Habit, HabitCompletion, JournalEntry, LedgerEntry, 
  Deadline, FinancialGoal, Contact, AppFile, FocusRecord, KeepNote, Screen, ChatMessage 
} from "./types.ts";
import { store } from "./lib/store.ts";
import { 
  CheckSquare, Clock, Flame, BookOpen, DollarSign, Users, 
  StickyNote, Folder, BarChart2, Settings, Sparkles, LogOut, Menu, X, Landmark, Bell, LogIn, BellRing,
  Play, Pause, Square, Maximize2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
// Firebase integration helpers
import { 
  initAuth, 
  googleSignIn, 
  googleSignInRedirect,
  handleRedirectResult,
  googleSignOut, 
  listenToAllUsers, 
  listenToMyBell, 
  clearMyBell, 
  getUsernameFromEmail,
  listenToMyFocusRecords,
  addFocusRecordToDb,
  removeFocusRecordFromDb,
  listenToActiveTimer,
  listenToTodayStats,
  fetchUserProfile,
  startWebSession,
  pauseWebSession,
  endWebSession,
  getProfileImageUrl,
  database
} from "./lib/firebase.ts";
import { get, ref } from "firebase/database";
import { User } from "firebase/auth";

// View components
import LoginView from "./components/LoginView.tsx";
import { LogoIcon } from "./components/LogoIcon.tsx";
import TaskView from "./components/TaskView.tsx";
import TimerView from "./components/TimerView.tsx";
import HabitsView from "./components/HabitsView.tsx";
import JournalView from "./components/JournalView.tsx";
import FinancesView from "./components/FinancesView.tsx";
import ContactsView from "./components/ContactsView.tsx";
import KeepNotesView from "./components/KeepNotesView.tsx";
import FileExplorerView from "./components/FileExplorerView.tsx";
import AnalyticsView from "./components/AnalyticsView.tsx";
import DeepaAiView from "./components/DeepaAiView.tsx";
import SettingsView from "./components/SettingsView.tsx";
import MaintenanceView from "./components/MaintenanceView.tsx";

// Browser Synthesis of high-fidelity physical focus bell chime (no MP3 file dependencies!)
export function playBellSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Primary pure ring tone
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 high note
    gain1.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.6);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start();
    osc1.stop(audioCtx.currentTime + 1.6);

    // Warm undertone resonance
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.12); // E6 fifth interval
    gain2.gain.setValueAtTime(0.2, audioCtx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.9);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(audioCtx.currentTime + 0.12);
    osc2.stop(audioCtx.currentTime + 1.9);
  } catch (e) {
    console.error("Synthesizer audio block failure:", e);
  }
}

function safeParse<T>(str: string | null, fallback: T): T {
  if (str === null || str === undefined || str === "undefined" || str === "") return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.warn("JSON parse failed for string:", str, e);
    return fallback;
  }
}

function renderFocuserIcon(avatarString: string, sizeClass: string = "w-5 h-5 text-sm") {
  if (!avatarString) return null;
  
  let src = avatarString;
  if (avatarString.startsWith("base64:")) {
    const rawBase64 = avatarString.substring("base64:".length);
    src = `data:image/jpeg;base64,${rawBase64}`;
  } else {
    const isRawBase64 = avatarString.length > 100 && !avatarString.startsWith("http") && !avatarString.startsWith("data:image");
    if (isRawBase64) {
      src = `data:image/jpeg;base64,${avatarString}`;
    }
  }
  
  const isImage = src.startsWith("data:image/") || src.startsWith("http://") || src.startsWith("https://") || src.startsWith("blob:");
  
  if (isImage) {
    return (
      <div className={`rounded-full overflow-hidden flex items-center justify-center bg-gray-950 border border-gray-800 shrink-0 ${sizeClass}`}>
        <img 
          src={src} 
          referrerPolicy="no-referrer" 
          className="w-full h-full object-cover" 
          alt="Avatar" 
        />
      </div>
    );
  }
  
  return <span className="text-sm shrink-0 select-none">{avatarString}</span>;
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>(Screen.DEEPA_AI);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [keepNotes, setKeepNotes] = useState<KeepNote[]>([]);
  const [files, setFiles] = useState<AppFile[]>([]);
  const [focusRecords, setFocusRecords] = useState<FocusRecord[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Firebase Realtime & Authentication States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [friendsStatuses, setFriendsStatuses] = useState<Record<string, any>>({});
  const [rawMyStatusNode, setRawMyStatusNode] = useState<any>(null);
  const [activeTimer, setActiveTimer] = useState<any>(null);
  const [todayStats, setTodayStats] = useState<any>(null);

  const myStatusNode = useMemo(() => {
    const baseNode = rawMyStatusNode || {};
    return {
      ...baseNode,
      active_timer: activeTimer,
      today_stats: todayStats,
      isFocusing: activeTimer?.status === "FOCUSING",
      focusStatus: activeTimer?.status?.toLowerCase() || "idle",
      accumulatedTimeMs: activeTimer?.accumulatedFocusMs || 0,
      lastResumeTimeMs: activeTimer?.startTimeMs || null,
      currentTaskTitle: activeTimer?.taskTitle || "",
      currentTag: activeTimer?.tag || "",
      isStopwatchMode: !!activeTimer?.isStopwatchMode,
      emoji: baseNode.emoji || "🎯",
      nickname: baseNode.nickname || currentUser?.displayName?.split(" ")[0] || "User"
    };
  }, [rawMyStatusNode, activeTimer, todayStats, currentUser]);
  const [myProfile, setMyProfile] = useState<{ nickname: string; emoji: string }>({ nickname: "User", emoji: "👨‍💻" });
  const [bellSignal, setBellSignal] = useState<any | null>(null);
  const [showBellAlert, setShowBellAlert] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Save Focus Session Modal State
  const [saveModalState, setSaveModalState] = useState<{
    isOpen: boolean;
    elapsedSecs: number;
    hours: number;
    minutes: number;
    seconds: number;
    taskTitle: string;
    tag: string;
    notes: string;
    startTime: string;
    isPomodoro: boolean;
  }>({
    isOpen: false,
    elapsedSecs: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    taskTitle: "",
    tag: "",
    notes: "",
    startTime: "",
    isPomodoro: false
  });

  const saveSessionDirectly = async (data: {
    elapsedSecs: number;
    taskTitle: string;
    tag: string;
    notes: string;
    startTime: string;
    isPomodoro: boolean;
  }) => {
    if (data.elapsedSecs <= 0) {
      resetTimerGlobal();
      return;
    }

    const durationMinutes = Math.max(1, Math.round(data.elapsedSecs / 60));
    const endTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (data.elapsedSecs > 10) {
      const record: FocusRecord = {
        id: Math.random().toString(36).substring(2, 9),
        taskTitle: data.taskTitle || "Manual Focus Session",
        tag: data.tag || "Study",
        notes: data.notes || "Stopwatch log",
        durationMinutes: durationMinutes,
        durationSeconds: data.elapsedSecs,
        dateString: new Date().toISOString().split("T")[0],
        startTime: data.startTime || new Date(Date.now() - data.elapsedSecs * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        endTime: endTime,
        timestamp: Date.now()
      };

      handleAddFocusRecord(record);
    }

    // Reset everything locally
    localStorage.setItem("life_os_timer_is_running", "false");
    localStorage.setItem("life_os_stopwatch_seconds", "0");
    localStorage.setItem("life_os_last_resume_time", "null");
    localStorage.setItem("life_os_accumulated_time", "0");
    localStorage.setItem("life_os_session_notes", "");
    localStorage.setItem("life_os_timer_left", JSON.stringify(25 * 60));
    window.dispatchEvent(new Event("life_os_timer_changed"));

    if (currentUser) {
      const myUsername = getUsernameFromEmail(currentUser.email);
      // Remove active session node from Firebase
      await removeFocusRecordFromDb(myUsername, `active_${myUsername}`).catch((err: any) => {
        console.error("Failed to remove active focus record:", err);
      });

      // End web session cleanly with transaction
      await endWebSession(myUsername).catch((e: any) => console.error("Mini timer end push failed:", e));
    }
  };

  const triggerSaveFocusSessionModal = (data: {
    elapsedSecs: number;
    defaultTaskTitle: string;
    defaultTag: string;
    defaultNotes: string;
    startTime: string;
    isPomodoro: boolean;
  }) => {
    saveSessionDirectly({
      elapsedSecs: data.elapsedSecs,
      taskTitle: data.defaultTaskTitle,
      tag: data.defaultTag,
      notes: data.defaultNotes,
      startTime: data.startTime,
      isPomodoro: data.isPomodoro
    });
  };

  const handleStopMiniTimer = () => {
    const running = localStorage.getItem("life_os_timer_is_running") === "true";
    const isPomodoro = localStorage.getItem("life_os_is_pomodoro") === "true";
    let currentSeconds = 0;

    if (isPomodoro) {
      const storedTimeLeftVal = localStorage.getItem("life_os_timer_left");
      const timeLeft = safeParse(storedTimeLeftVal, 25 * 60);
      currentSeconds = 25 * 60 - timeLeft;
    } else {
      const savedSecs = localStorage.getItem("life_os_stopwatch_seconds");
      currentSeconds = safeParse(savedSecs, 0);

      if (running) {
        const savedLastResume = localStorage.getItem("life_os_last_resume_time");
        const savedAccumulated = localStorage.getItem("life_os_accumulated_time");
        if (savedLastResume) {
          const lastResumeVal = safeParse(savedLastResume, 0);
          const savedAccumVal = safeParse(savedAccumulated, 0);
          if (lastResumeVal > 0) {
            const elapsedMs = Date.now() - lastResumeVal;
            currentSeconds = Math.round((savedAccumVal + elapsedMs) / 1000);
          }
        }
      }
    }

    if (currentSeconds <= 0 && !running) {
      resetTimerGlobal();
      return;
    }

    let defaultTaskTitle = "General Focus Session";
    const savedTaskId = localStorage.getItem("life_os_selected_task_id");
    if (savedTaskId) {
      const id = safeParse(savedTaskId, null);
      const activeTask = tasks.find(t => t.id === id);
      if (activeTask) {
        defaultTaskTitle = activeTask.title;
      }
    }

    const savedTag = localStorage.getItem("life_os_active_tag");
    const activeTag = safeParse(savedTag, "Study");

    const savedNotes = localStorage.getItem("life_os_session_notes");
    const defaultNotes = safeParse(savedNotes, isPomodoro ? "Pomodoro session log" : "Stopwatch log from mini timer");

    const startTime = new Date(Date.now() - currentSeconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    saveSessionDirectly({
      elapsedSecs: currentSeconds,
      taskTitle: defaultTaskTitle,
      tag: activeTag,
      notes: defaultNotes,
      startTime,
      isPomodoro
    });
  };

  const handleSaveFocusSession = async () => {
    const adjustedTotalSecs = (saveModalState.hours * 3600) + (saveModalState.minutes * 60) + saveModalState.seconds;
    const durationMinutes = Math.max(1, Math.round(adjustedTotalSecs / 60));
    const endTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const record: FocusRecord = {
      id: Math.random().toString(36).substring(2, 9),
      taskTitle: saveModalState.taskTitle || "Manual Focus Session",
      tag: saveModalState.tag || "Study",
      notes: saveModalState.notes || "Stopwatch log",
      durationMinutes: durationMinutes,
      durationSeconds: adjustedTotalSecs,
      dateString: new Date().toISOString().split("T")[0],
      startTime: saveModalState.startTime || new Date(Date.now() - adjustedTotalSecs * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      endTime: endTime,
      timestamp: Date.now()
    };

    handleAddFocusRecord(record);

    // Reset everything locally
    localStorage.setItem("life_os_timer_is_running", "false");
    localStorage.setItem("life_os_stopwatch_seconds", "0");
    localStorage.setItem("life_os_last_resume_time", "null");
    localStorage.setItem("life_os_accumulated_time", "0");
    localStorage.setItem("life_os_session_notes", "");
    localStorage.setItem("life_os_timer_left", JSON.stringify(25 * 60));
    window.dispatchEvent(new Event("life_os_timer_changed"));

    if (currentUser) {
      const myUsername = getUsernameFromEmail(currentUser.email);
      // Remove active session node from Firebase
      await removeFocusRecordFromDb(myUsername, `active_${myUsername}`).catch((err: any) => {
        console.error("Failed to remove active focus record:", err);
      });

      // End web session cleanly with transaction
      await endWebSession(myUsername).catch((e: any) => console.error("Mini timer end push failed:", e));
    }

    setSaveModalState(prev => ({ ...prev, isOpen: false }));
  };

  // Global Stopwatch States
  const [timerSeconds, setTimerSeconds] = useState<number>(() => {
    const savedSecs = localStorage.getItem("life_os_stopwatch_seconds");
    const isRunning = localStorage.getItem("life_os_timer_is_running") === "true";
    const savedSecsVal = safeParse(savedSecs, 0);
    if (isRunning) {
      const savedLastResume = localStorage.getItem("life_os_last_resume_time");
      const savedAccumulated = localStorage.getItem("life_os_accumulated_time");
      if (savedLastResume) {
        const lastResume = safeParse(savedLastResume, 0);
        const accumulated = safeParse(savedAccumulated, 0);
        if (lastResume > 0) {
          const elapsedMs = Date.now() - lastResume;
          return Math.round((accumulated + elapsedMs) / 1000);
        }
      }
    }
    return savedSecsVal;
  });
  const [timerIsRunning, setTimerIsRunning] = useState<boolean>(() => {
    return localStorage.getItem("life_os_timer_is_running") === "true";
  });

  // Keep global timer in sync with localStorage and TimerView events
  useEffect(() => {
    const updateLocalState = () => {
      const running = localStorage.getItem("life_os_timer_is_running") === "true";
      setTimerIsRunning(running);

      const savedSecs = localStorage.getItem("life_os_stopwatch_seconds");
      let secs = safeParse(savedSecs, 0);
      if (running) {
        const savedLastResume = localStorage.getItem("life_os_last_resume_time");
        const savedAccumulated = localStorage.getItem("life_os_accumulated_time");
        if (savedLastResume) {
          const lastResume = safeParse(savedLastResume, 0);
          const accumulated = safeParse(savedAccumulated, 0);
          if (lastResume > 0) {
            const elapsedMs = Date.now() - lastResume;
            secs = Math.round((accumulated + elapsedMs) / 1000);
          }
        }
      }
      setTimerSeconds(secs);
    };

    updateLocalState();

    const handleTimerChange = () => {
      updateLocalState();
    };
    const handleCloseSaveModal = () => {
      setSaveModalState(prev => ({ ...prev, isOpen: false }));
    };
    window.addEventListener("life_os_timer_changed", handleTimerChange);
    window.addEventListener("life_os_close_save_modal", handleCloseSaveModal);

    const interval = setInterval(() => {
      updateLocalState();
    }, 1000);

    return () => {
      window.removeEventListener("life_os_timer_changed", handleTimerChange);
      window.removeEventListener("life_os_close_save_modal", handleCloseSaveModal);
      clearInterval(interval);
    };
  }, []);

  const toggleTimerGlobal = async () => {
    const running = localStorage.getItem("life_os_timer_is_running") === "true";
    const nextRunning = !running;

    const savedSecs = localStorage.getItem("life_os_stopwatch_seconds");
    let currentStopwatchSecs = safeParse(savedSecs, 0);

    let lastResume = null;
    let accumulated = 0;

    if (nextRunning) {
      lastResume = Date.now();
      const savedAccumulated = localStorage.getItem("life_os_accumulated_time");
      accumulated = safeParse(savedAccumulated, currentStopwatchSecs * 1000);
      localStorage.setItem("life_os_last_resume_time", JSON.stringify(lastResume));
      localStorage.setItem("life_os_accumulated_time", JSON.stringify(accumulated));
    } else {
      const savedLastResume = localStorage.getItem("life_os_last_resume_time");
      const savedAccumulated = localStorage.getItem("life_os_accumulated_time");
      if (savedLastResume) {
        const lastResumeVal = safeParse(savedLastResume, 0);
        const savedAccumVal = safeParse(savedAccumulated, 0);
        if (lastResumeVal > 0) {
          const elapsedMs = Date.now() - lastResumeVal;
          accumulated = savedAccumVal + elapsedMs;
          currentStopwatchSecs = Math.round(accumulated / 1000);
        }
      }
      localStorage.setItem("life_os_last_resume_time", "null");
      localStorage.setItem("life_os_accumulated_time", JSON.stringify(accumulated));
      localStorage.setItem("life_os_stopwatch_seconds", JSON.stringify(currentStopwatchSecs));
    }

    localStorage.setItem("life_os_timer_is_running", JSON.stringify(nextRunning));
    window.dispatchEvent(new Event("life_os_timer_changed"));

    // Sync to firebase status immediately!
    if (currentUser) {
      const myUsername = getUsernameFromEmail(currentUser.email);
      const activeTag = localStorage.getItem("life_os_active_tag") ? safeParse(localStorage.getItem("life_os_active_tag"), "Study") : "Study";
      
      if (nextRunning) {
        await startWebSession(myUsername, "Deep focus session active...", activeTag, true)
          .catch((e: any) => console.error("Mini timer push failed:", e));
      } else {
        await pauseWebSession(myUsername)
          .catch((e: any) => console.error("Mini timer push failed:", e));
      }
    }
  };

  const resetTimerGlobal = async () => {
    localStorage.setItem("life_os_timer_is_running", "false");
    localStorage.setItem("life_os_stopwatch_seconds", "0");
    localStorage.setItem("life_os_last_resume_time", "null");
    localStorage.setItem("life_os_accumulated_time", "0");
    window.dispatchEvent(new Event("life_os_timer_changed"));

    // Sync to firebase status immediately!
    if (currentUser) {
      const myUsername = getUsernameFromEmail(currentUser.email);
      await endWebSession(myUsername)
        .catch((e: any) => console.error("Mini timer reset push failed:", e));
    }
  };

  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs > 0 ? String(hrs).padStart(2, "0") + ":" : ""}${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // 1. Initial State Sync on mount
  useEffect(() => {
    setTasks(store.getTasks());
    setHabits(store.getHabits());
    setCompletions(store.getHabitCompletions());
    setJournal(store.getJournalEntries());
    setLedger(store.getLedgerEntries());
    setDeadlines(store.getDeadlines());
    setFinancialGoals(store.getFinancialGoals());
    setContacts(store.getContacts());
    setKeepNotes(store.getKeepNotes());
    setFiles(store.getFiles());
    setFocusRecords(store.getFocusRecords());
    
    const chats = localStorage.getItem("life_os_chats");
    if (chats) setChatMessages(safeParse(chats, []));

    // Check redirect result on load to catch login return
    const checkRedirect = async () => {
      try {
        const result = await handleRedirectResult();
        if (result) {
          setCurrentUser(result.user);
          setAccessToken(result.accessToken);
        }
      } catch (err: any) {
        console.error("Redirect login recovery failed:", err);
        setLoginError(err?.code || err?.message || String(err));
      }
    };
    checkRedirect();

    // Initialize Firebase Auth subscription
    const unsubscribeAuth = initAuth(
      (user, token) => {
        setCurrentUser(user);
        if (token) {
          setAccessToken(token);
        }
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
      }
    );

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  // Subscribe to Realtime Database when logged in
  useEffect(() => {
    if (!currentUser) {
      setFriendsStatuses({});
      setFocusRecords(store.getFocusRecords());
      return;
    }

    const myUsername = getUsernameFromEmail(currentUser.email);
    let unsubscribeUsers: (() => void) | null = null;
    let unsubscribeBell: (() => void) | null = null;
    let unsubscribeFocusRecords: (() => void) | null = null;
    let unsubscribeActiveTimer: (() => void) | null = null;
    let unsubscribeTodayStats: (() => void) | null = null;

    // Proactively upload any offline/local-only focus records to Firebase to sync them
    try {
      const localRecords = store.getFocusRecords();
      if (localRecords && localRecords.length > 0) {
        localRecords.forEach((rec) => {
          addFocusRecordToDb(myUsername, rec).catch((err) => {
            console.error("Auto-sync local record to Firebase failed:", err);
          });
        });
      }
    } catch (err) {
      console.error("Failed to sync offline focus records:", err);
    }

    const startActiveTimerListeners = () => {
      if (unsubscribeActiveTimer) unsubscribeActiveTimer();
      if (unsubscribeTodayStats) unsubscribeTodayStats();

      unsubscribeActiveTimer = listenToActiveTimer(myUsername, (data) => {
        setActiveTimer(data);
      });
      unsubscribeTodayStats = listenToTodayStats(myUsername, (data) => {
        setTodayStats(data);
      });
    };

    // Initialize the live passive listeners
    startActiveTimerListeners();

    // The Visibility-Aware "Wake-Up Catch-Up"
    const handleVisibility = async () => {
      if (document.visibilityState === "visible") {
        try {
          const timerRef = ref(database, `users/${myUsername}/active_timer`);
          const statsRef = ref(database, `users/${myUsername}/today_stats`);
          const [timerSnap, statsSnap] = await Promise.all([get(timerRef), get(statsRef)]);
          if (timerSnap.exists()) {
            setActiveTimer(timerSnap.val());
          }
          if (statsSnap.exists()) {
            setTodayStats(statsSnap.val());
          }
        } catch (err) {
          console.error("Wake-Up Catch-Up failed to get latest database snapshot:", err);
        }
        startActiveTimerListeners();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    try {
      // Listen to friends focus statuses
      unsubscribeUsers = listenToAllUsers((usersMap) => {
        try {
          const filtered: Record<string, any> = {};
          let foundMyNode = null;
          for (const username of Object.keys(usersMap)) {
            if (username !== myUsername) {
              filtered[username] = usersMap[username];
            } else {
              const myInfo = usersMap[username];
              foundMyNode = myInfo;
              if (myInfo) {
                const incomingNickname = myInfo.nickname || currentUser?.displayName?.split(" ")[0] || "User";
                const incomingEmoji = myInfo.emoji || "👨‍💻";
                setMyProfile(prev => {
                  if (prev.nickname === incomingNickname && prev.emoji === incomingEmoji) {
                    return prev;
                  }
                  return { nickname: incomingNickname, emoji: incomingEmoji };
                });
              }
            }
          }
          setRawMyStatusNode(foundMyNode);
          setFriendsStatuses(filtered);
        } catch (innerErr) {
          console.error("Error processing friends statuses update:", innerErr);
        }
      });
    } catch (e) {
      console.error("Failed to subscribe to friends statuses:", e);
    }

    try {
      // Listen to personal focus bell signals
      unsubscribeBell = listenToMyBell(myUsername, (signal) => {
        try {
          if (signal && !signal.isProcessed) {
            setBellSignal(signal);
            setShowBellAlert(true);
            if (document.visibilityState === "visible") {
              playBellSound();
            }
          }
        } catch (innerErr) {
          console.error("Error processing bell signal update:", innerErr);
        }
      });
    } catch (e) {
      console.error("Failed to subscribe to bell signals:", e);
    }

    try {
      // Listen to personal focus records for full real-time sync with mobile/web clients
      unsubscribeFocusRecords = listenToMyFocusRecords(myUsername, (records) => {
        if (records) {
          setFocusRecords(records.sort((a, b) => b.timestamp - a.timestamp));
        } else {
          setFocusRecords([]);
        }
      });
    } catch (e) {
      console.error("Failed to subscribe to focus records:", e);
    }

    return () => {
      try {
        if (unsubscribeUsers) unsubscribeUsers();
      } catch (err) {
        console.error("Error unsubscribing from users:", err);
      }
      try {
        if (unsubscribeBell) unsubscribeBell();
      } catch (err) {
        console.error("Error unsubscribing from bell:", err);
      }
      try {
        if (unsubscribeFocusRecords) unsubscribeFocusRecords();
      } catch (err) {
        console.error("Error unsubscribing from focus records:", err);
      }
      try {
        if (unsubscribeActiveTimer) unsubscribeActiveTimer();
      } catch (err) {
        console.error("Error unsubscribing from active timer:", err);
      }
      try {
        if (unsubscribeTodayStats) unsubscribeTodayStats();
      } catch (err) {
        console.error("Error unsubscribing from today stats:", err);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [currentUser]);

  const handleClearBell = async () => {
    if (currentUser) {
      const myUsername = getUsernameFromEmail(currentUser.email);
      await clearMyBell(myUsername);
    }
    setShowBellAlert(false);
    setBellSignal(null);
  };

  const handleLogin = async (useRedirect: any = false, withWorkspaceScopes: boolean = true) => {
    const isRedirect = useRedirect === true;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      if (isRedirect) {
        await googleSignInRedirect(withWorkspaceScopes);
        return; // Page redirects, nothing more to do in current lifecycle
      }
      const result = await googleSignIn(withWorkspaceScopes);
      if (result) {
        setCurrentUser(result.user);
        setAccessToken(result.accessToken);
      }
    } catch (e: any) {
      console.error("Google login failed:", e);
      setLoginError(e?.code || e?.message || String(e));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await googleSignOut();
      setCurrentUser(null);
      setAccessToken(null);
    } catch (e) {
      console.error("Logout failed:", e);
      // Even if network signOut fails, clear local user to unblock logout
      setCurrentUser(null);
      setAccessToken(null);
    }
  };

  // 2. State-to-localStorage Auto-Persistors
  useEffect(() => { if (tasks.length) store.saveTasks(tasks); }, [tasks]);
  useEffect(() => { if (habits.length) store.saveHabits(habits); }, [habits]);
  useEffect(() => { if (completions.length) store.saveHabitCompletions(completions); }, [completions]);
  useEffect(() => { if (journal.length) store.saveJournalEntries(journal); }, [journal]);
  useEffect(() => { if (ledger.length) store.saveLedgerEntries(ledger); }, [ledger]);
  useEffect(() => { if (deadlines.length) store.saveDeadlines(deadlines); }, [deadlines]);
  useEffect(() => { if (financialGoals.length) store.saveFinancialGoals(financialGoals); }, [financialGoals]);
  useEffect(() => { if (contacts.length) store.saveContacts(contacts); }, [contacts]);
  useEffect(() => { if (keepNotes.length) store.saveKeepNotes(keepNotes); }, [keepNotes]);
  useEffect(() => { if (files.length) store.saveFiles(files); }, [files]);
  useEffect(() => { if (!currentUser && focusRecords.length) store.saveFocusRecords(focusRecords); }, [focusRecords, currentUser]);
  useEffect(() => {
    localStorage.setItem("life_os_chats", JSON.stringify(chatMessages));
  }, [chatMessages]);

  const handleHardReset = () => {
    localStorage.clear();
    setTasks([]);
    setHabits([]);
    setCompletions([]);
    setJournal([]);
    setLedger([]);
    setDeadlines([]);
    setFinancialGoals([]);
    setContacts([]);
    setKeepNotes([]);
    setFiles([]);
    setFocusRecords([]);
    setChatMessages([]);
  };

  const handleAddFocusRecord = (record: FocusRecord) => {
    // 1. Session Max Focus Time Cap: 6 hours (21600 seconds)
    const MAX_SESSION_SECS = 6 * 3600; // 21600 seconds
    let durationSeconds = record.durationSeconds || (record.durationMinutes * 60) || 0;
    
    if (durationSeconds > MAX_SESSION_SECS) {
      durationSeconds = MAX_SESSION_SECS;
    }

    // 2. Daily Max Focus Time Cap: 20 hours (72000 seconds)
    const MAX_DAILY_SECS = 20 * 3600; // 72000 seconds
    const todayStr = new Date().toISOString().split("T")[0];
    
    // Sum existing completed records logged today (ignoring active ongoing sessions)
    const loggedTodaySecs = focusRecords
      .filter(r => r.dateString === todayStr && r.id && !r.id.startsWith("active_") && r.id !== record.id)
      .reduce((sum, r) => sum + (r.durationSeconds || (r.durationMinutes * 60) || 0), 0);

    if (loggedTodaySecs >= MAX_DAILY_SECS) {
      alert("You have already reached your 20-hour focus limit for today! No more focus sessions can be logged.");
      return;
    }

    let allowedSecs = durationSeconds;
    if (loggedTodaySecs + durationSeconds > MAX_DAILY_SECS) {
      allowedSecs = MAX_DAILY_SECS - loggedTodaySecs;
      alert(`Daily limit of 20 hours reached! This session has been adjusted to ${Math.round(allowedSecs / 60)} minutes to keep your daily total at exactly 20 hours.`);
    }

    if (allowedSecs <= 0) {
      return;
    }

    const durationMinutes = Math.max(1, Math.round(allowedSecs / 60));

    // Reconstruct the record with capped times
    const cappedRecord = {
      ...record,
      durationSeconds: allowedSecs,
      durationMinutes: durationMinutes
    };

    // Loop & Duplicate Protection: Append a metadata tag [logged_by_device:<device_id>] inside the notes
    let webId = localStorage.getItem("life_os_web_device_id");
    if (!webId) {
      webId = "web_" + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("life_os_web_device_id", webId);
    }
    const tag = `[logged_by_device:${webId}]`;
    let updatedNotes = cappedRecord.notes || "";
    if (!updatedNotes.includes("[logged_by_device:")) {
      const separator = updatedNotes.trim().length > 0 ? " " : "";
      updatedNotes = updatedNotes + separator + tag;
    }

    const stampedRecord = {
      ...cappedRecord,
      notes: updatedNotes
    };

    const updated = [stampedRecord, ...focusRecords.filter(r => r.id !== stampedRecord.id)];
    setFocusRecords(updated);
    store.saveFocusRecords(updated);

    if (currentUser) {
      const myUsername = getUsernameFromEmail(currentUser.email);
      addFocusRecordToDb(myUsername, stampedRecord).catch((err: any) => {
        console.error("Failed to upload focus record to Firebase:", err);
      });
    }

    // If the record was tied to an active task, log elapsed minutes on that task too
    const activeTask = tasks.find(t => t.title.toLowerCase() === stampedRecord.taskTitle.toLowerCase() && !t.isCompleted);
    if (activeTask) {
      const updatedTasks = tasks.map(t => {
        if (t.id === activeTask.id) {
          return { ...t, actualMinutes: t.actualMinutes + stampedRecord.durationMinutes };
        }
        return t;
      });
      setTasks(updatedTasks);
      store.saveTasks(updatedTasks);
    }
  };

  // Nav configuration
  const navigationItems = [
    { screen: Screen.DEEPA_AI, label: "Deepa AI Core", icon: <Sparkles className="h-4 w-4" /> },
    { screen: Screen.TASKS, label: "Task Engine", icon: <CheckSquare className="h-4 w-4" /> },
    { screen: Screen.TIMER, label: "Focus Timer", icon: <Clock className="h-4 w-4" /> },
    { screen: Screen.HABITS, label: "Habits Tracker", icon: <Flame className="h-4 w-4" /> },
    { screen: Screen.JOURNAL, label: "Journal Book", icon: <BookOpen className="h-4 w-4" /> },
    { screen: Screen.FINANCES, label: "Finance Ledger", icon: <DollarSign className="h-4 w-4" /> },
    { screen: Screen.KEEP_NOTES, label: "Keep Notes", icon: <StickyNote className="h-4 w-4" /> },
    { screen: Screen.FILE_EXPLORER, label: "File Explorer", icon: <Folder className="h-4 w-4" /> },
    { screen: Screen.CONTACTS, label: "Contacts & Orgs", icon: <Users className="h-4 w-4" /> },
    { screen: Screen.ANALYTICS, label: "Analytics Stats", icon: <BarChart2 className="h-4 w-4" /> },
    { screen: Screen.SETTINGS, label: "System Settings", icon: <Settings className="h-4 w-4" /> }
  ];

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case Screen.DEEPA_AI:
        return <DeepaAiView chatMessages={chatMessages} onChatMessagesChange={setChatMessages} />;
      case Screen.TASKS:
        return (
          <TaskView 
            tasks={tasks} 
            onTasksChange={setTasks} 
            currentUser={currentUser}
            accessToken={accessToken}
            onLogin={handleLogin}
          />
        );
      case Screen.TIMER:
        return (
          <TimerView 
            tasks={tasks} 
            focusRecords={focusRecords} 
            onAddFocusRecord={handleAddFocusRecord} 
            currentUser={currentUser}
            friendsStatuses={friendsStatuses}
            myStatusNode={myStatusNode}
            myProfile={myProfile}
            onTriggerSaveModal={triggerSaveFocusSessionModal}
          />
        );
      case Screen.HABITS:
        return <HabitsView habits={habits} onHabitsChange={setHabits} completions={completions} onCompletionsChange={setCompletions} />;
      case Screen.JOURNAL:
        return (
          <JournalView 
            entries={journal} 
            onEntriesChange={setJournal} 
            currentUser={currentUser}
            accessToken={accessToken}
            onLogin={handleLogin}
          />
        );
      case Screen.FINANCES:
        return (
          <FinancesView 
            ledger={ledger} 
            onLedgerChange={setLedger} 
            goals={financialGoals} 
            onGoalsChange={setFinancialGoals} 
          />
        );
      case Screen.CONTACTS:
        return (
          <ContactsView 
            contacts={contacts} 
            onContactsChange={setContacts} 
            currentUser={currentUser}
            accessToken={accessToken}
            onLogin={handleLogin}
          />
        );
      case Screen.KEEP_NOTES:
        return (
          <KeepNotesView 
            notes={keepNotes} 
            onNotesChange={setKeepNotes} 
            currentUser={currentUser}
            accessToken={accessToken}
            onLogin={handleLogin}
          />
        );
      case Screen.FILE_EXPLORER:
        return (
          <FileExplorerView 
            files={files} 
            onFilesChange={setFiles} 
            currentUser={currentUser}
            accessToken={accessToken}
            onLogin={handleLogin}
          />
        );
      case Screen.ANALYTICS:
        return <AnalyticsView tasks={tasks} focusRecords={focusRecords} ledger={ledger} habits={habits} />;
      case Screen.SETTINGS:
        return (
          <SettingsView 
            deadlines={deadlines} 
            onDeadlinesChange={setDeadlines} 
            onHardReset={handleHardReset} 
            currentUser={currentUser}
            onLogin={handleLogin}
            onLogout={handleLogout}
            myProfile={myProfile}
          />
        );
      default:
        return <div className="text-center py-10">Module Not Found</div>;
    }
  };

  const currentNav = navigationItems.find(item => item.screen === activeScreen);

  const isMaintenance = false;
  if (isMaintenance) {
    return <MaintenanceView />;
  }

  if (!currentUser) {
    return (
      <LoginView 
        onLogin={handleLogin} 
        isLoggingIn={isLoggingIn} 
        error={loginError} 
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#030712] text-gray-100 font-sans" id="app-root">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Desktop / Mobile Navigation Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 bg-[#090d16] border-r border-gray-800/80 w-64 z-50 transform lg:transform-none lg:static transition-transform duration-300 flex flex-col justify-between shrink-0 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand identity header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-800/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <LogoIcon className="h-5 w-5" />
              <span className="font-sans font-bold text-base tracking-tight text-white uppercase">Life OS</span>
            </div>
            <button 
              className="lg:hidden p-1.5 hover:bg-gray-800 rounded-lg"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <X className="h-4.5 w-4.5 text-gray-400" />
            </button>
          </div>

          {/* Navigation Items menu */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {navigationItems.map((item) => {
              const active = item.screen === activeScreen;
              return (
                <button
                  key={item.screen}
                  onClick={() => {
                    setActiveScreen(item.screen);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all text-left cursor-pointer ${
                    active 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/10" 
                      : "text-gray-400 hover:text-white hover:bg-gray-900/40"
                  }`}
                >
                  <span className={active ? "text-white" : "text-gray-500"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sync panel indicator */}
        <div className="p-4 border-t border-gray-800/60 bg-[#070b12] shrink-0 space-y-2">
          {currentUser && (
            <div className="p-2 bg-blue-500/5 rounded-lg border border-blue-500/10 flex items-center gap-2">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-sm font-semibold text-blue-400 border border-blue-500/30">
                  {currentUser.displayName ? currentUser.displayName[0] : "U"}
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-[#070b12]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-gray-200 truncate">{currentUser.displayName || "Online User"}</p>
                <p className="text-[9px] text-gray-500 truncate">{currentUser.email}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse-soft ${currentUser ? "bg-blue-400 animate-pulse" : "bg-green-500"}`} />
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider font-mono">
                {currentUser ? "RTDB-Sync Active" : "SQLite-Sync Active"}
              </span>
            </div>
            <span className="text-[9px] text-gray-600 font-bold uppercase">v2.1.0</span>
          </div>
        </div>
      </aside>

      {/* Main Work Area Workspace */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#030712] relative overflow-hidden">
        {/* Real-time incoming focus bell signal toaster banner */}
        <AnimatePresence>
          {showBellAlert && bellSignal && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4"
            >
              <div className="bg-blue-600 border border-blue-500 text-white rounded-xl shadow-xl shadow-blue-500/20 p-4 flex items-start gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <BellRing className="h-5 w-5 text-white animate-bounce" />
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider">🔔 Focus Reminder!</h4>
                  <p className="text-xs font-medium text-blue-100">
                    <strong>{bellSignal.senderDisplayName || bellSignal.senderUsername}</strong> sent you a study chime. Time to get to work!
                  </p>
                  <button
                    onClick={handleClearBell}
                    className="mt-2 px-3 py-1 bg-white text-blue-600 rounded-lg text-[10px] font-bold tracking-wider hover:bg-blue-50"
                  >
                    Ack Reminder
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Header Controls bar */}
        <header className="h-16 border-b border-gray-800/50 px-6 flex items-center justify-between bg-[#050912]/40 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 -ml-2 hover:bg-gray-800/50 text-gray-400 hover:text-white rounded-lg lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="space-y-0.5">
              <h1 className="text-sm font-bold text-white tracking-tight uppercase">
                {currentNav ? currentNav.label : "Workspace"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Google Authentication Header Button controls */}
            {currentUser ? (
              <div className="flex items-center gap-3">
                <span className="hidden md:inline-flex text-[10px] font-mono text-blue-400 font-bold bg-blue-500/5 border border-blue-500/10 px-2.5 py-1 rounded-lg">
                  Connected: Google Account
                </span>
                <button
                  onClick={handleLogout}
                  title="Sign out of Google"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900/60 hover:bg-red-950/15 border border-gray-800 hover:border-red-900/20 text-gray-400 hover:text-red-400 rounded-lg text-[10px] font-bold tracking-wide transition-all cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold tracking-wide transition-all cursor-pointer shadow-lg shadow-blue-500/10"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>{isLoggingIn ? "Signing In..." : "Google Sync"}</span>
              </button>
            )}

            <span className="text-[10px] font-mono text-gray-500 font-bold bg-[#090d16] border border-gray-800 px-2 py-1 rounded-lg">
              UTC: {new Date().toISOString().split("T")[0]}
            </span>
          </div>
        </header>

        {/* Content Box with soft Framer Motion Fade in Router */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeScreen}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {renderActiveScreen()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Floating Mini-Timer Widget */}
        <AnimatePresence>
          {(timerSeconds > 0 || timerIsRunning) && activeScreen !== Screen.TIMER && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-6 right-6 z-40 w-80 bg-[#090d16]/95 backdrop-blur-md border border-gray-800/90 rounded-2xl shadow-2xl p-4 flex flex-col gap-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${timerIsRunning ? "bg-green-500 animate-pulse" : "bg-amber-500"}`} />
                  <span className="text-[10px] font-mono font-bold tracking-widest text-gray-400 uppercase">STOPWATCH</span>
                </div>
                <button
                  onClick={() => setActiveScreen(Screen.TIMER)}
                  title="Expand to Full screen"
                  className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Time display */}
              <div className="flex items-center justify-between">
                <div className="text-4xl font-mono font-bold text-white tracking-wider leading-none select-none">
                  {formatTime(timerSeconds)}
                </div>

                {/* Symbols controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleTimerGlobal}
                    title={timerIsRunning ? "Pause Stopwatch" : "Start Stopwatch"}
                    className={`p-2.5 rounded-xl text-white font-bold transition-all cursor-pointer ${
                      timerIsRunning ? "bg-amber-600/35 hover:bg-amber-600/50 text-amber-300" : "bg-blue-600 hover:bg-blue-500"
                    }`}
                  >
                    {timerIsRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={handleStopMiniTimer}
                    title="Stop & Reset Stopwatch"
                    className="p-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-red-400 rounded-xl transition-all cursor-pointer"
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </button>
                </div>
              </div>

              {/* Focusers pill */}
              {(() => {
                const activeFocusers = (() => {
                  const list: { username: string; name: string; emoji: string; isMe: boolean }[] = [];
                  if (timerIsRunning && currentUser) {
                    list.push({
                      username: getUsernameFromEmail(currentUser.email),
                      name: myProfile.nickname || "You",
                      emoji: myProfile.emoji || "👨‍💻",
                      isMe: true
                    });
                  }
                  Object.entries(friendsStatuses).forEach(([uname, f]: [string, any]) => {
                    const isFriendFocusing = f.isFocusing || f.focusStatus === "focusing" || f.status === "focusing";
                    if (isFriendFocusing) {
                      list.push({
                        username: uname,
                        name: f.nickname || f.displayName || uname,
                        emoji: f.emoji || "👨‍💻",
                        isMe: false
                      });
                    }
                  });
                  return list;
                })();

                return (
                  <div className="bg-gray-950/60 border border-gray-800/60 rounded-xl py-1.5 px-3 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span className="text-gray-400 font-medium">Focusing:</span>
                      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                        {activeFocusers.length === 0 ? (
                          <span className="text-gray-500 italic">No one focusing</span>
                        ) : (
                          activeFocusers.map((focuser) => (
                            <span
                              key={focuser.username}
                              title={`${focuser.name}${focuser.isMe ? " (You)" : ""}`}
                              className="inline-flex items-center shrink-0"
                            >
                              {renderFocuserIcon(focuser.emoji, "w-6 h-6")}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    {activeFocusers.length > 0 && (
                      <span className="flex h-2 w-2 relative shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                      </span>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save Focus Session Confirmation Modal */}
        <AnimatePresence>
          {saveModalState.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-md bg-[#090d16]/95 backdrop-blur-md border border-gray-800/90 rounded-2xl shadow-2xl p-6 space-y-4 text-white"
              >
                <div className="border-b border-gray-800/60 pb-3">
                  <h2 className="text-base font-display font-bold tracking-tight text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-400 animate-pulse" />
                    Save Focus Session
                  </h2>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                    Review or adjust your recorded focus time and details before uploading.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Task title */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold tracking-wider text-gray-400 uppercase">
                      Task / Topic
                    </label>
                    <input
                      type="text"
                      value={saveModalState.taskTitle}
                      onChange={(e) => setSaveModalState(prev => ({ ...prev, taskTitle: e.target.value }))}
                      placeholder="e.g. Coding new feature"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Tag */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold tracking-wider text-gray-400 uppercase">
                        Tag Category
                      </label>
                      <input
                        type="text"
                        value={saveModalState.tag}
                        onChange={(e) => setSaveModalState(prev => ({ ...prev, tag: e.target.value }))}
                        placeholder="Study, Work, etc."
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-medium"
                      />
                    </div>

                    {/* Start Time */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold tracking-wider text-gray-400 uppercase">
                        Start Time
                      </label>
                      <input
                        type="text"
                        value={saveModalState.startTime}
                        onChange={(e) => setSaveModalState(prev => ({ ...prev, startTime: e.target.value }))}
                        placeholder="e.g. 10:30 AM"
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* Time Duration Adjustment */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold tracking-wider text-gray-400 uppercase">
                      Adjust Duration spent
                    </label>
                    <div className="grid grid-cols-3 gap-2 bg-gray-950 p-3 border border-gray-800/80 rounded-xl">
                      <div className="text-center">
                        <input
                          type="number"
                          min="0"
                          value={saveModalState.hours}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setSaveModalState(prev => ({ ...prev, hours: val }));
                          }}
                          className="w-full bg-transparent text-center text-lg font-bold font-mono focus:outline-none text-white"
                        />
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mt-0.5">Hours</span>
                      </div>
                      <div className="text-center border-x border-gray-800/80">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={saveModalState.minutes}
                          onChange={(e) => {
                            const val = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                            setSaveModalState(prev => ({ ...prev, minutes: val }));
                          }}
                          className="w-full bg-transparent text-center text-lg font-bold font-mono focus:outline-none text-white"
                        />
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mt-0.5">Mins</span>
                      </div>
                      <div className="text-center">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={saveModalState.seconds}
                          onChange={(e) => {
                            const val = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                            setSaveModalState(prev => ({ ...prev, seconds: val }));
                          }}
                          className="w-full bg-transparent text-center text-lg font-bold font-mono focus:outline-none text-white"
                        />
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mt-0.5">Secs</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold tracking-wider text-gray-400 uppercase">
                      Session notes & details
                    </label>
                    <textarea
                      value={saveModalState.notes}
                      onChange={(e) => setSaveModalState(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Write notes or what you achieved..."
                      rows={2}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-medium resize-none"
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={handleSaveFocusSession}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg hover:scale-[1.01] cursor-pointer"
                  >
                    Save Focus Record
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={async () => {
                        // Resume the timer locally
                        localStorage.setItem("life_os_timer_is_running", "true");
                        if (!saveModalState.isPomodoro) {
                          localStorage.setItem("life_os_last_resume_time", JSON.stringify(Date.now()));
                          // Set local accumulated time to saveModalState.elapsedSecs * 1000
                          localStorage.setItem("life_os_accumulated_time", JSON.stringify(saveModalState.elapsedSecs * 1000));
                        }
                        window.dispatchEvent(new Event("life_os_timer_changed"));

                        if (currentUser) {
                          const myUsername = getUsernameFromEmail(currentUser.email);
                          // Resume using the thin-client transaction
                          await startWebSession(
                            myUsername,
                            saveModalState.taskTitle || "Manual Focus Session",
                            saveModalState.tag || "Study",
                            !saveModalState.isPomodoro
                          ).catch((e: any) => console.error("Resume push failed:", e));
                        }

                        setSaveModalState(prev => ({ ...prev, isOpen: false }));
                      }}
                      className="py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Keep & Resume
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm("Are you sure you want to discard this focus session? The stopwatch/timer will be reset.")) {
                          // Reset everything locally
                          localStorage.setItem("life_os_timer_is_running", "false");
                          localStorage.setItem("life_os_stopwatch_seconds", "0");
                          localStorage.setItem("life_os_last_resume_time", "null");
                          localStorage.setItem("life_os_accumulated_time", "0");
                          localStorage.setItem("life_os_session_notes", "");
                          localStorage.setItem("life_os_timer_left", JSON.stringify(25 * 60));
                          window.dispatchEvent(new Event("life_os_timer_changed"));

                          if (currentUser) {
                            const myUsername = getUsernameFromEmail(currentUser.email);
                            
                            // Remove active session node from Firebase
                            await removeFocusRecordFromDb(myUsername, `active_${myUsername}`).catch((err: any) => {
                              console.error("Failed to remove active focus record:", err);
                            });

                            // End the session via transaction
                            await endWebSession(myUsername).catch((e: any) => console.error("Mini timer reset push failed:", e));
                          }

                          setSaveModalState(prev => ({ ...prev, isOpen: false }));
                        }
                      }}
                      className="py-2 bg-red-950/20 hover:bg-red-900/30 border border-red-900/40 text-red-400 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Discard Time
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
