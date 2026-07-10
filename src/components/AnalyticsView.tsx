import React from "react";
import { Task, FocusRecord, LedgerEntry, Habit } from "../types.ts";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  AreaChart, Area, PieChart, Pie, Cell, Legend 
} from "recharts";
import { BarChart3, TrendingUp, Clock, CheckSquare, Flame } from "lucide-react";

interface AnalyticsViewProps {
  tasks: Task[];
  focusRecords: FocusRecord[];
  ledger: LedgerEntry[];
  habits: Habit[];
}

export default function AnalyticsView({ tasks, focusRecords, ledger, habits }: AnalyticsViewProps) {
  // Stats Aggregation
  const completedTasks = tasks.filter(t => t.isCompleted).length;
  const totalFocusMins = Math.round(focusRecords.reduce((acc, r) => acc + (r.durationSeconds || r.durationMinutes * 60), 0) / 60);
  const totalInflow = ledger.filter(e => e.type === "INCOME").reduce((acc, curr) => acc + curr.amount, 0);
  const totalOutflow = ledger.filter(e => e.type === "EXPENSE").reduce((acc, curr) => acc + curr.amount, 0);
  const netBalance = totalInflow - totalOutflow;
  const activeHabits = habits.length;

  // Chart 1: Ledger Data Aggregation (Inflow vs Outflow by Category)
  const getLedgerCategoryData = () => {
    const categories: Record<string, { category: string; Inflow: number; Outflow: number }> = {};
    ledger.forEach((entry) => {
      const tag = entry.categoryTag || "Other";
      if (!categories[tag]) {
        categories[tag] = { category: tag, Inflow: 0, Outflow: 0 };
      }
      if (entry.type === "INCOME") {
        categories[tag].Inflow += entry.amount;
      } else {
        categories[tag].Outflow += entry.amount;
      }
    });
    return Object.values(categories).slice(0, 6); // Limit to top 6 categories
  };

  const ledgerData = getLedgerCategoryData();

  // Chart 2: Focus Session Chronology over time
  const getFocusTimeData = () => {
    // Group focus records by dateString
    const focusByDate: Record<string, { date: string; Minutes: number }> = {};
    focusRecords.forEach((rec) => {
      const date = rec.dateString;
      if (!focusByDate[date]) {
        focusByDate[date] = { date, Minutes: 0 };
      }
      focusByDate[date].Minutes += Math.round((rec.durationSeconds || rec.durationMinutes * 60) / 60);
    });

    const list = Object.values(focusByDate);
    if (list.length === 0) {
      // Seed dummy dates if list is empty for rendering
      return [
        { date: "Mon", Minutes: 25 },
        { date: "Tue", Minutes: 50 },
        { date: "Wed", Minutes: 45 },
        { date: "Thu", Minutes: 90 },
        { date: "Fri", Minutes: 60 }
      ];
    }
    return list.slice(-7); // Last 7 days
  };

  const focusData = getFocusTimeData();

  // Chart 3: Tasks Distribution by Priority
  const getTaskPriorityData = () => {
    const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    tasks.forEach((t) => {
      counts[t.priority] = (counts[t.priority] || 0) + 1;
    });

    return [
      { name: "HIGH PRIORITY", value: counts.HIGH, color: "#ef4444" },
      { name: "MEDIUM PRIORITY", value: counts.MEDIUM, color: "#eab308" },
      { name: "LOW PRIORITY", value: counts.LOW, color: "#10b981" }
    ].filter(item => item.value > 0);
  };

  const taskPriorityData = getTaskPriorityData();

  return (
    <div className="space-y-6" id="analytics-container">
      {/* Bento Grid Stats Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900/30 border border-gray-800 p-4 rounded-xl flex items-center gap-3.5">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/10">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Completed Tasks</span>
            <div className="text-xl font-bold font-mono text-white">{completedTasks}</div>
          </div>
        </div>

        <div className="bg-gray-900/30 border border-gray-800 p-4 rounded-xl flex items-center gap-3.5">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/10">
            <Clock className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Focus Duration</span>
            <div className="text-xl font-bold font-mono text-white">{totalFocusMins}m</div>
          </div>
        </div>

        <div className="bg-gray-900/30 border border-gray-800 p-4 rounded-xl flex items-center gap-3.5">
          <div className="p-3 bg-green-500/10 text-green-400 rounded-lg border border-green-500/10">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Net Ledger Balance</span>
            <div className={`text-xl font-bold font-mono ${netBalance >= 0 ? "text-green-400" : "text-red-400"}`}>
              ${netBalance.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="bg-gray-900/30 border border-gray-800 p-4 rounded-xl flex items-center gap-3.5">
          <div className="p-3 bg-yellow-500/10 text-yellow-400 rounded-lg border border-yellow-500/10">
            <Flame className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Habits</span>
            <div className="text-xl font-bold font-mono text-white">{activeHabits}</div>
          </div>
        </div>
      </div>

      {/* Main Charts grid panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ledger Category Balance Bar Chart */}
        <div className="bg-gray-900/40 border border-gray-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2 border-b border-gray-800 pb-2">
            <BarChart3 className="h-4 w-4 text-blue-400" /> Cash Flow breakdown (by Categories)
          </h3>
          <div className="h-64 w-full">
            {ledgerData.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-20">Log some income or expense ledger entries to display charts.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ledgerData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="category" stroke="#6b7280" fontSize={10} tickLine={false} />
                  <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0b0f19", borderColor: "#1f2937", borderRadius: "8px" }}
                    itemStyle={{ fontSize: "11px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px", marginTop: "10px" }} />
                  <Bar dataKey="Inflow" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Outflow" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Focus Duration Area Chart */}
        <div className="bg-gray-900/40 border border-gray-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2 border-b border-gray-800 pb-2">
            <Clock className="h-4 w-4 text-blue-400" /> Focus Sessions Duration (Minutes)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={focusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="focusColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0b0f19", borderColor: "#1f2937", borderRadius: "8px" }}
                  itemStyle={{ fontSize: "11px" }}
                />
                <Area type="monotone" dataKey="Minutes" stroke="#3b82f6" fillOpacity={1} fill="url(#focusColor)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Priorities distribution Pie Chart (Centered, col-span-1) */}
        {taskPriorityData.length > 0 && (
          <div className="bg-gray-900/40 border border-gray-800 p-5 rounded-2xl space-y-4 max-w-xl mx-auto lg:col-span-2 w-full">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2 border-b border-gray-800 pb-2">
              <CheckSquare className="h-4 w-4 text-blue-400" /> Tasks priorities allocation ratios
            </h3>
            <div className="h-60 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskPriorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {taskPriorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0b0f19", borderColor: "#1f2937", borderRadius: "8px" }}
                    itemStyle={{ fontSize: "11px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
