import React, { useState } from "react";
import { LedgerEntry, FinancialGoal } from "../types.ts";
import { DollarSign, Plus, Trash2, ArrowUpRight, ArrowDownRight, TrendingUp, PiggyBank, Target, Percent } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FinancesViewProps {
  ledger: LedgerEntry[];
  onLedgerChange: (ledger: LedgerEntry[]) => void;
  goals: FinancialGoal[];
  onGoalsChange: (goals: FinancialGoal[]) => void;
}

export default function FinancesView({ ledger, onLedgerChange, goals, onGoalsChange }: FinancesViewProps) {
  // Ledger form state
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [categoryTag, setCategoryTag] = useState("Food & Beverage");
  const [note, setNote] = useState("");

  // Goal form state
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalType, setGoalType] = useState<"SAVINGS" | "BUDGET">("SAVINGS");
  const [goalCategory, setGoalCategory] = useState("General");
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  // Totals calculations
  const totalIncome = ledger.filter(e => e.type === "INCOME").reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = ledger.filter(e => e.type === "EXPENSE").reduce((acc, curr) => acc + curr.amount, 0);
  const netSavings = totalIncome - totalExpense;

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0 || !categoryTag.trim()) return;

    const newEntry: LedgerEntry = {
      id: ledger.length ? Math.max(...ledger.map(e => e.id)) + 1 : 1,
      type,
      amount: numAmount,
      categoryTag,
      note,
      timestamp: Date.now()
    };

    onLedgerChange([newEntry, ...ledger]);
    setAmount("");
    setNote("");
  };

  const handleDeleteTransaction = (id: number) => {
    onLedgerChange(ledger.filter(e => e.id !== id));
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(goalTarget);
    if (!goalName.trim() || !target || target <= 0) return;

    const newGoal: FinancialGoal = {
      id: goals.length ? Math.max(...goals.map(g => g.id)) + 1 : 1,
      name: goalName,
      targetAmount: target,
      type: goalType,
      categoryTag: goalCategory
    };

    onGoalsChange([...goals, newGoal]);
    setGoalName("");
    setGoalTarget("");
    setIsAddingGoal(false);
  };

  const handleDeleteGoal = (id: number) => {
    onGoalsChange(goals.filter(g => g.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="finances-container">
      {/* Transaction form & Goal List (col-span-2) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Ledger Statistics Summary Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900/30 border border-gray-800/85 p-4 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Inflow</span>
              <div className="text-lg font-bold font-mono text-green-400">${totalIncome.toFixed(2)}</div>
            </div>
            <div className="p-2 bg-green-500/10 text-green-400 rounded-lg border border-green-500/10">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-gray-900/30 border border-gray-800/85 p-4 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Outflow</span>
              <div className="text-lg font-bold font-mono text-red-400">${totalExpense.toFixed(2)}</div>
            </div>
            <div className="p-2 bg-red-500/10 text-red-400 rounded-lg border border-red-500/10">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-gray-900/30 border border-gray-800/85 p-4 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Net Savings</span>
              <div className={`text-lg font-bold font-mono ${netSavings >= 0 ? "text-blue-400" : "text-yellow-500"}`}>
                ${netSavings.toFixed(2)}
              </div>
            </div>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/10">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Transaction Adding form */}
        <div className="bg-gray-900/40 p-5 rounded-xl border border-gray-800">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-1.5 border-b border-gray-800 pb-2">
            <DollarSign className="h-4 w-4 text-blue-400" /> Log Transaction entry
          </h3>

          <form onSubmit={handleAddTransaction} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Flow Type</label>
              <div className="flex bg-gray-950 p-0.5 rounded-lg border border-gray-800">
                <button
                  type="button"
                  onClick={() => setType("EXPENSE")}
                  className={`flex-1 py-1 text-xs font-semibold rounded cursor-pointer transition-all ${
                    type === "EXPENSE" ? "bg-red-500/10 text-red-400" : "text-gray-400"
                  }`}
                >
                  Outflow
                </button>
                <button
                  type="button"
                  onClick={() => setType("INCOME")}
                  className={`flex-1 py-1 text-xs font-semibold rounded cursor-pointer transition-all ${
                    type === "INCOME" ? "bg-green-500/10 text-green-400" : "text-gray-400"
                  }`}
                >
                  Inflow
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-100 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Category Tag</label>
              <input
                type="text"
                placeholder="e.g. Hosting, Food, Bonus"
                required
                value={categoryTag}
                onChange={(e) => setCategoryTag(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 px-4 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 h-9 shadow-lg shadow-blue-500/10"
            >
              <Plus className="h-4 w-4" /> Add Log
            </button>

            <div className="md:col-span-4 space-y-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Note (Optional)</label>
              <input
                type="text"
                placeholder="Brief transaction description..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </form>
        </div>

        {/* Financial Targets list panel */}
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
              <PiggyBank className="h-4 w-4 text-blue-400" /> Savings Targets & Budgets
            </h3>
            <button
              onClick={() => setIsAddingGoal(!isAddingGoal)}
              className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/15 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Target Setup
            </button>
          </div>

          <AnimatePresence>
            {isAddingGoal && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddGoal}
                className="overflow-hidden bg-gray-950/60 p-4 rounded-lg border border-gray-800/80 space-y-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Goal Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AWS Renewal Budget"
                      value={goalName}
                      onChange={(e) => setGoalName(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-850 rounded-lg px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Target ($)</label>
                    <input
                      type="number"
                      required
                      placeholder="500.00"
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-850 rounded-lg px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Target Type</label>
                    <select
                      value={goalType}
                      onChange={(e) => setGoalType(e.target.value as any)}
                      className="w-full bg-gray-950 border border-gray-850 rounded-lg px-2.5 py-1.5 text-xs text-gray-200"
                    >
                      <option value="SAVINGS">SAVINGS (Accumulate)</option>
                      <option value="BUDGET">BUDGET (Limit expenses)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Category Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Server, Tech, General"
                      value={goalCategory}
                      onChange={(e) => setGoalCategory(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-850 rounded-lg px-2.5 py-1.5 text-xs text-gray-100"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-850">
                  <button
                    type="button"
                    onClick={() => setIsAddingGoal(false)}
                    className="text-[10px] bg-gray-850 text-gray-400 px-3 py-1.5 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-[10px] bg-blue-600 text-white px-3 py-1.5 rounded font-bold"
                  >
                    Create Target
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Goal items listing */}
          <div className="space-y-3">
            {goals.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No savings goals configured.</p>
            ) : (
              goals.map((g) => {
                // Calculate progress
                // If type SAVINGS, we see how much netSavings we have towards it
                // If type BUDGET, we see how much of our targetExpense in category we used!
                const relevantExpense = ledger
                  .filter(e => e.type === "EXPENSE" && e.categoryTag.toLowerCase() === g.categoryTag.toLowerCase())
                  .reduce((acc, curr) => acc + curr.amount, 0);

                const currentAmt = g.type === "SAVINGS" ? Math.max(0, netSavings) : relevantExpense;
                const pct = Math.min(100, Math.round((currentAmt / g.targetAmount) * 100)) || 0;

                return (
                  <div key={g.id} className="bg-gray-950 p-4 rounded-xl border border-gray-850 flex items-start gap-4">
                    <div className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/10 rounded-lg">
                      <Target className="h-4.5 w-4.5" />
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-gray-200">{g.name}</h4>
                          <span className="text-[10px] text-gray-500 font-bold bg-gray-900 border border-gray-800 px-1.5 py-0.2 rounded uppercase">
                            {g.type} &bull; {g.categoryTag}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white font-mono">
                            ${currentAmt.toFixed(0)} / ${g.targetAmount}
                          </span>
                          <button
                            onClick={() => handleDeleteGoal(g.id)}
                            className="text-gray-500 hover:text-red-400 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-500 font-bold font-mono">
                          <span>Progress</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800/80">
                          <div 
                            className={`h-full rounded-full ${g.type === "BUDGET" && pct > 90 ? "bg-red-500" : "bg-blue-600"}`} 
                            style={{ width: `${pct}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Sidebar: All Transactions list */}
      <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-5 space-y-4 flex flex-col max-h-[640px]">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-800 pb-2 flex items-center gap-1.5">
          <DollarSign className="h-4 w-4 text-blue-400" /> Transaction Logs
        </h3>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {ledger.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-8">No logged ledger transactions yet.</p>
          ) : (
            ledger.map((entry) => (
              <div key={entry.id} className="bg-gray-950 p-3 rounded-lg border border-gray-850 flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold px-1.5 py-0.2 rounded font-mono text-[9px] ${
                      entry.type === "INCOME" 
                        ? "bg-green-500/10 text-green-400 border border-green-500/10" 
                        : "bg-red-500/10 text-red-400 border border-red-500/10"
                    }`}>
                      {entry.type === "INCOME" ? "INFLOW" : "OUTFLOW"}
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold truncate bg-gray-900 border border-gray-800 px-1 rounded">
                      {entry.categoryTag}
                    </span>
                  </div>
                  {entry.note && (
                    <p className="text-[10px] text-gray-400 truncate max-w-[150px] font-normal">{entry.note}</p>
                  )}
                  <span className="text-[9px] text-gray-500 font-mono block">
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-bold font-mono ${entry.type === "INCOME" ? "text-green-400" : "text-red-400"}`}>
                    {entry.type === "INCOME" ? "+" : "-"}${entry.amount.toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleDeleteTransaction(entry.id)}
                    className="p-1 text-gray-600 hover:text-red-400 rounded transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
