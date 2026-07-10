import React, { useState, useEffect } from "react";
import { Task } from "../types.ts";
import { Plus, Trash2, CheckCircle2, Circle, Clock, Tag, ArrowUp, ArrowDown, ChevronRight, ChevronDown, ListPlus, Search, Calendar, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "firebase/auth";

interface TaskViewProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  currentUser: User | null;
  accessToken: string | null;
  onLogin: () => void;
}

export default function TaskView({ tasks, onTasksChange, currentUser, accessToken, onLogin }: TaskViewProps) {
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTaskForSubtask, setSelectedTaskForSubtask] = useState<number | null>(null);
  
  // Google Integration states
  const [isSyncingTasks, setIsSyncingTasks] = useState(false);
  const [isFetchingCalendar, setIsFetchingCalendar] = useState(false);
  const [googleTasksStatus, setGoogleTasksStatus] = useState<string | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [showCalendar, setShowCalendar] = useState(true);
  const [postToGoogleTasks, setPostToGoogleTasks] = useState(false);
  const [addToCalendar, setAddToCalendar] = useState(false);

  // Form State for new tasks
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [listCategory, setListCategory] = useState("Work");
  const [dueDateString, setDueDateString] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Subtask Form State
  const [subtaskTitle, setSubtaskTitle] = useState("");

  const categories = ["All", "Work", "Inbox", "Finances", "Health", "Personal"];

  // Google Tasks sync action
  const handleSyncGoogleTasks = async () => {
    if (!accessToken) {
      onLogin();
      return;
    }

    setIsSyncingTasks(true);
    setGoogleTasksStatus("Fetching Google Tasks lists...");
    try {
      if (accessToken === "mock-bypass-access-token") {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setGoogleTasksStatus("Fetching tasks from 'My Tasks' (Demo Mode)...");
        await new Promise(resolve => setTimeout(resolve, 800));

        const mockGTasks = [
          { title: "Review quarterly savings plan", notes: "Analyze subscriptions and investments (Demo Task)", due: new Date().toISOString().split("T")[0] },
          { title: "Plan weekly meal prep", notes: "High protein recipes and grocery checklist (Demo Task)", due: new Date(Date.now() + 86400000).toISOString().split("T")[0] },
          { title: "Book dental appointment", notes: "Call local clinic (Demo Task)", due: "" }
        ];

        let importedCount = 0;
        const updatedTasks = [...tasks];

        mockGTasks.forEach((gt) => {
          const alreadyExists = tasks.some(t => t.title.toLowerCase() === gt.title.toLowerCase());
          if (!alreadyExists) {
            const newTask: Task = {
              id: updatedTasks.length ? Math.max(...updatedTasks.map(t => t.id)) + 1 : 1,
              title: gt.title,
              description: gt.notes,
              estimatedMinutes: 30,
              actualMinutes: 0,
              isCompleted: false,
              parentTaskId: null,
              listCategory: "Inbox",
              timeBlockTimestamp: null,
              nagModeEnabled: false,
              nagIntervalMinutes: 5,
              priority: "MEDIUM",
              dueDateString: gt.due || new Date().toISOString().split("T")[0],
              orderIndex: updatedTasks.length
            };
            updatedTasks.push(newTask);
            importedCount++;
          }
        });

        if (importedCount > 0) {
          onTasksChange(updatedTasks);
          setGoogleTasksStatus(`Successfully synced! Imported ${importedCount} tasks from Google Tasks Demo.`);
        } else {
          setGoogleTasksStatus("All Google Tasks are already synced!");
        }
        setTimeout(() => setGoogleTasksStatus(null), 4000);
        return;
      }

      const listsRes = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!listsRes.ok) throw new Error("Failed to fetch Google Tasks lists");
      const listsData = await listsRes.json();
      const primaryList = listsData.items?.[0];
      if (!primaryList) {
        setGoogleTasksStatus("No task lists found.");
        setTimeout(() => setGoogleTasksStatus(null), 3000);
        return;
      }

      setGoogleTasksStatus(`Fetching tasks from "${primaryList.title}"...`);
      const tasksRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${primaryList.id}/tasks?showCompleted=true`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!tasksRes.ok) throw new Error("Failed to fetch tasks");
      const tasksData = await tasksRes.json();
      const gTasks = tasksData.items || [];

      let importedCount = 0;
      const updatedTasks = [...tasks];

      gTasks.forEach((gt: any) => {
        const alreadyExists = tasks.some(t => t.title.toLowerCase() === gt.title.toLowerCase());
        if (!alreadyExists && gt.title) {
          const newTask: Task = {
            id: updatedTasks.length ? Math.max(...updatedTasks.map(t => t.id)) + 1 : 1,
            title: gt.title,
            description: gt.notes || "Imported from Google Tasks",
            estimatedMinutes: 30,
            actualMinutes: 0,
            isCompleted: gt.status === "completed",
            parentTaskId: null,
            listCategory: "Inbox",
            timeBlockTimestamp: null,
            nagModeEnabled: false,
            nagIntervalMinutes: 5,
            priority: "MEDIUM",
            dueDateString: gt.due ? gt.due.split("T")[0] : new Date().toISOString().split("T")[0],
            orderIndex: updatedTasks.length
          };
          updatedTasks.push(newTask);
          importedCount++;
        }
      });

      if (importedCount > 0) {
        onTasksChange(updatedTasks);
        setGoogleTasksStatus(`Successfully synced! Imported ${importedCount} tasks.`);
      } else {
        setGoogleTasksStatus("All Google Tasks are already synced!");
      }
      setTimeout(() => setGoogleTasksStatus(null), 4000);
    } catch (err: any) {
      console.error(err);
      setGoogleTasksStatus("Failed to sync Google Tasks.");
      setTimeout(() => setGoogleTasksStatus(null), 4000);
    } finally {
      setIsSyncingTasks(false);
    }
  };

  // Google Calendar events fetch action
  const fetchGoogleCalendarEvents = async () => {
    if (!accessToken) return;
    setIsFetchingCalendar(true);
    try {
      if (accessToken === "mock-bypass-access-token") {
        await new Promise(resolve => setTimeout(resolve, 800));
        const mockEvents = [
          { id: "cal-1", summary: "🎯 Study Operating Systems", start: { dateTime: new Date(Date.now() + 7200000).toISOString() }, description: "Review CPU scheduling and deadlock handling" },
          { id: "cal-2", summary: "🚴 Evening Workout Session", start: { dateTime: new Date(Date.now() + 21600000).toISOString() }, description: "Cardio and upper body exercises" },
          { id: "cal-3", summary: "☕ Catch up with Friends", start: { dateTime: new Date(Date.now() + 86400000).toISOString() }, description: "Sync up on side projects over coffee" },
          { id: "cal-4", summary: "💼 Weekly Team Sync", start: { dateTime: new Date(Date.now() + 172800000).toISOString() }, description: "Review Life OS sprint and sprint retrospectives" }
        ];
        setCalendarEvents(mockEvents);
        return;
      }

      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      if (!res.ok) throw new Error("Failed to fetch calendar events");
      const data = await res.json();
      setCalendarEvents(data.items || []);
    } catch (e) {
      console.error("Google Calendar fetch error:", e);
    } finally {
      setIsFetchingCalendar(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchGoogleCalendarEvents();
    }
  }, [accessToken]);

  // Handle task submission
  const handleAddTask = (e: React.FormEvent, parentId: number | null = null) => {
    e.preventDefault();
    if (!title.trim() && !parentId) return;

    const newTask: Task = {
      id: tasks.length ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
      title: parentId ? subtaskTitle : title,
      description: parentId ? "" : description,
      estimatedMinutes: parentId ? 15 : estimatedMinutes,
      actualMinutes: 0,
      isCompleted: false,
      parentTaskId: parentId,
      listCategory: parentId ? (tasks.find(t => t.id === parentId)?.listCategory || "Inbox") : listCategory,
      timeBlockTimestamp: null,
      nagModeEnabled: false,
      nagIntervalMinutes: 5,
      priority: parentId ? "LOW" : priority,
      dueDateString: parentId ? "" : dueDateString || new Date().toISOString().split("T")[0],
      orderIndex: tasks.length
    };

    onTasksChange([...tasks, newTask]);

    if (!parentId && accessToken) {
      if (accessToken === "mock-bypass-access-token") {
        if (postToGoogleTasks) {
          setGoogleTasksStatus("Task published to Google Tasks Demo upstream!");
          setTimeout(() => setGoogleTasksStatus(null), 3000);
        }
        if (addToCalendar) {
          const dateVal = dueDateString || new Date().toISOString().split("T")[0];
          const mockNewEvent = {
            id: `cal-${Date.now()}`,
            summary: title,
            description: description || "Created via Life OS Task Engine (Demo Mode)",
            start: { dateTime: `${dateVal}T09:00:00Z` },
            end: { dateTime: `${dateVal}T10:00:00Z` }
          };
          setCalendarEvents(prev => [mockNewEvent, ...prev]);
        }
      } else {
        if (postToGoogleTasks) {
          fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
            headers: { Authorization: `Bearer ${accessToken}` }
          })
          .then(r => r.json())
          .then(listsData => {
            const primaryList = listsData.items?.[0];
            if (primaryList) {
              fetch(`https://tasks.googleapis.com/tasks/v1/lists/${primaryList.id}/tasks`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                  title: title,
                  notes: description || "Created via Life OS",
                  due: dueDateString ? `${dueDateString}T00:00:00.000Z` : undefined
                })
              }).catch(err => console.error("Error posting to Google Tasks:", err));
            }
          });
        }

        if (addToCalendar) {
          const dateVal = dueDateString || new Date().toISOString().split("T")[0];
          fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              summary: title,
              description: description || "Created via Life OS Task Engine",
              start: { date: dateVal },
              end: { date: dateVal }
            })
          })
          .then(() => fetchGoogleCalendarEvents())
          .catch(err => console.error("Error creating Google Calendar event:", err));
        }
      }
    }

    if (parentId) {
      setSubtaskTitle("");
      setSelectedTaskForSubtask(null);
    } else {
      setTitle("");
      setDescription("");
      setDueDateString("");
      setEstimatedMinutes(30);
      setPostToGoogleTasks(false);
      setAddToCalendar(false);
      setIsAdding(false);
    }
  };

  // Toggle Complete status
  const handleToggleComplete = (id: number) => {
    const updated = tasks.map(t => {
      if (t.id === id) {
        const nextState = !t.isCompleted;
        // Also toggle subtasks automatically
        return { ...t, isCompleted: nextState };
      }
      return t;
    });

    // If a parent task is toggled, also toggle all its children
    const parentTask = tasks.find(t => t.id === id);
    if (parentTask) {
      const nextState = !parentTask.isCompleted;
      const finalTasks = updated.map(t => {
        if (t.parentTaskId === id) {
          return { ...t, isCompleted: nextState };
        }
        return t;
      });
      onTasksChange(finalTasks);
    } else {
      onTasksChange(updated);
    }
  };

  // Delete task and its children
  const handleDeleteTask = (id: number) => {
    const updated = tasks.filter(t => t.id !== id && t.parentTaskId !== id);
    onTasksChange(updated);
  };

  // Build task tree mapping
  const rootTasks = tasks.filter(t => t.parentTaskId === null);
  const getSubtasks = (parentId: number) => tasks.filter(t => t.parentTaskId === parentId);

  // Filter and search
  const filteredRootTasks = rootTasks.filter(task => {
    const matchesCategory = filterCategory === "All" || task.listCategory === filterCategory;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          task.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "HIGH": return "bg-red-500/10 text-red-400 border border-red-500/20";
      case "MEDIUM": return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
      default: return "bg-green-500/10 text-green-400 border border-green-500/20";
    }
  };

  return (
    <div className="space-y-6" id="tasks-container">
      {/* Search and Category Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-gray-900/40 p-4 rounded-xl border border-gray-800">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search tasks, descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 text-gray-100 placeholder-gray-500"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                filterCategory === cat
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-gray-950 text-gray-400 hover:text-white border border-gray-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer shadow-lg shadow-blue-500/10"
        >
          <Plus className="h-4 w-4" /> Add Task
        </button>
      </div>

      {/* Adding Task Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={(e) => handleAddTask(e)}
            className="overflow-hidden bg-gray-900/50 p-5 rounded-xl border border-gray-800 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Read Operating Systems Chapter 4"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-gray-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</label>
                <select
                  value={listCategory}
                  onChange={(e) => setListCategory(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-gray-100"
                >
                  <option value="Work">Work</option>
                  <option value="Inbox">Inbox</option>
                  <option value="Finances">Finances</option>
                  <option value="Health">Health</option>
                  <option value="Personal">Personal</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</label>
              <textarea
                placeholder="Details or resources..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-gray-100"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Priority</label>
                <div className="flex gap-2">
                  {(["HIGH", "MEDIUM", "LOW"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        priority === p
                          ? p === "HIGH" ? "bg-red-500/20 text-red-400 border-red-500"
                            : p === "MEDIUM" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500"
                            : "bg-green-500/20 text-green-400 border-green-500"
                          : "bg-gray-950 text-gray-500 border-gray-800 hover:text-gray-300"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Estimated Minutes</label>
                <div className="relative">
                  <input
                    type="number"
                    min="5"
                    max="480"
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:border-blue-500 text-gray-100"
                  />
                  <Clock className="absolute right-3 top-2.5 h-4 w-4 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Due Date</label>
                <input
                  type="date"
                  value={dueDateString}
                  onChange={(e) => setDueDateString(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-gray-100"
                />
              </div>
            </div>

            {accessToken && (
              <div className="flex flex-wrap gap-4 pt-3 pb-1 text-xs border-t border-gray-850/60">
                <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={postToGoogleTasks}
                    onChange={(e) => setPostToGoogleTasks(e.target.checked)}
                    className="rounded bg-gray-950 border-gray-800 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>Publish to Google Tasks</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={addToCalendar}
                    onChange={(e) => setAddToCalendar(e.target.checked)}
                    className="rounded bg-gray-950 border-gray-800 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>Create Google Calendar Event</span>
                </label>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer"
              >
                Save Task
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Responsive Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main Task List */}
        <div className="lg:col-span-2 space-y-3">
          {filteredRootTasks.length === 0 ? (
            <div className="text-center py-12 bg-gray-900/20 rounded-xl border border-gray-800/80">
              <CheckCircle2 className="h-10 w-10 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-medium">All tasks completed! Or none match the search filter.</p>
            </div>
          ) : (
            filteredRootTasks.map((task) => {
              const subtasks = getSubtasks(task.id);
              const completedSubtasks = subtasks.filter(s => s.isCompleted).length;
              const hasSubtasks = subtasks.length > 0;

              return (
                <div
                  key={task.id}
                  className={`bg-gray-900/30 border rounded-xl overflow-hidden transition-all ${
                    task.isCompleted ? "border-gray-800/40 opacity-70" : "border-gray-800 hover:border-gray-700"
                  }`}
                >
                  {/* Main Task Row */}
                  <div className="p-4 flex items-start gap-4">
                    <button
                      onClick={() => handleToggleComplete(task.id)}
                      className="mt-0.5 text-gray-500 hover:text-blue-500 transition-colors cursor-pointer"
                    >
                      {task.isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-blue-500 fill-blue-500/10" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-600" />
                      )}
                    </button>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-semibold text-sm tracking-tight text-gray-100 ${task.isCompleted ? "line-through text-gray-500" : ""}`}>
                          {task.title}
                        </h3>
                        
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        
                        <span className="flex items-center gap-1 text-[10px] text-gray-500 font-mono bg-gray-950 px-1.5 py-0.5 rounded border border-gray-800">
                          <Tag className="h-2.5 w-2.5" /> {task.listCategory}
                        </span>

                        {task.dueDateString && (
                          <span className="text-[10px] text-gray-400 bg-blue-500/10 text-blue-400/90 border border-blue-500/15 px-1.5 py-0.5 rounded">
                            Due: {task.dueDateString}
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-gray-400 font-normal leading-relaxed">{task.description}</p>
                      )}

                      {/* Completion Statistics and Nested items indicator */}
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {task.estimatedMinutes}m
                        </span>

                        {hasSubtasks && (
                          <span className="bg-gray-950 px-2 py-0.5 rounded border border-gray-800 text-[10px] text-gray-400">
                            {completedSubtasks}/{subtasks.length} Subtasks
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedTaskForSubtask(selectedTaskForSubtask === task.id ? null : task.id)}
                        title="Add nested subtask"
                        className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-blue-400 rounded-lg transition-all cursor-pointer"
                      >
                        <ListPlus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        title="Delete task"
                        className="p-1.5 hover:bg-red-950/30 text-gray-400 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Subtask adding box */}
                  {selectedTaskForSubtask === task.id && (
                    <div className="px-4 pb-3 pt-1 border-t border-gray-800/50 bg-gray-950/20">
                      <form
                        onSubmit={(e) => handleAddTask(e, task.id)}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          required
                          placeholder="Add nested subtask details..."
                          value={subtaskTitle}
                          onChange={(e) => setSubtaskTitle(e.target.value)}
                          className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="submit"
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedTaskForSubtask(null)}
                          className="text-gray-400 hover:text-gray-200 text-xs px-2"
                        >
                          Cancel
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Nested Subtasks Render */}
                  {hasSubtasks && (
                    <div className="bg-gray-950/30 border-t border-gray-800/40 divide-y divide-gray-800/20 pl-8 pr-4">
                      {subtasks.map((sub) => (
                        <div key={sub.id} className="py-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={() => handleToggleComplete(sub.id)}
                              className="text-gray-500 hover:text-blue-500 transition-colors cursor-pointer"
                            >
                              {sub.isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-blue-500 fill-blue-500/10" />
                              ) : (
                                <Circle className="h-4 w-4 text-gray-600" />
                              )}
                            </button>
                            <span className={`text-xs ${sub.isCompleted ? "line-through text-gray-500" : "text-gray-300"}`}>
                              {sub.title}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteTask(sub.id)}
                            className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-red-950/10 transition-all cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right: Google Workspace Widgets Sidebar */}
        <div className="space-y-4">
          {/* Google Tasks Panel */}
          <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Google Tasks</h3>
              <button 
                onClick={handleSyncGoogleTasks}
                disabled={isSyncingTasks}
                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-2.5 w-2.5 ${isSyncingTasks ? "animate-spin" : ""}`} /> Sync
              </button>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Pull your remote tasks into your local Life OS client or post local items upstream automatically.
            </p>
            {googleTasksStatus && (
              <p className="text-[9px] text-blue-300 font-semibold animate-pulse">{googleTasksStatus}</p>
            )}
          </div>

          {/* Google Calendar Agenda Panel */}
          <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-400" /> Google Calendar
              </h3>
              <button
                onClick={fetchGoogleCalendarEvents}
                disabled={isFetchingCalendar}
                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-2.5 w-2.5 ${isFetchingCalendar ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>

            {accessToken ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {calendarEvents.length === 0 ? (
                  <p className="text-[10px] text-gray-500 py-3 text-center">No upcoming events this week.</p>
                ) : (
                  calendarEvents.map((evt) => {
                    const dateStr = evt.start?.dateTime ? new Date(evt.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "All Day";
                    const dayStr = evt.start?.dateTime || evt.start?.date ? new Date(evt.start.dateTime || evt.start.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : "";

                    return (
                      <div key={evt.id} className="p-2 rounded bg-gray-950/40 border border-gray-850/50 hover:border-gray-800 transition-all text-left">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] font-bold text-gray-200 truncate">{evt.summary}</span>
                          <span className="text-[8px] font-mono text-blue-400 shrink-0 font-bold bg-blue-500/5 px-1 py-0.2 rounded border border-blue-500/10">{dayStr}</span>
                        </div>
                        <div className="text-[9px] text-gray-500 font-medium mt-0.5">{dateStr}</div>
                        {evt.description && <p className="text-[9px] text-gray-400 mt-1 line-clamp-2 italic">{evt.description}</p>}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-2 text-center py-2">
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  Connect your Google Account in the settings panel to display your schedule.
                </p>
                <button
                  onClick={onLogin}
                  className="inline-block bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded cursor-pointer transition-all"
                >
                  Connect Calendar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
