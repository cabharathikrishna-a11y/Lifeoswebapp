import { 
  Task, Habit, HabitCompletion, JournalEntry, LedgerEntry, 
  Deadline, FinancialGoal, Contact, AppFile, FocusRecord, KeepNote, CustomList 
} from "../types.ts";

// Seed Initial Data
const INITIAL_TASKS: Task[] = [
  {
    id: 1,
    title: "Launch Life OS Web App",
    description: "Successfully compile and deploy the complete full-stack React port of Life OS.",
    estimatedMinutes: 60,
    actualMinutes: 45,
    isCompleted: true,
    parentTaskId: null,
    listCategory: "Work",
    timeBlockTimestamp: Date.now(),
    nagModeEnabled: false,
    nagIntervalMinutes: 5,
    priority: "HIGH",
    dueDateString: new Date().toISOString().split("T")[0],
    orderIndex: 0
  },
  {
    id: 2,
    title: "Review daily habits tracker",
    description: "Check off morning routine and exercise habits.",
    estimatedMinutes: 10,
    actualMinutes: 0,
    isCompleted: false,
    parentTaskId: null,
    listCategory: "Inbox",
    timeBlockTimestamp: null,
    nagModeEnabled: true,
    nagIntervalMinutes: 15,
    priority: "MEDIUM",
    dueDateString: new Date().toISOString().split("T")[0],
    orderIndex: 1
  },
  {
    id: 3,
    title: "Verify finance ledgers",
    description: "Log expenses for server hosting and internet bills.",
    estimatedMinutes: 15,
    actualMinutes: 0,
    isCompleted: false,
    parentTaskId: null,
    listCategory: "Finances",
    timeBlockTimestamp: null,
    nagModeEnabled: false,
    nagIntervalMinutes: 5,
    priority: "LOW",
    dueDateString: new Date().toISOString().split("T")[0],
    orderIndex: 2
  }
];

const INITIAL_HABITS: Habit[] = [
  {
    id: 1,
    name: "Morning Diaphragmatic Breathing",
    streakCount: 5,
    lastCompletedTimestamp: Date.now() - 86400000,
    listCategory: "Health & Vigor",
    timeOfDay: "Morning",
    targetCount: 1,
    frequency: "DAILY",
    weeklyDay: 2,
    monthlyStartDate: 1,
    monthlyEndDate: 30,
    orderIndex: 0,
    scheduledTime: "07:30",
    isReminderEnabled: true
  },
  {
    id: 2,
    name: "Read Technical Articles",
    streakCount: 3,
    lastCompletedTimestamp: Date.now() - 86400000,
    listCategory: "Self Education",
    timeOfDay: "Evening",
    targetCount: 1,
    frequency: "DAILY",
    weeklyDay: 2,
    monthlyStartDate: 1,
    monthlyEndDate: 30,
    orderIndex: 1,
    scheduledTime: "20:00",
    isReminderEnabled: false
  },
  {
    id: 3,
    name: "Weekly Financial Review",
    streakCount: 1,
    lastCompletedTimestamp: null,
    listCategory: "Finances",
    timeOfDay: "Morning",
    targetCount: 1,
    frequency: "WEEKLY",
    weeklyDay: 7, // Sunday
    monthlyStartDate: 1,
    monthlyEndDate: 30,
    orderIndex: 2,
    scheduledTime: "09:00",
    isReminderEnabled: true
  }
];

const INITIAL_LEDGER: LedgerEntry[] = [
  {
    id: 1,
    type: "INCOME",
    amount: 1500,
    categoryTag: "Consulting",
    note: "Freelance web development milestone",
    timestamp: Date.now() - 172800000
  },
  {
    id: 2,
    type: "EXPENSE",
    amount: 120,
    categoryTag: "Server Hosting",
    note: "Production Cloud Run instance renewal",
    timestamp: Date.now() - 86400000
  },
  {
    id: 3,
    type: "EXPENSE",
    amount: 15.5,
    categoryTag: "Coffee",
    note: "Focus session beverage",
    timestamp: Date.now()
  }
];

const INITIAL_FINANCIAL_GOALS: FinancialGoal[] = [
  {
    id: 1,
    name: "Emergency Fund",
    targetAmount: 5000,
    type: "SAVINGS",
    categoryTag: "General"
  },
  {
    id: 2,
    name: "Server Budget",
    targetAmount: 500,
    type: "BUDGET",
    categoryTag: "Server Hosting"
  }
];

const INITIAL_JOURNAL: JournalEntry[] = [
  {
    id: 1,
    title: "Completed EFSDF Rewrite",
    text: "Today I completed the major task of rewriting the EFSDF Android codebase into a fully integrated React web application. The design uses gorgeous Tailwind variables, rich charts, nested task lists, and full local persistence with optional cloud-backup proxies.",
    dateString: new Date().toISOString().split("T")[0],
    timestamp: Date.now(),
    attachmentsJson: "[]"
  }
];

const INITIAL_CONTACTS: Contact[] = [
  {
    id: 1,
    firstName: "Bharathi",
    middleName: "K.",
    lastName: "Krishna",
    jobTitle: "Accessibility Advocate",
    email: "bharathi@example.com",
    address: "Chennai, Tamil Nadu, India",
    phone: "+91 9876543210",
    dobString: "1995-05-12",
    anniversaryString: "",
    folder: "Work",
    attachedFilesJson: "[]"
  },
  {
    id: 2,
    firstName: "Madhavan",
    middleName: "",
    lastName: "S.",
    jobTitle: "Lead DevOps",
    email: "madhavan@example.com",
    address: "Bangalore, Karnataka",
    phone: "+91 9123456789",
    dobString: "1992-09-24",
    anniversaryString: "",
    folder: "Friends",
    attachedFilesJson: "[]"
  }
];

const INITIAL_KEEP_NOTES: KeepNote[] = [
  {
    id: 1,
    title: "💡 Gemini Prompts Ideas",
    content: "1. 'Analyze my financial ledger entries for the last month'\n2. 'Generate image of a futuristic workspace themed in dark deep slate with bright turquoise lights'\n3. 'Help me reorganize my tasks for tomorrow'",
    timestamp: Date.now(),
    isPinned: true,
    colorHex: "#202124"
  },
  {
    id: 2,
    title: "Water Intake Reminders",
    content: "Keep a daily target of 2.5L. Drink 250ml after every pomodoro timer completes.",
    timestamp: Date.now() - 50000000,
    isPinned: false,
    colorHex: "#1e3a8a"
  }
];

const INITIAL_FILES: AppFile[] = [
  {
    id: 1,
    name: "life_os_architecture.pdf",
    path: "/documents",
    size: 245000,
    mimeType: "application/pdf",
    uriString: "local_blob_1",
    timestamp: Date.now() - 340000000
  },
  {
    id: 2,
    name: "profile_setup_avatar.png",
    path: "/images",
    size: 104800,
    mimeType: "image/png",
    uriString: "local_blob_2",
    timestamp: Date.now()
  }
];

const INITIAL_DEADLINES: Deadline[] = [
  {
    id: 1,
    name: "Life OS Project Demo",
    targetTimestamp: Date.now() + 86400000 * 5, // 5 days from now
    isCompleted: false
  }
];

const INITIAL_FOCUS_RECORDS: FocusRecord[] = [];

// Helper to load or initialize key from localstorage
function getLocalStorage<T>(key: string, initial: T): T {
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error(`Error parsing localStorage for key "${key}":`, e);
    }
  }
  return initial;
}

// Global state repository wrapper
export const store = {
  getTasks: (): Task[] => getLocalStorage("life_os_tasks", INITIAL_TASKS),
  saveTasks: (tasks: Task[]) => localStorage.setItem("life_os_tasks", JSON.stringify(tasks)),

  getHabits: (): Habit[] => getLocalStorage("life_os_habits", INITIAL_HABITS),
  saveHabits: (habits: Habit[]) => localStorage.setItem("life_os_habits", JSON.stringify(habits)),

  getHabitCompletions: (): HabitCompletion[] => getLocalStorage("life_os_habit_completions", []),
  saveHabitCompletions: (completions: HabitCompletion[]) => localStorage.setItem("life_os_habit_completions", JSON.stringify(completions)),

  getJournalEntries: (): JournalEntry[] => getLocalStorage("life_os_journal", INITIAL_JOURNAL),
  saveJournalEntries: (journal: JournalEntry[]) => localStorage.setItem("life_os_journal", JSON.stringify(journal)),

  getLedgerEntries: (): LedgerEntry[] => getLocalStorage("life_os_ledger", INITIAL_LEDGER),
  saveLedgerEntries: (ledger: LedgerEntry[]) => localStorage.setItem("life_os_ledger", JSON.stringify(ledger)),

  getDeadlines: (): Deadline[] => getLocalStorage("life_os_deadlines", INITIAL_DEADLINES),
  saveDeadlines: (deadlines: Deadline[]) => localStorage.setItem("life_os_deadlines", JSON.stringify(deadlines)),

  getFinancialGoals: (): FinancialGoal[] => getLocalStorage("life_os_financial_goals", INITIAL_FINANCIAL_GOALS),
  saveFinancialGoals: (goals: FinancialGoal[]) => localStorage.setItem("life_os_financial_goals", JSON.stringify(goals)),

  getContacts: (): Contact[] => getLocalStorage("life_os_contacts", INITIAL_CONTACTS),
  saveContacts: (contacts: Contact[]) => localStorage.setItem("life_os_contacts", JSON.stringify(contacts)),

  getKeepNotes: (): KeepNote[] => getLocalStorage("life_os_keep_notes", INITIAL_KEEP_NOTES),
  saveKeepNotes: (notes: KeepNote[]) => localStorage.setItem("life_os_keep_notes", JSON.stringify(notes)),

  getFiles: (): AppFile[] => getLocalStorage("life_os_files", INITIAL_FILES),
  saveFiles: (files: AppFile[]) => localStorage.setItem("life_os_files", JSON.stringify(files)),

  getFocusRecords: (): FocusRecord[] => getLocalStorage("life_os_focus_records", INITIAL_FOCUS_RECORDS),
  saveFocusRecords: (records: FocusRecord[]) => localStorage.setItem("life_os_focus_records", JSON.stringify(records)),

  // Export full JSON database dump
  exportDb: () => {
    return {
      tasks: store.getTasks(),
      habits: store.getHabits(),
      habitCompletions: store.getHabitCompletions(),
      journal: store.getJournalEntries(),
      ledger: store.getLedgerEntries(),
      deadlines: store.getDeadlines(),
      financialGoals: store.getFinancialGoals(),
      contacts: store.getContacts(),
      keepNotes: store.getKeepNotes(),
      files: store.getFiles(),
      focusRecords: store.getFocusRecords(),
      lastSyncTimestamp: Date.now()
    };
  },

  // Import full JSON database dump
  importDb: (dump: any) => {
    if (!dump) return;
    if (dump.tasks) store.saveTasks(dump.tasks);
    if (dump.habits) store.saveHabits(dump.habits);
    if (dump.habitCompletions) store.saveHabitCompletions(dump.habitCompletions);
    if (dump.journal) store.saveJournalEntries(dump.journal);
    if (dump.ledger) store.saveLedgerEntries(dump.ledger);
    if (dump.deadlines) store.saveDeadlines(dump.deadlines);
    if (dump.financialGoals) store.saveFinancialGoals(dump.financialGoals);
    if (dump.contacts) store.saveContacts(dump.contacts);
    if (dump.keepNotes) store.saveKeepNotes(dump.keepNotes);
    if (dump.files) store.saveFiles(dump.files);
    if (dump.focusRecords) store.saveFocusRecords(dump.focusRecords);
  },

  // Server Integration: Backup
  backupToServer: async () => {
    try {
      const dump = store.exportDb();
      const response = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dump)
      });
      return await response.json();
    } catch (e) {
      console.error("Failed to backup to server:", e);
      throw e;
    }
  },

  // Server Integration: Restore
  restoreFromServer: async () => {
    try {
      const response = await fetch("/api/restore");
      const result = await response.json();
      if (result.success && result.data) {
        store.importDb(result.data);
        return { success: true, message: "Backup successfully restored from server." };
      }
      return { success: false, message: result.message || "No backup file found on server." };
    } catch (e) {
      console.error("Failed to restore from server:", e);
      throw e;
    }
  }
};
