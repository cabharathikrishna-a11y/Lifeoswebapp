import React, { useState } from "react";
import { JournalEntry } from "../types.ts";
import { BookOpen, Calendar, Plus, Search, Trash2, Edit3, Paperclip, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "firebase/auth";

interface JournalViewProps {
  entries: JournalEntry[];
  onEntriesChange: (entries: JournalEntry[]) => void;
  currentUser?: User | null;
  accessToken?: string | null;
  onLogin?: () => void;
}

export default function JournalView({ entries, onEntriesChange }: JournalViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [dateString, setDateString] = useState(new Date().toISOString().split("T")[0]);
  const [attachedFile, setAttachedFile] = useState("");

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) return;

    if (selectedEntry && isEditing) {
      // Edit
      const updated = entries.map((entry) => {
        if (entry.id === selectedEntry.id) {
          const attachments = entry.attachmentsJson ? JSON.parse(entry.attachmentsJson) : [];
          if (attachedFile && !attachments.includes(attachedFile)) {
            attachments.push(attachedFile);
          }
          return {
            ...entry,
            title,
            text,
            dateString,
            attachmentsJson: JSON.stringify(attachments)
          };
        }
        return entry;
      });
      onEntriesChange(updated);
      setSelectedEntry(null);
    } else {
      // Add
      const newEntry: JournalEntry = {
        id: entries.length ? Math.max(...entries.map((e) => e.id)) + 1 : 1,
        title,
        text,
        dateString,
        timestamp: Date.now(),
        attachmentsJson: attachedFile ? JSON.stringify([attachedFile]) : "[]"
      };
      onEntriesChange([newEntry, ...entries]);
    }

    // Reset Form
    setTitle("");
    setText("");
    setAttachedFile("");
    setDateString(new Date().toISOString().split("T")[0]);
    setIsEditing(false);
  };

  const handleDeleteEntry = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = entries.filter((entry) => entry.id !== id);
    onEntriesChange(updated);
    if (selectedEntry?.id === id) setSelectedEntry(null);
  };

  const handleStartEdit = (entry: JournalEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEntry(entry);
    setTitle(entry.title);
    setText(entry.text);
    setDateString(entry.dateString);
    setIsEditing(true);
  };

  const filteredEntries = entries.filter((entry) => {
    const query = searchQuery.toLowerCase();
    return (
      entry.title.toLowerCase().includes(query) ||
      entry.text.toLowerCase().includes(query)
    );
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="journal-container">
      {/* Sidebar: Entry Selector List */}
      <div className="space-y-4">
        {/* Search & New Buttons */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-blue-500 text-gray-100 placeholder-gray-500"
            />
          </div>

          <button
            onClick={() => {
              setSelectedEntry(null);
              setIsEditing(false);
              setTitle("");
              setText("");
              setAttachedFile("");
              setDateString(new Date().toISOString().split("T")[0]);
            }}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all cursor-pointer shadow-lg shadow-blue-500/10"
          >
            <Plus className="h-4 w-4" /> Write New Entry
          </button>
        </div>

        {/* Entries List */}
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {filteredEntries.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-8">No matching logs found.</p>
          ) : (
            filteredEntries.map((entry) => {
              const isActive = selectedEntry?.id === entry.id;
              const snippet = entry.text.length > 80 ? entry.text.substring(0, 80) + "..." : entry.text;
              return (
                <div
                  key={entry.id}
                  onClick={() => {
                    setSelectedEntry(entry);
                    setIsEditing(false);
                  }}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    isActive
                      ? "bg-blue-600/10 border-blue-500 shadow-md shadow-blue-500/5"
                      : "bg-gray-900/30 border-gray-800 hover:border-gray-700 hover:bg-gray-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="flex items-center gap-1.5 text-[10px] text-gray-400 font-semibold font-mono">
                      <Calendar className="h-3.5 w-3.5 text-blue-400" /> {entry.dateString}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleStartEdit(entry, e)}
                        className="p-1 hover:bg-gray-800 text-gray-500 hover:text-gray-300 rounded"
                        title="Edit entry"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteEntry(entry.id, e)}
                        className="p-1 hover:bg-red-950/20 text-gray-500 hover:text-red-400 rounded"
                        title="Delete entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-gray-100 mb-1">{entry.title}</h4>
                  <p className="text-[11px] text-gray-400 leading-normal">{snippet}</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Panel: Editor or Detailed View (col-span-2) */}
      <div className="md:col-span-2">
        {selectedEntry && !isEditing ? (
          /* Read Only Mode Detailed View */
          <div className="bg-gray-900/40 p-6 rounded-2xl border border-gray-800 min-h-[400px] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 font-mono font-bold tracking-widest uppercase">
                    JOURNAL LOG ENTRY
                  </span>
                  <h2 className="text-lg font-display font-bold text-white tracking-tight">{selectedEntry.title}</h2>
                </div>
                <span className="flex items-center gap-1 text-xs text-gray-400 font-bold font-mono bg-gray-950 px-2.5 py-1 rounded-lg border border-gray-800">
                  <Calendar className="h-3.5 w-3.5 text-blue-400" /> {selectedEntry.dateString}
                </span>
              </div>

              {/* Journal Body text */}
              <p className="text-xs text-gray-300 font-normal leading-relaxed whitespace-pre-wrap">
                {selectedEntry.text}
              </p>

              {/* Attachments panel */}
              {selectedEntry.attachmentsJson && JSON.parse(selectedEntry.attachmentsJson).length > 0 && (
                <div className="pt-4 border-t border-gray-800/40 space-y-2">
                  <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Attachments</h5>
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(selectedEntry.attachmentsJson).map((file: string, index: number) => (
                      <span
                        key={index}
                        className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded border border-blue-500/15"
                      >
                        <Paperclip className="h-3 w-3" /> {file}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-6">
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 bg-gray-850 hover:bg-gray-800 border border-gray-800 text-gray-200 text-xs font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" /> Edit Log
              </button>
            </div>
          </div>
        ) : (
          /* Editor Mode (Write New or Edit Existing) */
          <form
            onSubmit={handleSaveEntry}
            className="bg-gray-900/40 p-6 rounded-2xl border border-gray-800 space-y-4 min-h-[400px] flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
                <BookOpen className="h-5 w-5 text-blue-400" />
                <h2 className="text-sm font-bold text-gray-300">
                  {selectedEntry && isEditing ? "Edit Journal Entry" : "Write in Your Journal Book"}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Log Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Completed EFSDF Refactoring"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-gray-100 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Entry Date</label>
                  <input
                    type="date"
                    required
                    value={dateString}
                    onChange={(e) => setDateString(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-gray-100 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Write from the heart</label>
                <textarea
                  required
                  placeholder="How was your day? What obstacles did you conquer? Write down notes..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={8}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-gray-100 leading-relaxed font-normal"
                />
              </div>

              {/* Attachment selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Attach simulated files</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. screen_capture.png, notes_transcript.pdf"
                    value={attachedFile}
                    onChange={(e) => setAttachedFile(e.target.value)}
                    className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-800/60">
              {selectedEntry && isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedEntry(selectedEntry);
                  }}
                  className="bg-gray-850 hover:bg-gray-800 border border-gray-800 text-gray-300 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer shadow-lg shadow-blue-500/10"
              >
                <Check className="h-4 w-4" /> Save Entry
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
