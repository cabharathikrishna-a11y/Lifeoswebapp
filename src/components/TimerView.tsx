import React, { useState, useEffect, useRef } from "react";
import { FocusRecord, Task } from "../types.ts";
import { Play, Pause, RotateCcw, Flame, Users, Calendar, Sparkles, Maximize2, Minimize2, Eye, Clipboard, List, Tag, BellRing, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Real-time integration imports
import { ringFriendBell, getUsernameFromEmail, addFocusRecordToDb, removeFocusRecordFromDb, startWebSession, pauseWebSession, endWebSession, getProfileImageUrl, submitManualEntry } from "../lib/firebase.ts";
import { User } from "firebase/auth";

function safeParse<T>(str: string | null, fallback: T): T {
  if (str === null || str === undefined || str === "undefined" || str === "") return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.warn("JSON parse failed for string:", str, e);
    return fallback;
  }
}

const MOTIVATIONAL_QUOTES = [
  "Focus is a muscle, and you are building it right now.",
  "Deep work is the superpower of the 21st century.",
  "Your attention is your most valuable asset. Guard it fiercely.",
  "Simplify, then focus.",
  "Quiet the mind, concentrate the effort, achieve the flow.",
  "One task. One focus. Pure execution.",
  "Where attention goes, energy flows and results show.",
  "The secret of change is to focus all of your energy, not on fighting the old, but on building the new.",
  "Work deeply. Create beautifully.",
  "Do not mistake activity for achievement. Stay focused.",
  "Be present in all things and thankful for all things."
];

const sanitizeName = (nameString: string) => {
  if (!nameString) return "Focus Partner";
  const nameTrimmed = nameString.trim();
  if (nameTrimmed.startsWith("data:image/") || nameTrimmed.startsWith("base64:") || nameTrimmed.startsWith("/") || nameTrimmed.length > 50) {
    return "Focus Partner";
  }
  return nameTrimmed;
};

const renderAvatar = (avatarString: string, sizeClass: string = "w-8 h-8 text-xl") => {
  if (!avatarString) return null;
  
  let src = avatarString;
  if (avatarString.startsWith("base64:")) {
    const rawBase64 = avatarString.substring("base64:".length);
    src = `data:image/jpeg;base64,${rawBase64}`;
  } else {
    // Extra safety: check if the string itself is a raw base64 image (typically starts with '/9j/' or other Base64 characters and is long)
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
  
  return <span className="text-xl shrink-0 select-none">{avatarString}</span>;
};

interface TimerViewProps {
  tasks: Task[];
  focusRecords: FocusRecord[];
  onAddFocusRecord: (record: FocusRecord) => void;
  currentUser: User | null;
  friendsStatuses: Record<string, any>;
  myStatusNode?: any;
  myProfile?: { nickname: string; emoji: string };
  onTriggerSaveModal?: (data: {
    elapsedSecs: number;
    defaultTaskTitle: string;
    defaultTag: string;
    defaultNotes: string;
    startTime: string;
    isPomodoro: boolean;
  }) => void;
}

export default function TimerView({ 
  tasks, 
  focusRecords, 
  onAddFocusRecord, 
  currentUser, 
  friendsStatuses, 
  myStatusNode,
  myProfile,
  onTriggerSaveModal
}: TimerViewProps) {
  // Timer States
  const [isPomodoro, setIsPomodoro] = useState<boolean>(() => {
    const saved = localStorage.getItem("life_os_is_pomodoro");
    return safeParse(saved, false);
  });
  const [isRunning, setIsRunning] = useState<boolean>(() => {
    const saved = localStorage.getItem("life_os_timer_is_running");
    return safeParse(saved, false);
  });
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const saved = localStorage.getItem("life_os_timer_left");
    return safeParse(saved, 25 * 60);
  });
  const [stopwatchSeconds, setStopwatchSeconds] = useState<number>(() => {
    const savedRunning = localStorage.getItem("life_os_timer_is_running");
    const isRunningVal = safeParse(savedRunning, false);
    const savedIsPomodoro = localStorage.getItem("life_os_is_pomodoro");
    const isPomodoroVal = safeParse(savedIsPomodoro, false);

    const savedSecs = localStorage.getItem("life_os_stopwatch_seconds");
    const stopwatchSecsVal = safeParse(savedSecs, 0);

    // In case stopwatch was active when browser closed, calculate the real elapsed seconds to now
    if (isRunningVal && !isPomodoroVal) {
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
    return stopwatchSecsVal;
  });
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(() => {
    const saved = localStorage.getItem("life_os_selected_task_id");
    return safeParse(saved, null);
  });
  const [activeTag, setActiveTag] = useState<string>(() => {
    const saved = localStorage.getItem("life_os_active_tag");
    return safeParse(saved, "Study");
  });
  const [sessionNotes, setSessionNotes] = useState<string>(() => {
    const saved = localStorage.getItem("life_os_session_notes");
    return safeParse(saved, "");
  });
  const [isImmersive, setIsImmersive] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentQuote, setCurrentQuote] = useState("");

  // Manual Time Entry States
  const [manualMinutes, setManualMinutes] = useState<string>("");
  const [manualReason, setManualReason] = useState<string>("");
  const [isSubmittingManual, setIsSubmittingManual] = useState<boolean>(false);
  const [manualSubmitStatus, setManualSubmitStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Constants
  const [pomodoroMinutes, setPomodoroMinutes] = useState<number>(() => {
    const saved = localStorage.getItem("life_os_pomodoro_minutes");
    return safeParse(saved, 25);
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<string>(
    safeParse(localStorage.getItem("life_os_start_time"), "")
  );
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Visual/Animated bell ring cooldown state
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

  // Persist states to localStorage
  useEffect(() => {
    localStorage.setItem("life_os_is_pomodoro", JSON.stringify(isPomodoro));
  }, [isPomodoro]);

  useEffect(() => {
    localStorage.setItem("life_os_timer_is_running", JSON.stringify(isRunning));
  }, [isRunning]);

  useEffect(() => {
    localStorage.setItem("life_os_timer_left", JSON.stringify(timeLeft));
  }, [timeLeft]);

  useEffect(() => {
    localStorage.setItem("life_os_stopwatch_seconds", JSON.stringify(stopwatchSeconds));
  }, [stopwatchSeconds]);

  useEffect(() => {
    localStorage.setItem("life_os_pomodoro_minutes", JSON.stringify(pomodoroMinutes));
  }, [pomodoroMinutes]);

  useEffect(() => {
    localStorage.setItem("life_os_selected_task_id", JSON.stringify(selectedTaskId));
  }, [selectedTaskId]);

  useEffect(() => {
    localStorage.setItem("life_os_active_tag", JSON.stringify(activeTag));
  }, [activeTag]);

  useEffect(() => {
    localStorage.setItem("life_os_session_notes", JSON.stringify(sessionNotes));
  }, [sessionNotes]);

  // Notify App.tsx of timer changes
  useEffect(() => {
    window.dispatchEvent(new Event("life_os_timer_changed"));
  }, [isRunning, stopwatchSeconds, timeLeft, isPomodoro]);

  // Sync from other components via life_os_timer_changed event
  useEffect(() => {
    const handleTimerChangedExternal = () => {
      const storedRunning = localStorage.getItem("life_os_timer_is_running") === "true";
      const storedIsPomodoro = localStorage.getItem("life_os_is_pomodoro") === "true";
      
      const storedTimeLeftVal = localStorage.getItem("life_os_timer_left");
      const storedTimeLeft = safeParse(storedTimeLeftVal, 25 * 60);

      const storedStopwatchSecsVal = localStorage.getItem("life_os_stopwatch_seconds");
      let storedStopwatchSeconds = safeParse(storedStopwatchSecsVal, 0);
      
      if (storedRunning && !storedIsPomodoro) {
        const savedLastResume = localStorage.getItem("life_os_last_resume_time");
        const savedAccumulated = localStorage.getItem("life_os_accumulated_time");
        if (savedLastResume) {
          const lastResume = safeParse(savedLastResume, 0);
          const accumulated = safeParse(savedAccumulated, 0);
          if (lastResume > 0) {
            const elapsedMs = Date.now() - lastResume;
            storedStopwatchSeconds = Math.round((accumulated + elapsedMs) / 1000);
          }
        }
      }

      if (!storedRunning) {
        lastResumeTimeMsRef.current = null;
        accumulatedTimeMsRef.current = 0;
      } else {
        const savedLastResume = localStorage.getItem("life_os_last_resume_time");
        const savedAccumulated = localStorage.getItem("life_os_accumulated_time");
        if (savedLastResume) {
          lastResumeTimeMsRef.current = safeParse(savedLastResume, null);
        }
        if (savedAccumulated) {
          accumulatedTimeMsRef.current = safeParse(savedAccumulated, 0);
        }
      }

      if (isRunning !== storedRunning) {
        setIsRunning(storedRunning);
      }
      if (isPomodoro !== storedIsPomodoro) {
        setIsPomodoro(storedIsPomodoro);
      }
      if (timeLeft !== storedTimeLeft) {
        setTimeLeft(storedTimeLeft);
        timeLeftRef.current = storedTimeLeft;
      }
      if (stopwatchSeconds !== storedStopwatchSeconds) {
        setStopwatchSeconds(storedStopwatchSeconds);
        stopwatchSecondsRef.current = storedStopwatchSeconds;
      }

      const storedTaskIdVal = localStorage.getItem("life_os_selected_task_id");
      const storedTaskId = safeParse(storedTaskIdVal, null);
      if (selectedTaskId !== storedTaskId) {
        setSelectedTaskId(storedTaskId);
      }

      const storedTagVal = localStorage.getItem("life_os_active_tag");
      const storedTag = safeParse(storedTagVal, "Study");
      if (activeTag !== storedTag) {
        setActiveTag(storedTag);
      }

      const storedNotesVal = localStorage.getItem("life_os_session_notes");
      const storedNotes = safeParse(storedNotesVal, "");
      if (sessionNotes !== storedNotes) {
        setSessionNotes(storedNotes);
      }
    };

    window.addEventListener("life_os_timer_changed", handleTimerChangedExternal);
    return () => {
      window.removeEventListener("life_os_timer_changed", handleTimerChangedExternal);
    };
  }, [isRunning, isPomodoro, timeLeft, stopwatchSeconds, selectedTaskId, activeTag, sessionNotes]);

  // Handle active countdown setting changes
  useEffect(() => {
    if (isPomodoro && !isRunning) {
      setTimeLeft(pomodoroMinutes * 60);
    }
  }, [pomodoroMinutes, isPomodoro]);

  // Keep mutable references of elapsed times to avoid stale closures in keep-alive syncs
  const timeLeftRef = useRef(timeLeft);
  const stopwatchSecondsRef = useRef(stopwatchSeconds);
  const lastResumeTimeMsRef = useRef<number | null>(
    safeParse(localStorage.getItem("life_os_last_resume_time"), null)
  );
  const accumulatedTimeMsRef = useRef<number>(
    safeParse(localStorage.getItem("life_os_accumulated_time"), 0)
  );
  const clientIdRef = useRef<string>("");
  if (!clientIdRef.current) {
    let id = localStorage.getItem("life_os_web_device_id");
    if (!id) {
      id = "web_" + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("life_os_web_device_id", id);
    }
    clientIdRef.current = id;
  }
  const isLocalSessionOwnerRef = useRef<boolean>(true);

  // Sync refs to localStorage
  useEffect(() => {
    localStorage.setItem("life_os_start_time", JSON.stringify(startTimeRef.current));
  }, [isRunning]);

  useEffect(() => {
    localStorage.setItem("life_os_last_resume_time", JSON.stringify(lastResumeTimeMsRef.current));
    localStorage.setItem("life_os_accumulated_time", JSON.stringify(accumulatedTimeMsRef.current));
  }, [isRunning, stopwatchSeconds, timeLeft]);

  // State Contract Synchronization Tracking Refs
  const lastButtonClickedRef = useRef<string | null>(null);
  const lastButtonClickedTimestampRef = useRef<number>(0);
  const lastUpdatedTimestampRef = useRef<number>(0);

  const recordLocalButtonClick = (actionName: string) => {
    const now = Date.now();
    lastButtonClickedRef.current = actionName;
    lastButtonClickedTimestampRef.current = now;
    lastUpdatedTimestampRef.current = now;
  };

  const lastProcessedStatusRef = useRef<{
    isFocusing: boolean;
    isStopwatchMode: boolean;
    lastResumeTimeMs: number;
    accumulatedTimeMs: number;
  } | null>(null);

  const isApplyingRemoteUpdateRef = useRef<boolean>(false);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    stopwatchSecondsRef.current = stopwatchSeconds;
  }, [stopwatchSeconds]);

  // A simple 1-second ticker to drive ALL live calculations (own & friends' live seconds updating)
  const [ticker, setTicker] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setTicker(prev => prev + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Stable mock start times so mock users' live focus times tick cleanly
  const mockStartTimes = useRef({
    madhavan: Date.now() - 42 * 60 * 1000,
    shalini: Date.now() - 18 * 60 * 1000
  });

  // Calculate local start of today (midnight) for timezone-robust calculations
  const startOfTodayLocal = new Date();
  startOfTodayLocal.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfTodayLocal.getTime();
  const todayStr = new Date().toISOString().split("T")[0];
  const todayLocalStr = new Date().toLocaleDateString('en-CA'); // "YYYY-MM-DD"

  const isRecordToday = (rec: any) => {
    if (!rec) return false;
    if (rec.timestamp && rec.timestamp >= startOfTodayMs) return true;
    if (rec.dateString === todayStr || rec.dateString === todayLocalStr) return true;
    return false;
  };

  const getTodayLoggedSecs = () => {
    return focusRecords
      .filter(isRecordToday)
      .reduce((sum, r) => sum + (r.durationSeconds || (r.durationMinutes * 60) || 0), 0);
  };

  const getTodayFocusSecondsForUser = (userNode: any) => {
    if (!userNode) return 0;
    const activeTimer = userNode.active_timer || {};
    const todayStats = userNode.today_stats || {};

    const status = activeTimer.status || "RELAXING";
    const startTimeMs = activeTimer.startTimeMs || 0;
    const accumulatedFocusMs = activeTimer.accumulatedFocusMs || 0;
    const todayFocusTimeMs = todayStats.todayFocusTimeMs || 0;

    let liveDelta = 0;
    if (status === "FOCUSING" && startTimeMs > 0) {
      liveDelta = (Date.now() - startTimeMs) + accumulatedFocusMs;
    } else if (status === "BREAK") {
      liveDelta = accumulatedFocusMs;
    }

    return Math.round((todayFocusTimeMs + liveDelta) / 1000);
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatSecondsToDetailed = (totalSecs: number) => {
    if (totalSecs <= 0) return "0s";
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Visual ticking state
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync state variables from active_timer passively
  useEffect(() => {
    if (!myStatusNode) return;
    const activeTimer = myStatusNode.active_timer || {};
    const status = activeTimer.status || "RELAXING";
    const startTimeMs = activeTimer.startTimeMs || 0;
    const accumulatedFocusMs = activeTimer.accumulatedFocusMs || 0;
    const isStopwatchMode = !!activeTimer.isStopwatchMode;

    const incomingIsFocusing = status === "FOCUSING";
    setIsRunning(incomingIsFocusing);
    setIsPomodoro(!isStopwatchMode);

    if (activeTimer.tag) {
      setActiveTag(activeTimer.tag);
    }
    if (activeTimer.taskTitle) {
      const foundTask = tasks.find(t => t.title.toLowerCase() === activeTimer.taskTitle.toLowerCase());
      if (foundTask) {
        setSelectedTaskId(foundTask.id);
      }
    }

    let elapsedMs = accumulatedFocusMs;
    if (status === "FOCUSING" && startTimeMs > 0) {
      elapsedMs += (Date.now() - startTimeMs);
    }
    const elapsedSecs = Math.round(elapsedMs / 1000);

    if (isStopwatchMode) {
      setStopwatchSeconds(elapsedSecs);
      setTimeLeft(pomodoroMinutes * 60);
    } else {
      setStopwatchSeconds(0);
      setTimeLeft(Math.max(0, pomodoroMinutes * 60 - elapsedSecs));
    }
  }, [myStatusNode, pomodoroMinutes, tasks]);

  // Start / Pause timer
  const handleStartPause = async () => {
    if (!currentUser) return;
    const username = getUsernameFromEmail(currentUser.email);
    const activeTask = tasks.find(t => t.id === selectedTaskId);
    const taskTitle = activeTask ? activeTask.title : "General Focus Session";

    if (isRunning) {
      await pauseWebSession(username).catch((err: any) => console.error("Pause session failed:", err));
    } else {
      await startWebSession(username, taskTitle, activeTag, !isPomodoro).catch((err: any) => console.error("Start session failed:", err));
    }
  };

  // Complete session automatically
  const handleTimerComplete = async () => {
    if (!currentUser) return;
    const username = getUsernameFromEmail(currentUser.email);

    const activeTask = tasks.find(t => t.id === selectedTaskId);
    const endTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const record: FocusRecord = {
      id: Math.random().toString(36).substring(2, 9),
      taskTitle: activeTask ? activeTask.title : "General Focus Session",
      tag: activeTag,
      notes: sessionNotes || "Completed pomodoro.",
      durationMinutes: pomodoroMinutes,
      durationSeconds: pomodoroMinutes * 60,
      dateString: new Date().toISOString().split("T")[0],
      startTime: startTimeRef.current || new Date(Date.now() - pomodoroMinutes*60*1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      endTime: endTime,
      timestamp: Date.now()
    };

    onAddFocusRecord(record);
    setSessionNotes("");

    await endWebSession(username).catch((err: any) => console.error("End session failed:", err));
    
    // Play sound notification using AudioContext
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {}
  };

  // Skip or stop stopwatch manually and log
  const handleSkipStop = async () => {
    if (!currentUser) return;
    const username = getUsernameFromEmail(currentUser.email);
    const activeTask = tasks.find(t => t.id === selectedTaskId);

    const activeTimer = myStatusNode?.active_timer || {};
    const status = activeTimer.status || "RELAXING";
    const startTimeMs = activeTimer.startTimeMs || 0;
    const accumulatedFocusMs = activeTimer.accumulatedFocusMs || 0;
    let elapsedMs = accumulatedFocusMs;
    if (status === "FOCUSING" && startTimeMs > 0) {
      elapsedMs += (Date.now() - startTimeMs);
    }
    const elapsedSecs = Math.round(elapsedMs / 1000);

    if (onTriggerSaveModal) {
      onTriggerSaveModal({
        elapsedSecs,
        defaultTaskTitle: activeTask ? activeTask.title : "Manual Focus Session",
        defaultTag: activeTag,
        defaultNotes: sessionNotes || (isPomodoro ? "Stopped early." : "Stopwatch log"),
        startTime: startTimeRef.current || new Date(Date.now() - elapsedSecs * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isPomodoro: isPomodoro
      });
    }

    await endWebSession(username).catch((err: any) => console.error("End session failed:", err));
    setSessionNotes("");
  };

  // Set random quote when entering immersive mode, and rotate it every 30 seconds
  useEffect(() => {
    if (!isImmersive) {
      setCurrentQuote("");
      return;
    }

    const selectRandomQuote = () => {
      const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
      setCurrentQuote(randomQuote);
    };

    selectRandomQuote();
    const interval = setInterval(selectRandomQuote, 30000);

    return () => clearInterval(interval);
  }, [isImmersive]);

  // Monitor user activity in immersive mode to hide controls after 5 seconds of silence
  useEffect(() => {
    if (!isImmersive) {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      return;
    }

    const resetTimer = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    };

    resetTimer();

    const handleActivity = () => {
      resetTimer();
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity);
    window.addEventListener("click", handleActivity);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("click", handleActivity);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isImmersive]);

  const activeTask = tasks.find(t => t.id === selectedTaskId);
  
  // Calculate today's completed focus records seconds
  const todayCompletedSeconds = focusRecords
    .filter(isRecordToday)
    .reduce((acc, r) => acc + (r.durationSeconds || r.durationMinutes * 60), 0);

  // Current active session's seconds (live)
  const currentSessionSeconds = isPomodoro 
    ? (pomodoroMinutes * 60 - timeLeft)
    : stopwatchSeconds;

  const totalFocusSeconds = Math.min(20 * 3600, todayCompletedSeconds + currentSessionSeconds);

  // Calculate my total focus seconds exactly the same way as friends
  let myTotalFocusSeconds = 0;
  if (myStatusNode) {
    myTotalFocusSeconds = getTodayFocusSecondsForUser(myStatusNode);
  } else {
    myTotalFocusSeconds = Math.min(20 * 3600, totalFocusSeconds);
  }

  // Construct our real-time/mock friends list
  const myUsername = currentUser ? getUsernameFromEmail(currentUser.email) : "me";
  const myName = myProfile?.nickname || currentUser?.displayName || "You";
  const myEmoji = myProfile?.emoji || "👨‍💻";

  const meEntry = {
    name: `${myName} (You)`,
    username: myUsername,
    status: isRunning ? "Focusing" : "Idle",
    task: activeTask ? activeTask.title : "General Focus Session",
    emoji: myEmoji,
    time: formatSecondsToDetailed(myTotalFocusSeconds),
    focusSeconds: myTotalFocusSeconds,
    isReal: !!currentUser,
    isMe: true
  };

  const allFriends = currentUser 
    ? [
        meEntry,
        ...Object.keys(friendsStatuses)
          .filter(username => username !== myUsername)
          .map(username => {
            const info = friendsStatuses[username];
            const lastActive = info.lastUpdatedTimestamp || info.lastResumeTimeMs || info.timestamp || 0;
            // Considered active if updated in the last 2 minutes
            const isRecentlyActive = (Date.now() - lastActive < 120000);
            
            let status = "Idle";
            let task = info.currentTaskTitle || "Chilling";
            let defaultEmoji = "☕";
            
            if (isRecentlyActive) {
              const rawStatus = info.status || info.focusStatus || (info.isFocusing ? "focusing" : "idle");
              if (rawStatus === "focusing") {
                status = "Focusing";
                defaultEmoji = "🚀";
              } else if (rawStatus === "paused") {
                status = "Paused";
                defaultEmoji = "⏸️";
                task = info.currentTaskTitle || "General Focus Session";
              } else if (rawStatus === "break" || rawStatus === "on_break") {
                status = "On Break";
                defaultEmoji = "☕";
                task = "Taking a Break";
              } else {
                status = "Idle";
                task = "Chilling";
              }
            } else {
              status = "Idle";
              task = "Chilling";
            }
            
            // Compute their total focus seconds for today (both completed records + current active session time)
            const totalSecs = getTodayFocusSecondsForUser(info);
            
            return {
              name: info.nickname || info.displayName || username,
              username: username,
              status: status,
              task: task,
              emoji: info.emoji || defaultEmoji,
              time: formatSecondsToDetailed(totalSecs),
              focusSeconds: totalSecs,
              isReal: true,
              isMe: false
            };
          })
      ]
    : [
        meEntry,
        { 
          name: "Madhavan", 
          username: "madhavan", 
          status: "Focusing", 
          task: "Kubernetes Orchestration", 
          emoji: "🚀", 
          time: formatSecondsToDetailed(Math.round((Date.now() - mockStartTimes.current.madhavan) / 1000)), 
          focusSeconds: Math.round((Date.now() - mockStartTimes.current.madhavan) / 1000),
          isReal: false,
          isMe: false
        },
        { 
          name: "Shalini", 
          username: "shalini", 
          status: "Paused", 
          task: "Designing UI Wireframes", 
          emoji: "⏸️", 
          time: formatSecondsToDetailed(1080), 
          focusSeconds: 1080,
          isReal: false,
          isMe: false
        },
        { 
          name: "Subash", 
          username: "subash", 
          status: "On Break", 
          task: "Coffee & Stretch", 
          emoji: "☕", 
          time: "0s", 
          focusSeconds: 0,
          isReal: false,
          isMe: false
        }
      ];

  const mergedFriends = [...allFriends].sort((a, b) => b.focusSeconds - a.focusSeconds);

  // Ring a bell on a friend (either real RTDB push or simulated mock toast)
  const handleRingBell = async (friend: any) => {
    if (cooldowns[friend.username] > 0) return;

    // Set cooldown
    setCooldowns(prev => ({ ...prev, [friend.username]: 10 }));
    const interval = setInterval(() => {
      setCooldowns(prev => {
        const val = prev[friend.username] || 0;
        if (val <= 1) {
          clearInterval(interval);
          const next = { ...prev };
          delete next[friend.username];
          return next;
        }
        return { ...prev, [friend.username]: val - 1 };
      });
    }, 1000);

    if (friend.isReal && currentUser) {
      const myUsername = getUsernameFromEmail(currentUser.email);
      await ringFriendBell(
        friend.username,
        currentUser.displayName || myUsername,
        myUsername
      );
    }
  };

  // Find all active focusing members whose timers are running
  const activeFocusingMembers: any[] = [];

  // Add ourselves first if we are focusing (isRunning)
  if (isRunning) {
    activeFocusingMembers.push({
      name: myProfile?.nickname || currentUser?.displayName || "You",
      emoji: myProfile?.emoji || myStatusNode?.emoji || "👨‍💻",
      photoURL: currentUser?.photoURL || null,
      isMe: true,
      task: activeTask ? activeTask.title : "General Focus Session"
    });
  }

  // Add any friends/peers currently in "Focusing" status
  mergedFriends.forEach(friend => {
    if (friend.status === "Focusing") {
      activeFocusingMembers.push({
        name: friend.name,
        emoji: friend.emoji,
        photoURL: null,
        isMe: false,
        task: friend.task
      });
    }
  });

  // Fallback so there's always at least one focusing member showing (ourselves) if no one is running
  if (activeFocusingMembers.length === 0) {
    activeFocusingMembers.push({
      name: myProfile?.nickname || currentUser?.displayName || "You",
      emoji: myProfile?.emoji || myStatusNode?.emoji || "👨‍💻",
      photoURL: currentUser?.photoURL || null,
      isMe: true,
      task: activeTask ? activeTask.title : "Idle"
    });
  }

  // Radial Progress parameters
  const totalDuration = isPomodoro ? pomodoroMinutes * 60 : 3600; // standard stopwatch orbit visual anchor
  const elapsed = isPomodoro ? totalDuration - timeLeft : stopwatchSeconds;
  const percentage = Math.min(100, (elapsed / totalDuration) * 100);
  const radius = 90;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Mode active checks
  const isStopwatchActive = !isPomodoro && (isRunning || stopwatchSeconds > 0);
  const isPomodoroActive = isPomodoro && (isRunning || timeLeft < pomodoroMinutes * 60);
  const hasStarted = isPomodoro 
    ? (timeLeft < pomodoroMinutes * 60 || isRunning) 
    : (stopwatchSeconds > 0 || isRunning);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setManualSubmitStatus({ type: "error", message: "You must be logged in to submit manual entries." });
      return;
    }
    const mins = Number(manualMinutes);
    if (isNaN(mins) || mins <= 0) {
      setManualSubmitStatus({ type: "error", message: "Please enter a valid positive number of minutes." });
      return;
    }
    if (!manualReason.trim()) {
      setManualSubmitStatus({ type: "error", message: "Please enter a reason for the manual entry." });
      return;
    }

    setIsSubmittingManual(true);
    setManualSubmitStatus(null);
    try {
      const username = getUsernameFromEmail(currentUser.email);
      await submitManualEntry(username, mins, manualReason.trim());
      setManualMinutes("");
      setManualReason("");
      setManualSubmitStatus({
        type: "success",
        message: "Manual entry submitted to the processing queue successfully! Waiting for processing..."
      });
      setTimeout(() => setManualSubmitStatus(null), 5000);
    } catch (err: any) {
      console.error("Error submitting manual entry:", err);
      setManualSubmitStatus({
        type: "error",
        message: err.message || "Failed to submit manual entry request."
      });
    } finally {
      setIsSubmittingManual(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="timer-container">
      {/* Interactive timer circular view (col-span-2) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Timer main panel */}
        <div className="bg-gray-900/40 p-8 rounded-2xl border border-gray-800 text-center flex flex-col items-center justify-center relative overflow-hidden min-h-[450px]">
          {/* Immersive Mode toggle */}
          <button
            onClick={() => setIsImmersive(true)}
            className="absolute top-4 right-4 p-2 bg-gray-950 text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700 rounded-lg transition-all cursor-pointer"
            title="Go distraction-free"
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          {/* Core Radial Timer Layout */}
          <div className="relative flex items-center justify-center w-56 h-56 mb-8 mt-6">
            <svg className="w-full h-full transform -rotate-90">
              {/* Outer orbit backgound */}
              <circle
                className="text-gray-800/40"
                strokeWidth={stroke}
                stroke="currentColor"
                fill="transparent"
                r={normalizedRadius}
                cx="112"
                cy="112"
              />
              {/* Active orbit border indicator */}
              <circle
                className="text-blue-500 transition-all duration-300"
                strokeWidth={stroke}
                strokeDasharray={circumference + " " + circumference}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r={normalizedRadius}
                cx="112"
                cy="112"
              />
            </svg>

            {/* Inner text timer */}
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1">
              <span className="font-sans text-4xl font-bold tracking-tight text-white">
                {formatTime(elapsed)}
              </span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
                {isRunning ? "Focusing" : (hasStarted ? "Paused" : "Idle")}
              </span>
            </div>
          </div>

          {/* Interactive controls */}
          <div className="flex flex-col items-center gap-4 w-full max-w-sm mt-4">
            <div className="flex items-center justify-center gap-3.5">
              {/* Main Play / Pause action */}
              <button
                id="timer-play-pause-btn"
                onClick={handleStartPause}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg transform active:scale-95 ${
                  isRunning 
                    ? "bg-yellow-600 text-white shadow-yellow-600/10 hover:bg-yellow-500" 
                    : "bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-500"
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="h-4 w-4 fill-white" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-white ml-0.5" />
                    <span>Start Focus</span>
                  </>
                )}
              </button>

              {/* Explicit "End Session" or "Stop" button */}
              {hasStarted && (
                <button
                  id="timer-end-session-btn"
                  onClick={handleSkipStop}
                  className="flex items-center gap-2 px-5 py-3 bg-red-600/15 hover:bg-red-600 border border-red-500/30 hover:border-red-500 text-red-400 hover:text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  title="End active focus session and save progress"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>End Session</span>
                </button>
              )}
            </div>
          </div>

          {/* Context binder: Active task picker */}
          <div className="w-full max-w-sm mt-8 p-3 bg-gray-950 border border-gray-800 rounded-xl flex items-center gap-3">
            <Clipboard className="h-4 w-4 text-gray-500 shrink-0" />
            <select
              value={selectedTaskId || ""}
              onChange={(e) => setSelectedTaskId(e.target.value ? Number(e.target.value) : null)}
              className="flex-1 bg-transparent text-xs text-gray-300 font-medium focus:outline-none"
            >
              <option value="">-- Bind to Active Task --</option>
              {tasks.filter(t => !t.isCompleted).map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          {/* Session details details */}
          <div className="w-full max-w-sm mt-3 grid grid-cols-2 gap-2">
            <div className="bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800/60 flex items-center gap-2">
              <Tag className="h-3 w-3 text-gray-500" />
              <input
                type="text"
                placeholder="Study, Work..."
                value={activeTag}
                onChange={(e) => setActiveTag(e.target.value)}
                className="bg-transparent text-xs text-gray-200 focus:outline-none w-full font-medium"
              />
            </div>
            <div className="bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800/60 flex items-center gap-2">
              <List className="h-3 w-3 text-gray-500" />
              <input
                type="text"
                placeholder="Notes..."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                className="bg-transparent text-xs text-gray-200 focus:outline-none w-full font-medium"
              />
            </div>
          </div>
        </div>

        {/* Focus stats summary card */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900/20 border border-gray-800/80 p-4 rounded-xl text-center">
            <Calendar className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <div className="text-xl font-bold text-white">{formatSecondsToDetailed(myTotalFocusSeconds)}</div>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Focus Time</div>
          </div>
          <div className="bg-gray-900/20 border border-gray-800/80 p-4 rounded-xl text-center">
            <Users className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
            <div className="text-xl font-bold text-white">
              {(isRunning ? 1 : 0) + mergedFriends.filter(f => f.status === "Focusing").length}
            </div>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Peers</div>
          </div>
        </div>

        {/* Manual Time Entry Card */}
        <div className="bg-gray-900/40 border border-gray-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
            <Plus className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Manual Time Entry
            </h3>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Missed logging a focus session? Submit your focus duration and reason below. The request will be queued and processed asynchronously.
          </p>

          <form onSubmit={handleManualSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1 space-y-1">
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider font-bold block">
                  Focus Minutes
                </label>
                <div className="bg-gray-950 px-3 py-2 rounded-xl border border-gray-800 flex items-center">
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 45"
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(e.target.value)}
                    disabled={isSubmittingManual}
                    className="bg-transparent text-xs text-white outline-none w-full font-medium"
                    required
                  />
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider font-bold block">
                  Reason / Task Description
                </label>
                <div className="bg-gray-950 px-3 py-2 rounded-xl border border-gray-800 flex items-center">
                  <input
                    type="text"
                    placeholder="e.g. Offline study, textbook reading"
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    disabled={isSubmittingManual}
                    className="bg-transparent text-xs text-white outline-none w-full font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            {manualSubmitStatus && (
              <div className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${
                manualSubmitStatus.type === "success"
                  ? "bg-green-500/10 text-green-400 border-green-500/15"
                  : "bg-red-500/10 text-red-400 border-red-500/15"
              }`}>
                <div className="space-y-0.5">
                  <p className="font-bold">{manualSubmitStatus.type === "success" ? "Request Queued" : "Submission Error"}</p>
                  <p className="text-[10px] font-medium leading-relaxed">{manualSubmitStatus.message}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmittingManual}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
              >
                {isSubmittingManual ? "Submitting..." : "Submit to Queue"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sidebar: Friends Focus Panel & Focus Logs */}
      <div className="space-y-6">
        {/* Friends Focus panel */}
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" /> Friends Focus
            </h3>
            <span className="text-[10px] text-gray-500 font-bold px-1.5 py-0.5 bg-gray-950 rounded border border-gray-800">
              Live
            </span>
          </div>

          <div className="space-y-3">
            {mergedFriends.map((friend) => {
              const cooldown = cooldowns[friend.username] || 0;
              return (
                <div key={friend.username} className="flex items-center justify-between bg-gray-950 p-3 rounded-lg border border-gray-800/50">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {renderAvatar(friend.emoji, "w-8 h-8 text-xl")}
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-bold text-gray-200 truncate">{sanitizeName(friend.name)}</h4>
                        <span className={`text-[8px] px-1.5 py-0.2 rounded-full font-bold border shrink-0 ${
                          friend.status === "Focusing"
                            ? "text-blue-400 bg-blue-500/10 border-blue-500/25 shadow-[0_0_8px_rgba(59,130,246,0.1)] animate-pulse"
                            : friend.status === "Paused"
                            ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/25"
                            : friend.status === "On Break"
                            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
                            : "text-gray-500 bg-gray-900 border-gray-800"
                        }`}>
                          {friend.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate max-w-[140px]" title={friend.task}>
                        {friend.task}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                      friend.status === "Focusing"
                        ? "text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.15)] animate-pulse"
                        : friend.status === "Paused"
                        ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
                        : friend.status === "On Break"
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : "text-gray-500 bg-gray-900 border-gray-800"
                    }`}>
                      {friend.time || "0s"}
                    </span>
                    {!friend.isMe && (
                      <button
                        onClick={() => handleRingBell(friend)}
                        disabled={cooldown > 0}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          cooldown > 0
                            ? "bg-gray-900 text-gray-600 border-gray-800"
                            : "bg-blue-600/10 text-blue-400 border-blue-500/20 hover:bg-blue-600/20"
                        }`}
                        title={cooldown > 0 ? `Ring again in ${cooldown}s` : "Ring focus notification bell"}
                      >
                        <BellRing className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Focus Records Session Logs */}
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-800 pb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-400" /> Recent Focus Sessions
          </h3>

          <div className="space-y-2.5 max-h-[195px] overflow-y-auto pr-1">
            {focusRecords.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No focus sessions tracked yet.</p>
            ) : (
              [...focusRecords]
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                .map((record) => (
                <div key={record.id} className="bg-gray-950 p-2.5 rounded-lg border border-gray-800/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-200 truncate max-w-[130px]">{record.taskTitle}</span>
                    <span className="text-[9px] font-mono font-medium text-gray-500 bg-gray-900 px-1 py-0.5 rounded">
                      {record.startTime}-{record.endTime}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span className="bg-blue-500/10 text-blue-400/90 border border-blue-500/10 px-1.5 py-0.2 rounded font-mono text-[9px]">
                      {record.tag}
                    </span>
                    <span className="font-semibold text-gray-400 font-mono">{record.durationMinutes}m</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Immersive Full Screen Overlay */}
      <AnimatePresence>
        {isImmersive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#030712] z-50 flex flex-col items-center justify-center p-8 text-center select-none"
          >
            {/* Active Focusing User Mini Boxes (Always Shown) */}
            <div className="absolute top-6 left-6 flex flex-wrap gap-3 max-w-[calc(100vw-180px)] select-none z-10">
              {activeFocusingMembers.map((member) => (
                <div 
                  key={member.name} 
                  className="flex items-center gap-2.5 bg-gray-900/60 backdrop-blur-md border border-gray-800/85 px-3.5 py-2 rounded-xl shadow-xl select-none text-left"
                >
                  {member.photoURL ? (
                    <div className="relative shrink-0">
                      <img
                        src={member.photoURL}
                        alt={member.name}
                        referrerPolicy="no-referrer"
                        className="h-8 w-8 rounded-full border border-blue-500/30 object-cover"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                    </div>
                  ) : (
                    <div className="relative h-8 w-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-lg shrink-0">
                      {member.emoji && (member.emoji.startsWith("base64:") || member.emoji.startsWith("data:image/") || member.emoji.startsWith("http")) ? (
                        <img 
                          src={member.emoji.startsWith("base64:") ? `data:image/jpeg;base64,${member.emoji.substring(7)}` : member.emoji}
                          referrerPolicy="no-referrer"
                          className="h-full w-full rounded-full object-cover"
                          alt={member.name}
                        />
                      ) : (
                        <span>{member.emoji}</span>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-[8px] text-blue-400 font-bold uppercase tracking-wider leading-none">
                      {member.isMe ? "You focusing" : "Active Focus"}
                    </div>
                    <div className="text-xs font-bold text-gray-200 truncate max-w-[110px] leading-tight">
                      {member.name}
                    </div>
                    <div className="text-[9px] text-gray-500 truncate max-w-[110px] leading-tight">
                      {member.task}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Back to standard view (Hides after 5s) */}
            <AnimatePresence>
              {showControls && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setIsImmersive(false)}
                  className="absolute top-6 right-6 flex items-center gap-1.5 px-3.5 py-2 bg-gray-900/80 backdrop-blur-sm hover:bg-gray-800 border border-gray-800 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition-all cursor-pointer z-20 shadow-lg"
                >
                  <Minimize2 className="h-3.5 w-3.5" /> Back to Workspace
                </motion.button>
              )}
            </AnimatePresence>

            {/* Immersive content */}
            <div className="space-y-6 max-w-md w-full">
              {/* Dynamic status statement (Hides after 5s) */}
              <div className="h-14 flex items-center justify-center">
                <AnimatePresence>
                  {showControls && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-1"
                    >
                      <span className="text-[10px] text-blue-400 font-mono uppercase tracking-widest font-bold">
                        STOPWATCH
                      </span>
                      <h1 className="text-2xl font-display font-bold tracking-tight text-white truncate max-w-sm">
                        {activeTask ? activeTask.title : "Deep focus session active..."}
                      </h1>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Massive ambient countdown timer (Always shown, completely stable and static, no blink) */}
              <div className="text-8xl md:text-9xl font-sans font-bold tracking-wider text-white py-4 select-none leading-none">
                {formatTime(elapsed)}
              </div>

              {/* Motivational Quote (Always shown under the timer) */}
              <div className="py-2">
                <p className="text-sm md:text-base text-gray-300 font-medium max-w-sm mx-auto leading-relaxed select-none px-4 py-2.5 bg-gray-900/20 backdrop-blur-sm border border-gray-800/40 rounded-xl">
                  "{currentQuote || "Deep work is the superpower of the 21st century."}"
                </p>
              </div>

              {/* Interactive breathing loops indicator (Always shown) */}
              <p className="text-xs text-gray-500 italic max-w-xs mx-auto leading-relaxed select-none">
                "Inhale through your nose, expand your lungs, hold momentarily, and slowly exhale..."
              </p>

              {/* Pause / Play controls (Hides after 5s) */}
              <div className="h-16 flex items-center justify-center">
                <AnimatePresence>
                  {showControls && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="flex justify-center gap-4"
                    >
                      <button
                        onClick={handleStartPause}
                        className={`px-8 py-3 rounded-full font-bold text-sm tracking-wide shadow-lg cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                          isRunning 
                            ? "bg-yellow-600 hover:bg-yellow-500 text-white shadow-yellow-600/10" 
                            : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20"
                        }`}
                      >
                        {isRunning ? "PAUSE INTERVAL" : "RESUME INTERVAL"}
                      </button>
                      <button
                        onClick={handleSkipStop}
                        className="px-6 py-3 bg-gray-900 border border-gray-800 hover:border-gray-700 text-red-400 hover:text-red-300 rounded-full text-sm font-bold tracking-wide cursor-pointer transition-all hover:scale-105 active:scale-95"
                      >
                        END SESSION
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
