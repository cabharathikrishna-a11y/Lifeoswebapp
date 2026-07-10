import React, { useState } from "react";
import { KeepNote } from "../types.ts";
import { Search, Plus, Trash2, Pin, Globe, Palette, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "firebase/auth";

interface KeepNotesViewProps {
  notes: KeepNote[];
  onNotesChange: (notes: KeepNote[]) => void;
  currentUser?: User | null;
  accessToken?: string | null;
  onLogin?: () => void;
}

export default function KeepNotesView({ notes, onNotesChange }: KeepNotesViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditingNote, setIsEditingNote] = useState<KeepNote | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [colorHex, setColorHex] = useState("#0b0f19");
  const [isPinned, setIsPinned] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");

  const noteColors = [
    { name: "Default", hex: "#0b0f19" },
    { name: "Slate Blue", hex: "#1e3a8a" },
    { name: "Crimson", hex: "#7f1d1d" },
    { name: "Deep Green", hex: "#064e3b" },
    { name: "Amber", hex: "#78350f" },
    { name: "Amethyst", hex: "#581c87" }
  ];

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;

    const newNote: KeepNote = {
      id: notes.length ? Math.max(...notes.map(n => n.id)) + 1 : 1,
      title,
      content,
      timestamp: Date.now(),
      isPinned,
      colorHex,
      websiteUrl: websiteUrl.trim() || null,
      customLogoUrl: websiteUrl.trim() ? `https://www.google.com/s2/favicons?sz=64&domain=${websiteUrl}` : null
    };

    onNotesChange([newNote, ...notes]);
    
    // Reset Form
    setTitle("");
    setContent("");
    setWebsiteUrl("");
    setColorHex("#0b0f19");
    setIsPinned(false);
  };

  const handleDeleteNote = (id: number) => {
    onNotesChange(notes.filter(n => n.id !== id));
  };

  const handleTogglePin = (id: number) => {
    onNotesChange(notes.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingNote) return;

    onNotesChange(notes.map(n => n.id === isEditingNote.id ? isEditingNote : n));
    setIsEditingNote(null);
  };

  const filteredNotes = notes.filter((note) => {
    const query = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query)
    );
  });

  const pinnedNotes = filteredNotes.filter(n => n.isPinned);
  const otherNotes = filteredNotes.filter(n => !n.isPinned);

  return (
    <div className="space-y-6" id="keep-notes-container">
      {/* Note Creation Bar */}
      <form
        onSubmit={handleCreateNote}
        className="max-w-xl mx-auto bg-gray-900/40 border border-gray-800 p-4 rounded-xl space-y-3"
      >
        <div className="flex items-center justify-between">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent font-bold text-xs text-white focus:outline-none placeholder-gray-500 w-full"
          />
          <button
            type="button"
            onClick={() => setIsPinned(!isPinned)}
            className={`p-1 hover:bg-gray-800 rounded transition-all cursor-pointer ${
              isPinned ? "text-yellow-400" : "text-gray-500"
            }`}
            title="Pin note"
          >
            <Pin className="h-4 w-4 fill-current" />
          </button>
        </div>

        <textarea
          placeholder="Take a note..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="bg-transparent text-xs text-gray-300 focus:outline-none w-full leading-relaxed"
        />

        <input
          type="text"
          placeholder="Website URL (e.g. https://react.dev)"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          className="bg-gray-950/50 border border-gray-850 rounded px-2 py-1 text-[10px] text-gray-400 w-full font-mono focus:outline-none focus:border-blue-500"
        />

        <div className="flex items-center justify-between pt-2 border-t border-gray-800/60">
          {/* Color selectors */}
          <div className="flex gap-1.5 items-center">
            <Palette className="h-3.5 w-3.5 text-gray-500 mr-1" />
            {noteColors.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setColorHex(c.hex)}
                className={`w-4 h-4 rounded-full border cursor-pointer ${
                  colorHex === c.hex ? "border-white scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold px-3 py-1 rounded transition-all cursor-pointer shadow shadow-blue-500/10"
          >
            Create Note
          </button>
        </div>
      </form>

      {/* Search Input */}
      <div className="max-w-xl mx-auto relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search keep notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-blue-500 text-gray-100 placeholder-gray-500"
        />
      </div>

      {/* Notes board layout grids */}
      <div className="space-y-6">
        {/* Pinned section */}
        {pinnedNotes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Pinned</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pinnedNotes.map((note) => (
                <KeepNoteCard
                  key={note.id}
                  note={note}
                  onDelete={handleDeleteNote}
                  onTogglePin={handleTogglePin}
                  onEdit={setIsEditingNote}
                />
              ))}
            </div>
          </div>
        )}

        {/* Other section */}
        <div className="space-y-3">
          {pinnedNotes.length > 0 && otherNotes.length > 0 && (
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Others</h3>
          )}
          {otherNotes.length === 0 && pinnedNotes.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-8">No Google Keep notes saved yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {otherNotes.map((note) => (
                <KeepNoteCard
                  key={note.id}
                  note={note}
                  onDelete={handleDeleteNote}
                  onTogglePin={handleTogglePin}
                  onEdit={setIsEditingNote}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editing dialog modal */}
      {isEditingNote && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md p-6 rounded-2xl border border-gray-800 space-y-4"
            style={{ backgroundColor: isEditingNote.colorHex }}
          >
            <div className="flex items-center justify-between">
              <input
                type="text"
                required
                value={isEditingNote.title}
                onChange={(e) => setIsEditingNote({ ...isEditingNote, title: e.target.value })}
                className="bg-transparent font-bold text-sm text-white focus:outline-none w-full"
              />
              <button
                type="button"
                onClick={() => setIsEditingNote({ ...isEditingNote, isPinned: !isEditingNote.isPinned })}
                className={`p-1 rounded hover:bg-gray-800/40 transition-all ${
                  isEditingNote.isPinned ? "text-yellow-400" : "text-gray-400"
                }`}
              >
                <Pin className="h-4 w-4 fill-current" />
              </button>
            </div>

            <textarea
              required
              value={isEditingNote.content}
              onChange={(e) => setIsEditingNote({ ...isEditingNote, content: e.target.value })}
              rows={5}
              className="bg-transparent text-xs text-gray-200 focus:outline-none w-full leading-relaxed"
            />

            <input
              type="text"
              placeholder="Website link"
              value={isEditingNote.websiteUrl || ""}
              onChange={(e) => setIsEditingNote({ 
                ...isEditingNote, 
                websiteUrl: e.target.value || null,
                customLogoUrl: e.target.value ? `https://www.google.com/s2/favicons?sz=64&domain=${e.target.value}` : null
              })}
              className="bg-black/20 border border-white/10 rounded px-2 py-1 text-[10px] text-gray-300 w-full font-mono focus:outline-none"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsEditingNote(null)}
                className="text-[10px] bg-black/30 text-gray-300 px-3 py-1.5 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded font-bold"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* Single note card sub-component */
interface KeepNoteCardProps {
  note: KeepNote;
  onDelete: (id: number) => void;
  onTogglePin: (id: number) => void;
  onEdit: (note: KeepNote) => void;
}

function KeepNoteCard({ note, onDelete, onTogglePin, onEdit }: KeepNoteCardProps) {
  return (
    <div
      onClick={() => onEdit(note)}
      className="p-4.5 rounded-xl border border-gray-800/80 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg flex flex-col justify-between h-48 space-y-3"
      style={{ backgroundColor: note.colorHex }}
    >
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-white truncate max-w-[140px]">{note.title || "Untitled"}</h4>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePin(note.id); }}
              className={`p-1 rounded hover:bg-white/5 transition-all ${
                note.isPinned ? "text-yellow-400" : "text-gray-500"
              }`}
            >
              <Pin className="h-3.5 w-3.5 fill-current" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
              className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-red-400 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <p className="text-[11px] text-gray-300 leading-normal line-clamp-4 whitespace-pre-wrap">
          {note.content}
        </p>
      </div>

      {note.websiteUrl && (
        <a
          href={note.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 text-[9px] text-blue-400 font-mono bg-black/20 hover:bg-black/30 border border-white/5 px-2 py-1 rounded truncate self-start"
        >
          {note.customLogoUrl ? (
            <img src={note.customLogoUrl} className="w-3.5 h-3.5 shrink-0 rounded" alt="" referrerPolicy="no-referrer" />
          ) : (
            <Globe className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="truncate max-w-[150px]">{note.websiteUrl}</span>
        </a>
      )}
    </div>
  );
}
