import React, { useState } from "react";
import { Habit, HabitCompletion } from "../types.ts";
import { Calendar, Plus, Trash2, CheckCircle, Circle, Flame, Sparkles, Clock, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HabitsViewProps {
  habits: Habit[];
  onHabitsChange: (habits: Habit[]) => void;
  completions: HabitCompletion[];
  onCompletionsChange: (completions: HabitCompletion[]) => void;
}

export default function HabitsView({ habits, onHabitsChange, completions, onCompletionsChange }: HabitsViewProps) {
  const [filterCategory, setFilterCategory] = useState("All");
  
  // New habit form state
  const [name, setName] = useState("");
  const [listCategory, setListCategory] = useState("Health & Vigor");
  const [timeOfDay, setTimeOfDay] = useState("Morning");
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
  const [scheduledTime, setScheduledTime] = useState("08:00");
  const [isAdding, setIsAdding] = useState(false);

  // Generate date strings for the past 7 days to show in a grid list
  const getPast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString([], { weekday: "short" });
      const dayNum = d.getDate();
      days.push({ dateString: str, label, dayNum });
    }
    return days;
  };

  const past7Days = getPast7Days();

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newHabit: Habit = {
      id: habits.length ? Math.max(...habits.map(h => h.id)) + 1 : 1,
      name,
      streakCount: 0,
      lastCompletedTimestamp: null,
      listCategory,
      timeOfDay,
      targetCount: 1,
      frequency: frequency === "DAILY" ? "DAILY" : frequency === "WEEKLY" ? "WEEKLY" : "MONTHLY",
      weeklyDay: 1,
      monthlyStartDate: 1,
      monthlyEndDate: 30,
      orderIndex: habits.length,
      scheduledTime,
      isReminderEnabled: true
    };

    onHabitsChange([...habits, newHabit]);
    setName("");
    setIsAdding(false);
  };

  const handleDeleteHabit = (id: number) => {
    onHabitsChange(habits.filter(h => h.id !== id));
    onCompletionsChange(completions.filter(c => c.habitId !== id));
  };

  // Toggle habit completion for a specific day
  const handleToggleCompletion = (habitId: number, dateString: string) => {
    const existing = completions.find(c => c.habitId === habitId && c.dateString === dateString);
    let updatedCompletions: HabitCompletion[] = [];
    let streakDiff = 0;

    if (existing) {
      // Uncheck / Remove completion
      updatedCompletions = completions.filter(c => c.id !== existing.id);
      streakDiff = -1;
    } else {
      // Check / Add completion
      const newCompletion: HabitCompletion = {
        id: completions.length ? Math.max(...completions.map(c => c.id)) + 1 : 1,
        habitId,
        dateString
      };
      updatedCompletions = [...completions, newCompletion];
      streakDiff = 1;
    }

    onCompletionsChange(updatedCompletions);

    // Update streak counts and lastCompletedTimestamp in Habit
    const todayStr = new Date().toISOString().split("T")[0];
    const updatedHabits = habits.map(h => {
      if (h.id === habitId) {
        const nextStreak = Math.max(0, h.streakCount + streakDiff);
        const nextTimestamp = dateString === todayStr 
          ? (streakDiff > 0 ? Date.now() : null) 
          : h.lastCompletedTimestamp;

        return {
          ...h,
          streakCount: nextStreak,
          lastCompletedTimestamp: nextTimestamp
        };
      }
      return h;
    });

    onHabitsChange(updatedHabits);
  };

  const categories = ["All", "Health & Vigor", "Self Education", "Finances", "Mindfulness"];
  const filteredHabits = habits.filter(h => filterCategory === "All" || h.listCategory === filterCategory);

  return (
    <div className="space-y-6" id="habits-container">
      {/* Category filters and header actions */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-gray-900/40 p-4 rounded-xl border border-gray-800">
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
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer shadow-lg shadow-blue-500/10"
        >
          <Plus className="h-4 w-4" /> Create Habit
        </button>
      </div>

      {/* Adding Habit Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddHabit}
            className="overflow-hidden bg-gray-900/50 p-5 rounded-xl border border-gray-800 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Habit Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Code for 30 minutes, Drink 2.5L Water"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  <option value="Health & Vigor">Health & Vigor</option>
                  <option value="Self Education">Self Education</option>
                  <option value="Finances">Finances</option>
                  <option value="Mindfulness">Mindfulness</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Time of Day</label>
                <select
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Night</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Scheduled Target Time</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg"
              >
                Add Habit
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Habits matrix sheet */}
      <div className="space-y-4">
        {filteredHabits.length === 0 ? (
          <div className="text-center py-12 bg-gray-900/20 rounded-xl border border-gray-800/80">
            <Calendar className="h-10 w-10 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No habits tracked here yet. Click 'Create Habit' above to start!</p>
          </div>
        ) : (
          filteredHabits.map((habit) => {
            return (
              <div
                key={habit.id}
                className="bg-gray-900/30 border border-gray-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Left side details */}
                <div className="space-y-1.5 md:max-w-xs w-full">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm tracking-tight text-white">{habit.name}</h3>
                    <div className="flex items-center gap-0.5 text-xs text-orange-400 font-mono font-bold bg-orange-500/10 px-1.5 py-0.2 border border-orange-500/15 rounded">
                      <Flame className="h-3.5 w-3.5 fill-orange-400/10" /> {habit.streakCount}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-[9px] text-gray-400 font-bold font-mono uppercase bg-gray-950 px-1.5 py-0.5 rounded border border-gray-850">
                      <Tag className="h-2.5 w-2.5" /> {habit.listCategory}
                    </span>
                    <span className="flex items-center gap-1 text-[9px] text-gray-400 font-bold font-mono uppercase bg-gray-950 px-1.5 py-0.5 rounded border border-gray-850">
                      <Clock className="h-2.5 w-2.5" /> {habit.scheduledTime} &bull; {habit.timeOfDay}
                    </span>
                  </div>
                </div>

                {/* Center Past 7 Days complete list Matrix */}
                <div className="flex items-center justify-between gap-4 bg-gray-950/40 p-3 rounded-xl border border-gray-850 max-w-sm md:max-w-md w-full mx-auto md:mx-0">
                  {past7Days.map((day) => {
                    const isCompleted = completions.some(c => c.habitId === habit.id && c.dateString === day.dateString);
                    const isToday = day.dateString === new Date().toISOString().split("T")[0];

                    return (
                      <div
                        key={day.dateString}
                        className="flex flex-col items-center gap-1.5"
                      >
                        <span className={`text-[9px] font-bold uppercase tracking-wider font-mono ${
                          isToday ? "text-blue-400 font-extrabold" : "text-gray-500"
                        }`}>
                          {day.label}
                        </span>
                        
                        <button
                          onClick={() => handleToggleCompletion(habit.id, day.dateString)}
                          className="focus:outline-none transition-transform active:scale-95 cursor-pointer"
                        >
                          {isCompleted ? (
                            <CheckCircle className="h-6 w-6 text-blue-500 fill-blue-500/10" />
                          ) : (
                            <Circle className={`h-6 w-6 ${isToday ? "text-blue-500/40" : "text-gray-700 hover:text-gray-500"}`} />
                          )}
                        </button>
                        
                        <span className="text-[9px] font-semibold text-gray-500 font-mono">
                          {day.dayNum}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Right side delete control */}
                <div className="flex md:flex-col items-center justify-between md:justify-center gap-2">
                  <button
                    onClick={() => handleDeleteHabit(habit.id)}
                    className="p-2 text-gray-500 hover:text-red-400 bg-gray-950 hover:bg-red-950/10 border border-gray-850 hover:border-red-950/20 rounded-lg transition-all cursor-pointer"
                    title="Delete habit"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
