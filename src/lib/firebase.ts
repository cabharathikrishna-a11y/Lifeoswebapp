import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { getAnalytics, logEvent } from "firebase/analytics";
import { 
  getMessaging, 
  onMessage, 
  isSupported, 
  register, 
  onRegistered, 
  getToken 
} from "firebase/messaging";
import { FocusRecord } from "../types.ts";
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from "firebase/auth";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  onValue, 
  off, 
  update, 
  child,
  DataSnapshot,
  runTransaction,
  push,
  serverTimestamp
} from "firebase/database";
const firebaseConfig = {
  apiKey: "AIzaSyCiyyZNqnelPBIyFCstHZ80hvgn1at1Gow",
  authDomain: "lifeosca.firebaseapp.com",
  databaseURL: "https://lifeosca-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lifeosca",
  storageBucket: "lifeosca.firebasestorage.app",
  messagingSenderId: "432934819080",
  appId: "1:432934819080:web:4e951a330c742a5abcc8bd",
  measurementId: "G-V8W5Z3N2P9"
};

import { getStorage, ref as storageRef, getDownloadURL } from "firebase/storage";

const app = initializeApp(firebaseConfig);

// Initialize Firebase Analytics
export let analytics: any = null;
if (typeof window !== "undefined") {
  try {
    analytics = getAnalytics(app);
    console.log("[Analytics] Firebase Analytics initialized successfully with measurementId:", firebaseConfig.measurementId);
  } catch (err) {
    console.warn("[Analytics] Firebase Analytics initialization failed/skipped:", err);
  }
}

/**
 * Utility to log standard and custom events to Firebase Analytics
 */
export const logFirebaseEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (analytics) {
    try {
      logEvent(analytics, eventName, eventParams);
      console.log(`[Analytics] Logged event: "${eventName}"`, eventParams);
    } catch (err) {
      console.warn(`[Analytics] Failed to log event "${eventName}":`, err);
    }
  }
};

// Initialize App Check for local debugging and reCAPTCHA Enterprise
if (typeof window !== "undefined") {
  (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = "C3E6F273-8953-4466-AA23-C274E4D6F598";
}

export let appCheck: any = null;
if (typeof window !== "undefined") {
  try {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider("6Lf61EwtAAAAAMvpiXdg6Kv-A4Ke3GPo4nuN3IIe"),
      isTokenAutoRefreshEnabled: true
    });
    console.log("[Firebase] App Check (reCAPTCHA Enterprise) initialized successfully.");
  } catch (err) {
    console.warn("[Firebase] App Check (reCAPTCHA Enterprise) initialization skipped/failed:", err);
  }
}

// Initialize the Firebase AI Logic backend service (Gemini Developer API)
export const aiService = getAI(app, { backend: new GoogleAIBackend() });
export const generativeModel = getGenerativeModel(aiService, { model: "gemini-3.5-flash" });

export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);

// -----------------------------------------------------------------------------
// PROFILE IMAGE CACHING PROTOCOL (IndexedDB + localStorage)
// -----------------------------------------------------------------------------

const openImageDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ProfileImageCacheDB", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("images")) {
        db.createObjectStore("images");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getCachedBlob = async (username: string): Promise<Blob | null> => {
  try {
    const db = await openImageDB();
    return new Promise((resolve) => {
      const transaction = db.transaction("images", "readonly");
      const store = transaction.objectStore("images");
      const req = store.get(username);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

const saveCachedBlob = async (username: string, blob: Blob): Promise<void> => {
  try {
    const db = await openImageDB();
    return new Promise((resolve) => {
      const transaction = db.transaction("images", "readwrite");
      const store = transaction.objectStore("images");
      const req = store.put(blob, username);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {}
};

export const getProfileImageUrl = async (username: string, photoUpdatedAt: number): Promise<string> => {
  const cacheKey = `img_updated_${username}`;
  const storedTimestamp = localStorage.getItem(cacheKey);

  if (storedTimestamp && Number(storedTimestamp) === photoUpdatedAt) {
    const cachedBlob = await getCachedBlob(username);
    if (cachedBlob) {
      return URL.createObjectURL(cachedBlob);
    }
  }

  try {
    const imgPath = `profile_pictures/${username}.jpg`;
    const imageRef = storageRef(storage, imgPath);
    const downloadUrl = await getDownloadURL(imageRef);
    
    const response = await fetch(downloadUrl);
    const blob = await response.blob();
    
    await saveCachedBlob(username, blob);
    localStorage.setItem(cacheKey, String(photoUpdatedAt));
    
    return URL.createObjectURL(blob);
  } catch (error) {
    console.warn("Failed to fetch/cache profile image:", error);
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;
  }
};

export const getGoogleProvider = (withWorkspaceScopes: boolean = true): GoogleAuthProvider => {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({
    prompt: "select_account"
  });
  
  if (withWorkspaceScopes) {
    p.addScope("https://www.googleapis.com/auth/calendar");
    p.addScope("https://www.googleapis.com/auth/calendar.events");
    p.addScope("https://www.googleapis.com/auth/drive.file");
    p.addScope("https://www.googleapis.com/auth/drive.readonly");
    p.addScope("https://www.googleapis.com/auth/spreadsheets");
    p.addScope("https://www.googleapis.com/auth/documents");
    p.addScope("https://www.googleapis.com/auth/tasks");
    p.addScope("https://www.googleapis.com/auth/contacts");
    p.addScope("https://www.googleapis.com/auth/contacts.readonly");
    p.addScope("https://www.googleapis.com/auth/drive.metadata.readonly");
  }
  
  p.addScope("https://www.googleapis.com/auth/userinfo.profile");
  p.addScope("https://www.googleapis.com/auth/userinfo.email");
  
  return p;
};

export interface AuthLogEntry {
  timestamp: string;
  type: "info" | "warn" | "error" | "success";
  message: string;
  details?: any;
}

class AuthDebugLogger {
  private logs: AuthLogEntry[] = [];
  private listeners: ((logs: AuthLogEntry[]) => void)[] = [];

  constructor() {
    // Add logger to window for quick console diagnostics
    if (typeof window !== "undefined") {
      (window as any).authLogger = this;
    }
  }

  log(type: "info" | "warn" | "error" | "success", message: string, details?: any) {
    const entry: AuthLogEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      details: details ? this.sanitize(details) : undefined
    };
    this.logs.push(entry);
    console.log(`[AuthDebugLogger] [${type.toUpperCase()}] ${message}`, details || "");
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  getLogs() {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.listeners.forEach(listener => listener([]));
    this.log("info", "Auth log cleared");
  }

  subscribe(listener: (logs: AuthLogEntry[]) => void) {
    this.listeners.push(listener);
    listener([...this.logs]);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private sanitize(val: any): any {
    try {
      // Prevent cyclic reference crashes and format errors nicely
      const seen = new WeakSet();
      return JSON.parse(JSON.stringify(val, (key, value) => {
        if (value instanceof Error) {
          const error: any = {};
          Object.getOwnPropertyNames(value).forEach((k) => {
            error[k] = (value as any)[k];
          });
          return error;
        }
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return "[Circular]";
          }
          seen.add(value);
        }
        return value;
      }));
    } catch (e) {
      return String(val);
    }
  }
}

export const authLogger = new AuthDebugLogger();

let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Real-time listener unsubscribers
let friendsListenerUnsubscribe: (() => void) | null = null;
let bellListenerUnsubscribe: (() => void) | null = null;

// Initialize auth state listener.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: (reason?: string) => void
) => {
  authLogger.log("info", "Initializing Firebase Auth State subscription");
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      authLogger.log("info", "Firebase Auth state changed: Logged In", {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        hasCachedToken: !!cachedAccessToken
      });

      const username = getUsernameFromEmail(user.email || "");
      if (username) {
        try {
          const userRef = ref(database, `users/${username}`);
          const snapshot = await get(userRef);
          if (!snapshot.exists()) {
            authLogger.log("warn", "User authenticated but no profile found in RTDB. Rejecting session.");
            await signOut(auth).catch(() => {});
            cachedAccessToken = null;
            if (onAuthFailure) onAuthFailure("ACCOUNT_NOT_FOUND");
            return;
          }
        } catch (err) {
          console.error("Failed to verify user registration in RTDB:", err);
          await signOut(auth).catch(() => {});
          cachedAccessToken = null;
          if (onAuthFailure) onAuthFailure();
          return;
        }
      }

      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        authLogger.log("warn", "User is logged in, but cachedAccessToken was missing from flow. Triggering callback with empty token.");
        if (onAuthSuccess) onAuthSuccess(user, "");
      }
    } else {
      authLogger.log("info", "Firebase Auth state changed: Logged Out");
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Help diagnose browser sandbox environment constraints
const getDiagnosticReport = (withWorkspaceScopes: boolean = true) => {
  const report: any = {
    userAgent: navigator.userAgent,
    online: navigator.onLine,
    isIframe: typeof window !== "undefined" && window.self !== window.top,
    location: typeof window !== "undefined" ? window.location.href : "unknown",
    cookiesEnabled: typeof navigator !== "undefined" ? navigator.cookieEnabled : "unknown",
  };

  // Test local/session storage support
  try {
    localStorage.setItem("__auth_diag_test__", "1");
    localStorage.removeItem("__auth_diag_test__");
    report.localStorageAccess = "granted";
  } catch (e: any) {
    report.localStorageAccess = "blocked";
    report.localStorageAccessError = e?.message || String(e);
  }

  // Auth provider settings
  try {
    const prov = getGoogleProvider(withWorkspaceScopes);
    report.providerId = prov.providerId;
    report.withWorkspaceScopes = withWorkspaceScopes;
  } catch (e) {}

  return report;
};

// Sign in with Google (Popup)
export const googleSignIn = async (withWorkspaceScopes: boolean = true): Promise<{ user: User; accessToken: string } | null> => {
  authLogger.log("info", "Initiating googleSignIn (Popup method)", getDiagnosticReport(withWorkspaceScopes));
  try {
    isSigningIn = true;
    authLogger.log("info", "Calling Firebase signInWithPopup...");
    const prov = getGoogleProvider(withWorkspaceScopes);
    const result = await signInWithPopup(auth, prov);
    
    authLogger.log("success", "Successfully finished signInWithPopup", {
      uid: result.user.uid,
      displayName: result.user.displayName,
      email: result.user.email
    });

    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      const tokenError = new Error("Failed to retrieve access token from Google Auth Provider");
      authLogger.log("error", "Google credential missing access token", { result });
      throw tokenError;
    }
    
    cachedAccessToken = credential.accessToken;
    authLogger.log("info", "Retrieved Google API access token securely");

    // Auto-save user to RTDB "/users" structure
    authLogger.log("info", "Registering user in Realtime Database...", { email: result.user.email });
    await registerUserInDb(result.user);
    authLogger.log("success", "User profile successfully registered in RTDB database");
    
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    authLogger.log("error", "Exception in googleSignIn (Popup)", {
      code: error.code,
      message: error.message,
      customData: error.customData,
      email: error.email,
      credential: error.credential,
      stack: error.stack
    });
    console.error("Firebase Sign-in Error:", error);
    await signOut(auth).catch(() => {});
    cachedAccessToken = null;
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Sign in with Google (Redirect)
export const googleSignInRedirect = async (withWorkspaceScopes: boolean = true): Promise<void> => {
  authLogger.log("info", "Initiating googleSignInRedirect (Redirect method)", getDiagnosticReport(withWorkspaceScopes));
  try {
    isSigningIn = true;
    authLogger.log("info", "Calling Firebase signInWithRedirect...");
    const prov = getGoogleProvider(withWorkspaceScopes);
    await signInWithRedirect(auth, prov);
  } catch (error: any) {
    authLogger.log("error", "Exception in googleSignInRedirect", {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    console.error("Firebase Redirect Sign-in Error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Handle redirect result on load
export const handleRedirectResult = async (): Promise<{ user: User; accessToken: string } | null> => {
  authLogger.log("info", "Checking handleRedirectResult on app load", getDiagnosticReport());
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      authLogger.log("success", "Successfully resolved redirect sign-in result", {
        uid: result.user.uid,
        displayName: result.user.displayName,
        email: result.user.email
      });

      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
        authLogger.log("info", "Retrieved Google API access token via redirect credential");
        
        await registerUserInDb(result.user);
        authLogger.log("success", "User profile registered in RTDB via redirect flow");
        return { user: result.user, accessToken: cachedAccessToken };
      } else {
        authLogger.log("warn", "Redirect sign-in completed but did not yield an access token.");
      }
    } else {
      authLogger.log("info", "No redirect sign-in result detected (standard page load)");
    }
    return null;
  } catch (error: any) {
    authLogger.log("error", "Exception in handleRedirectResult", {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    console.error("Redirect auth retrieval failed:", error);
    await signOut(auth).catch(() => {});
    cachedAccessToken = null;
    throw error;
  }
};

// Helper: Register/Update user metadata in RTDB
const registerUserInDb = async (user: User) => {
  const username = getUsernameFromEmail(user.email || "");
  if (!username) return;

  const userRef = ref(database, `users/${username}`);
  const snapshot = await get(userRef);
  
  if (!snapshot.exists()) {
    throw new Error("ACCOUNT_NOT_FOUND");
  }
  
  const existingData = snapshot.val() || {};
  
  const updatePayload = {
    name: user.displayName || "Google User",
    nickname: existingData.nickname || user.displayName?.split(" ")[0] || "User",
    emoji: existingData.emoji || "👨‍💻",
    email: user.email,
    isGoogleUser: true,
    status: "active",
    lastUpdatedTimestamp: Date.now()
  };

  await update(userRef, updatePayload);
};

// Log Out
export const googleSignOut = async () => {
  const user = auth.currentUser;
  if (user) {
    const username = getUsernameFromEmail(user.email || "");
    if (username) {
      // Set status to idle/logged_out in RTDB
      await update(ref(database, `users/${username}`), {
        status: "logged_out",
        isFocusing: false,
        focusStatus: "idle"
      });
      // Delete any active focus session record
      await removeFocusRecordFromDb(username, `active_${username}`).catch(() => {});
    }
  }
  
  if (friendsListenerUnsubscribe) {
    friendsListenerUnsubscribe();
    friendsListenerUnsubscribe = null;
  }
  if (bellListenerUnsubscribe) {
    bellListenerUnsubscribe();
    bellListenerUnsubscribe = null;
  }

  await signOut(auth);
  cachedAccessToken = null;
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

// Utility: parse username from email
export const getUsernameFromEmail = (email: string | null): string => {
  if (!email) return "";
  return email.toLowerCase().trim().split("@")[0].replace(/[.\#$\[\]]/g, "_"); // sanitize for firebase path
};

// Update custom profile metadata (nickname, emoji)
export const updateMyProfile = async (email: string | null, nickname: string, emoji: string) => {
  const username = getUsernameFromEmail(email);
  if (!username) return;
  const userRef = ref(database, `users/${username}`);
  await update(userRef, {
    nickname,
    emoji,
    lastUpdatedTimestamp: Date.now()
  });
};

// -----------------------------------------------------------------------------
// REALTIME DATABASE SYNC ACTIONS (THIN CLIENT TRANSACTIONS & LISTENERS)
// -----------------------------------------------------------------------------

// Isolated Realtime Listeners
export const listenToActiveTimer = (username: string, callback: (data: any) => void): (() => void) => {
  if (!username) return () => {};
  const timerRef = ref(database, `users/${username}/active_timer`);
  const onValueCallback = (snapshot: DataSnapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  };
  onValue(timerRef, onValueCallback);
  return () => {
    off(timerRef, "value", onValueCallback);
  };
};

export const listenToTodayStats = (username: string, callback: (data: any) => void): (() => void) => {
  if (!username) return () => {};
  const statsRef = ref(database, `users/${username}/today_stats`);
  const onValueCallback = (snapshot: DataSnapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  };
  onValue(statsRef, onValueCallback);
  return () => {
    off(statsRef, "value", onValueCallback);
  };
};

export const listenToTimerSettings = (username: string, callback: (data: any) => void): (() => void) => {
  if (!username) return () => {};
  const settingsRef = ref(database, `users/${username}/timer_settings`);
  const onValueCallback = (snapshot: DataSnapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  };
  onValue(settingsRef, onValueCallback);
  return () => {
    off(settingsRef, "value", onValueCallback);
  };
};

export const saveTimerSettings = async (username: string, settings: {
  timerDurationMinutes?: number;
  stopwatchBreakDurationMinutes?: number;
  autoStartBreak?: boolean;
  autoStartPomo?: boolean;
  autoStartStopwatchAfterBreak?: boolean;
}) => {
  if (!username) return;
  const settingsRef = ref(database, `users/${username}/timer_settings`);
  await update(settingsRef, settings).catch(err => {
    console.error("Error saving timer settings to Firebase:", err);
  });
};


// One-time profile fetcher
export const toggleWebSessionMode = async (username: string, toPomodoro: boolean) => {
  if (!username) return;
  const timerRef = ref(database, `users/${username}/active_timer`);
  await update(timerRef, {
    isStopwatchMode: !toPomodoro,
    mode: toPomodoro ? "POMODORO" : "STOPWATCH",
    lastUpdatedTimestamp: Date.now()
  });
};

export const fetchUserProfile = async (username: string): Promise<any> => {
  if (!username) return null;
  const userRef = ref(database, `users/${username}`);
  const snapshot = await get(userRef);
  return snapshot.exists() ? snapshot.val() : null;
};

// Thin-Client Transactions
export const startWebSession = async (username: string, taskTitle: string, tag: string, isStopwatchMode?: boolean, durationMinutes?: number) => {
  if (!username) return;
  const timerRef = ref(database, `users/${username}/active_timer`);
  await runTransaction(timerRef, (currentData) => {
    const now = Date.now();
    const prevAccumulated = currentData && currentData.accumulatedFocusMs ? currentData.accumulatedFocusMs : 0;
    return {
      status: "FOCUSING",
      mode: isStopwatchMode ? "STOPWATCH" : "POMODORO",
      isStopwatchMode: !!isStopwatchMode,
      startTimeMs: now,
      accumulatedFocusMs: prevAccumulated,
      taskTitle: taskTitle || "General Focus",
      tag: tag || "Study",
      targetEndTimeMs: (!isStopwatchMode && durationMinutes) ? (now + durationMinutes * 60 * 1000) : 0,
      lastUpdatedTimestamp: now
    };
  });
};

export const startWebBreak = async (username: string, durationMinutes: number) => {
  if (!username) return;
  const timerRef = ref(database, `users/${username}/active_timer`);
  await runTransaction(timerRef, (currentData) => {
    const now = Date.now();
    return {
      status: "BREAK",
      mode: "POMODORO",
      isStopwatchMode: false,
      startTimeMs: now,
      accumulatedFocusMs: currentData?.accumulatedFocusMs || 0,
      accumulatedBreakMs: 0,
      taskTitle: "Taking a Break",
      tag: "Break",
      targetEndTimeMs: now + (durationMinutes * 60 * 1000),
      lastUpdatedTimestamp: now
    };
  });
};

export const updateTimerTaskAndTag = async (username: string, taskTitle: string, tag: string) => {
  if (!username) return;
  const timerRef = ref(database, `users/${username}/active_timer`);
  await update(timerRef, {
    taskTitle: taskTitle || "General Focus",
    tag: tag || "Study"
  });
};

export const pauseWebSession = async (username: string) => {
  if (!username) return;
  const timerRef = ref(database, `users/${username}/active_timer`);
  await runTransaction(timerRef, (currentData) => {
    if (!currentData) {
      return {
        status: "BREAK",
        mode: "POMODORO",
        isStopwatchMode: false,
        startTimeMs: 0,
        accumulatedFocusMs: 0,
        taskTitle: "",
        tag: "",
        lastUpdatedTimestamp: Date.now()
      };
    }
    const now = Date.now();
    let additional = 0;
    if (currentData.status === "FOCUSING" && currentData.startTimeMs) {
      additional = now - currentData.startTimeMs;
    }
    return {
      ...currentData,
      status: "BREAK",
      startTimeMs: 0,
      accumulatedFocusMs: (currentData.accumulatedFocusMs || 0) + additional,
      lastUpdatedTimestamp: now
    };
  });
};

export const endWebSession = async (username: string) => {
  if (!username) return { status: "RELAXING" };
  const timerRef = ref(database, `users/${username}/active_timer`);
  await runTransaction(timerRef, (currentData) => {
    const now = Date.now();
    const tzOffset = -new Date().getTimezoneOffset();
    
    let focusMs = 0;
    let breakMs = 0;
    
    if (currentData) {
      focusMs = currentData.accumulatedFocusMs || 0;
      if (currentData.status === "FOCUSING" && currentData.startTimeMs) {
        focusMs += (now - currentData.startTimeMs);
      }
      
      breakMs = currentData.accumulatedBreakMs || 0;
      if (currentData.status === "BREAK" && currentData.startTimeMs) {
        breakMs += (now - currentData.startTimeMs);
      }
    }
    
    return {
      status: "RELAXING",
      mode: currentData?.mode || "POMODORO",
      isStopwatchMode: !!currentData?.isStopwatchMode,
      startTimeMs: 0,
      accumulatedFocusMs: focusMs,
      accumulatedBreakMs: breakMs,
      timezoneOffsetMinutes: tzOffset,
      taskTitle: currentData?.taskTitle || "General Focus",
      tag: currentData?.tag || "Study",
      lastUpdatedTimestamp: now
    };
  });
  return { status: "RELAXING" };
};

// Ring focus bell / reminder for a friend
export const ringFriendBell = async (targetUsername: string, senderName: string, senderUsername: string) => {
  if (!targetUsername) return;
  const bellRef = ref(database, `bells/${targetUsername}`);
  await set(bellRef, {
    senderUsername,
    senderDisplayName: senderName,
    timestamp: Date.now(),
    isProcessed: false
  });
};

// Clear active bell
export const clearMyBell = async (myUsername: string) => {
  if (!myUsername) return;
  const bellRef = ref(database, `bells/${myUsername}`);
  await set(bellRef, null);
};

// Listen to all users' real-time statuses
export const listenToAllUsers = (onUpdate: (usersMap: Record<string, any>) => void): (() => void) => {
  const usersRef = ref(database, "users");
  const callback = (snapshot: DataSnapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.val());
    } else {
      onUpdate({});
    }
  };
  onValue(usersRef, callback);
  
  friendsListenerUnsubscribe = () => {
    off(usersRef, "value", callback);
  };
  return friendsListenerUnsubscribe;
};

// Listen to my reminder bell in real-time
export const listenToMyBell = (myUsername: string, onUpdate: (bellSignal: any) => void): (() => void) => {
  if (!myUsername) return () => {};
  const bellRef = ref(database, `bells/${myUsername}`);
  const callback = (snapshot: DataSnapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.val());
    } else {
      onUpdate(null);
    }
  };
  onValue(bellRef, callback);
  
  bellListenerUnsubscribe = () => {
    off(bellRef, "value", callback);
  };
  return bellListenerUnsubscribe;
};

// Listen to my focus records in real-time from the canonical history_logs path
export const listenToMyFocusRecords = (
  username: string, 
  onUpdate: (records: FocusRecord[]) => void
): (() => void) => {
  if (!username) return () => {};

  const pathRef = ref(database, `users/${username}/history_logs`);
  const callback = (snapshot: DataSnapshot) => {
    let mappedList: FocusRecord[] = [];
    if (snapshot.exists()) {
      try {
        const data = snapshot.val();
        let list: any[] = [];
        if (Array.isArray(data)) {
          list = data.filter(Boolean);
        } else if (typeof data === "object") {
          list = Object.keys(data).map(key => {
            if (typeof data[key] === "object" && data[key] !== null) {
              return { id: key, ...data[key] };
            }
            return null;
          }).filter(Boolean);
        }

        mappedList = list.map((rec: any) => {
          const ts = Number(rec.timestamp || rec.endTime || rec.startTime || Date.now());
          
          let startStr = "00:00";
          if (rec.startTime) {
            if (typeof rec.startTime === "number") {
              startStr = new Date(rec.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
            } else {
              startStr = String(rec.startTime);
            }
          }

          let endStr = "00:00";
          if (rec.endTime) {
            if (typeof rec.endTime === "number") {
              endStr = new Date(rec.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
            } else {
              endStr = String(rec.endTime);
            }
          }

          const computedSecs = Number(
            rec.durationSeconds || 
            (rec.totalFocusTimeMs ? Math.round(rec.totalFocusTimeMs / 1000) : 0) || 
            (rec.durationMinutes ? rec.durationMinutes * 60 : 0) || 
            0
          );

          const computedMins = Number(
            rec.durationMinutes || 
            (rec.totalFocusTimeMs ? Math.round(rec.totalFocusTimeMs / 60000) : 0) || 
            (rec.durationSeconds ? Math.round(rec.durationSeconds / 60) : 0) || 
            0
          );

          return {
            id: rec.id || String(ts || Math.random()),
            taskTitle: rec.taskTitle || rec.title || rec.taskName || "Focus Session",
            tag: rec.tag || rec.category || "Study",
            notes: rec.notes || rec.description || "",
            durationSeconds: computedSecs,
            durationMinutes: computedMins,
            dateString: rec.dateString || new Date(ts).toISOString().split("T")[0],
            startTime: startStr,
            endTime: endStr,
            timestamp: ts,
            isManual: !!(rec.isManual || rec.manual)
          };
        });
      } catch (err) {
        console.error("Error parsing focus records from history_logs:", err);
      }
    }
    const mergedList = mappedList.sort((a, b) => b.timestamp - a.timestamp);
    onUpdate(mergedList);
  };

  onValue(pathRef, callback);
  return () => off(pathRef, "value", callback);
};

// Add a focus record directly to history_logs
export const addFocusRecordToDb = async (username: string, record: FocusRecord) => {
  if (!username) return;
  const path = `users/${username}/history_logs/${record.id}`;
  const tzOffset = -new Date().getTimezoneOffset();
  const dbRecord = {
    taskTitle: record.taskTitle || "General Focus",
    tag: record.tag || "Study",
    notes: record.notes || "",
    durationSeconds: Number(record.durationSeconds) || 0,
    durationMinutes: Number(record.durationMinutes) || 0,
    dateString: record.dateString || new Date(record.timestamp).toISOString().split("T")[0],
    startTime: record.startTime || "00:00",
    endTime: record.endTime || "00:00",
    timestamp: Number(record.timestamp) || Date.now(),
    totalFocusTimeMs: (Number(record.durationSeconds) || 0) * 1000,
    totalBreakTimeMs: 0,
    timezoneOffsetMinutes: tzOffset
  };
  await set(ref(database, path), dbRecord).catch(err => {
    console.error("Error writing focus record to history_logs:", err);
  });
};

// Remove a focus record from history_logs
export const removeFocusRecordFromDb = async (username: string, recordId: string) => {
  if (!username) return;
  const path = `users/${username}/history_logs/${recordId}`;
  await set(ref(database, path), null).catch(err => {
    console.error("Error deleting focus record:", err);
  });
};

/**
 * Submits a manual focus entry request to the user's thin-client queue.
 * Strictly uses Firebase push() to add an object:
 * { focusMinutes, reason, timestamp: serverTimestamp(), timezoneOffsetMinutes }
 * to /users/{username}/manual_entry_requests
 */
export const submitManualEntry = async (
  username: string,
  focusMinutes: number,
  reason: string
): Promise<void> => {
  if (!username) {
    throw new Error("Username is required to submit manual entry.");
  }
  const queueRef = ref(database, `users/${username}/manual_entry_requests`);
  const newEntryRef = push(queueRef);
  await set(newEntryRef, {
    focusMinutes,
    reason,
    timestamp: serverTimestamp(),
    timezoneOffsetMinutes: -new Date().getTimezoneOffset()
  });
};

// -----------------------------------------------------------------------------
// FIREBASE CLOUD MESSAGING (FCM) SERVICES
// -----------------------------------------------------------------------------

export let messaging: any = null;
let fcmSupported = false;

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    fcmSupported = supported;
    if (supported) {
      try {
        messaging = getMessaging(app);
        console.log("[FCM] Firebase Cloud Messaging initialized successfully.");
      } catch (err) {
        console.warn("[FCM] Failed to initialize Messaging instance:", err);
      }
    } else {
      console.log("[FCM] Messaging is not supported in this browser context.");
    }
  }).catch((err) => {
    console.warn("[FCM] Support check error:", err);
  });
}

/**
 * Checks if FCM is supported in the current environment
 */
export const checkFCMSupport = async (): Promise<boolean> => {
  if (typeof window === "undefined") return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
};

/**
 * Request notification permission from the user
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    throw new Error("Notifications are not supported in this environment.");
  }
  return await Notification.requestPermission();
};

/**
 * Registers callback for receiving the Firebase Installation ID (FID)
 */
export const onFCMRegistered = (callback: (installationId: string) => void) => {
  if (!messaging) return () => {};
  try {
    return onRegistered(messaging, callback);
  } catch (err) {
    console.error("[FCM] Error setting onRegistered listener:", err);
    return () => {};
  }
};

/**
 * Registers the service worker & subscribes to push notifications
 */
export const registerFCMServiceWorker = async (vapidKey: string): Promise<void> => {
  if (!messaging) {
    throw new Error("FCM is not initialized or not supported on this browser.");
  }
  
  console.log("[FCM] Registering service worker with VAPID key:", vapidKey);
  await register(messaging, { vapidKey });
};

/**
 * Retrieves the standard registration token (traditional style)
 */
export const getFCMToken = async (vapidKey: string): Promise<string | null> => {
  if (!messaging) return null;
  try {
    return await getToken(messaging, { vapidKey });
  } catch (err) {
    console.error("[FCM] Error getting registration token:", err);
    throw err;
  }
};

/**
 * Registers callback for foreground messages
 */
export const onFCMForegroundMessage = (callback: (payload: any) => void) => {
  if (!messaging) return () => {};
  try {
    return onMessage(messaging, callback);
  } catch (err) {
    console.error("[FCM] Error setting onMessage listener:", err);
    return () => {};
  }
};



