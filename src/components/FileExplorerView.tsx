import React, { useState, useEffect, useRef } from "react";
import { AppFile } from "../types.ts";
import { Folder, File, Search, Plus, Trash2, ChevronRight, UploadCloud, Info, Paperclip, FileText, Image, Film, FileCode, HardDrive, RefreshCw, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "firebase/auth";

interface FileExplorerViewProps {
  files: AppFile[];
  onFilesChange: (files: AppFile[]) => void;
  currentUser: User | null;
  accessToken: string | null;
  onLogin: () => void;
}

export default function FileExplorerView({ files, onFilesChange, currentUser, accessToken, onLogin }: FileExplorerViewProps) {
  const [currentPath, setCurrentPath] = useState("/");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<AppFile | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Drive integration states
  const [driveTab, setDriveTab] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isFetchingDrive, setIsFetchingDrive] = useState(false);
  const [driveSearchQuery, setDriveSearchQuery] = useState("");
  const [importNotification, setImportNotification] = useState<string | null>(null);

  // Google Picker, Docs & Sheets preview states
  const [docContent, setDocContent] = useState<string | null>(null);
  const [sheetValues, setSheetValues] = useState<any[][] | null>(null);
  const [isFetchingContent, setIsFetchingContent] = useState(false);

  // Load Google API and Picker JS dynamically
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      // @ts-ignore
      window.gapi?.load("picker", () => {
        console.log("Google Picker API loaded.");
      });
    };
    document.body.appendChild(script);
  }, []);

  const openGooglePicker = () => {
    if (!accessToken) {
      onLogin();
      return;
    }

    if (accessToken === "mock-bypass-access-token") {
      const demoDriveFiles = [
        { id: "demo-picked-1", name: "Life_OS_Goal_Tracker.gdoc", mimeType: "application/vnd.google-apps.document", sizeBytes: 25400 },
        { id: "demo-picked-2", name: "Life_OS_Ledger_Q1.gsheet", mimeType: "application/vnd.google-apps.spreadsheet", sizeBytes: 52000 },
        { id: "demo-picked-3", name: "Inspire_Vibe_Aesthetics.png", mimeType: "image/png", sizeBytes: 154000 }
      ];
      // Pick a random file to import
      const pickedFile = demoDriveFiles[Math.floor(Math.random() * demoDriveFiles.length)];
      handleImportGoogleDriveFile({
        id: pickedFile.id,
        name: pickedFile.name,
        mimeType: pickedFile.mimeType,
        size: pickedFile.sizeBytes
      });
      return;
    }

    // @ts-ignore
    if (!window.gapi || !window.google || !window.google.picker) {
      try {
        // @ts-ignore
        window.gapi?.load("picker", () => {
          openGooglePicker();
        });
      } catch (err) {
        alert("Google API components are still loading. Please try again in a moment.");
      }
      return;
    }

    const pickerOrigin =
      window.location.ancestorOrigins &&
      window.location.ancestorOrigins.length > 0
        ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
        : window.location.origin;

    try {
      // @ts-ignore
      const picker = new window.google.picker.PickerBuilder()
        // @ts-ignore
        .addView(window.google.picker.ViewId.DOCS)
        .setOAuthToken(accessToken)
        .setCallback((data: any) => {
          // @ts-ignore
          if (data.action === window.google.picker.Action.PICKED) {
            const pickedFile = data.docs[0];
            handleImportGoogleDriveFile({
              id: pickedFile.id,
              name: pickedFile.name,
              mimeType: pickedFile.mimeType,
              size: pickedFile.sizeBytes || 12500,
            });
          }
        })
        .setOrigin(pickerOrigin)
        .build();
      picker.setVisible(true);
    } catch (err) {
      console.error("Error creating Google Picker:", err);
    }
  };

  const handleFetchFileContent = async () => {
    if (!selectedFile || !accessToken) return;
    const fileId = selectedFile.uriString.replace("gdrive_sync_", "");
    setIsFetchingContent(true);

    try {
      if (accessToken === "mock-bypass-access-token") {
        await new Promise(resolve => setTimeout(resolve, 800));
        const mime = selectedFile.mimeType.toLowerCase();
        if (mime.includes("document") || selectedFile.name.endsWith(".docx") || selectedFile.name.endsWith(".gdoc") || fileId.includes("picked-1")) {
          setDocContent(
            `# Project Charter: Life OS\n\n` +
            `Welcome to your Life OS Demo document. This document is synchronized from your simulated Google Drive cloud.\n\n` +
            `## Key Project Goals\n` +
            `- Centralize focus records and habits\n` +
            `- Fully configure offline/guest fallbacks\n` +
            `- Sync tasks with calendar and tasks APIs\n\n` +
            `## Quick Tips\n` +
            `Try adding some subtasks or habit logs to see how they sync instantly to the local SQLite/Firebase databases!`
          );
        } else if (mime.includes("spreadsheet") || selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".gsheet") || fileId.includes("picked-2")) {
          setSheetValues([
            ["Month", "Income", "Rent/Living", "Food/Groceries", "Savings Goal", "Net Balance"],
            ["January", "4500", "1500", "450", "2000", "550"],
            ["February", "4500", "1500", "420", "2000", "580"],
            ["March", "4800", "1500", "480", "2200", "620"],
            ["April", "4800", "1500", "400", "2200", "700"]
          ]);
        } else {
          setDocContent("Visual content preview is not supported for binary file types.");
        }
        return;
      }

      const mime = selectedFile.mimeType.toLowerCase();
      if (mime.includes("document") || selectedFile.name.endsWith(".docx")) {
        const res = await fetch(`https://docs.googleapis.com/v1/documents/${fileId}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) throw new Error("Could not fetch document content.");
        const data = await res.json();
        
        let extractedText = "";
        data.body?.content?.forEach((element: any) => {
          element.paragraph?.elements?.forEach((el: any) => {
            if (el.textRun?.content) {
              extractedText += el.textRun.content;
            }
          });
        });
        setDocContent(extractedText || "(Empty Document)");
      } else if (mime.includes("spreadsheet") || selectedFile.name.endsWith(".xlsx")) {
        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/A1:F20`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) throw new Error("Could not fetch sheet data.");
        const data = await res.json();
        setSheetValues(data.values || [["(No data found in A1:F20)"]]);
      } else {
        setDocContent("Visual content preview is not supported for binary file types.");
      }
    } catch (err: any) {
      console.error(err);
      setDocContent(`Error: ${err.message}`);
    } finally {
      setIsFetchingContent(false);
    }
  };

  useEffect(() => {
    // Reset preview data on change
    setDocContent(null);
    setSheetValues(null);
  }, [selectedFile]);

  // Constants
  const availablePaths = ["/", "/documents", "/images", "/downloads", "/backups"];

  // Fetch Google Drive Files
  const fetchGoogleDriveFiles = async () => {
    if (!accessToken) return;
    setIsFetchingDrive(true);
    try {
      if (accessToken === "mock-bypass-access-token") {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockFiles = [
          { id: "doc-1", name: "Life_OS_Project_Charter.gdoc", mimeType: "application/vnd.google-apps.document", size: 45000, createdTime: new Date().toISOString() },
          { id: "sheet-1", name: "Weekly_Budget_Tracker.gsheet", mimeType: "application/vnd.google-apps.spreadsheet", size: 82000, createdTime: new Date().toISOString() },
          { id: "img-1", name: "Minimal_Desk_Inspiration.png", mimeType: "image/png", size: 1048576, createdTime: new Date().toISOString() },
          { id: "doc-2", name: "Mindfulness_Study_Guide.gdoc", mimeType: "application/vnd.google-apps.document", size: 32000, createdTime: new Date().toISOString() }
        ];
        setDriveFiles(mockFiles);
        return;
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?pageSize=40&fields=files(id,name,mimeType,size,createdTime)&q=trashed=false`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );
      if (!response.ok) throw new Error("Failed to fetch Google Drive files");
      const data = await response.json();
      setDriveFiles(data.files || []);
    } catch (e) {
      console.error("Google Drive connection failure:", e);
    } finally {
      setIsFetchingDrive(false);
    }
  };

  // Auto-fetch Drive files when access token is available and drive tab is active
  useEffect(() => {
    if (accessToken && driveTab) {
      fetchGoogleDriveFiles();
    }
  }, [accessToken, driveTab]);

  const handleCreateFile = (name: string, size: number, type: string, uriString?: string) => {
    const newFile: AppFile = {
      id: files.length ? Math.max(...files.map(f => f.id)) + 1 : 1,
      name,
      path: currentPath,
      size,
      mimeType: type || "application/octet-stream",
      uriString: uriString || `local_blob_${Date.now()}`,
      timestamp: Date.now()
    };
    onFilesChange([...files, newFile]);
  };

  const handleDeleteFile = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onFilesChange(files.filter(f => f.id !== id));
    if (selectedFile?.id === id) setSelectedFile(null);
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const uploaded = e.dataTransfer.files[0];
    if (uploaded) {
      if (uploaded.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          handleCreateFile(uploaded.name, uploaded.size, uploaded.type, base64);
        };
        reader.readAsDataURL(uploaded);
      } else {
        handleCreateFile(uploaded.name, uploaded.size, uploaded.type);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (uploaded) {
      if (uploaded.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          handleCreateFile(uploaded.name, uploaded.size, uploaded.type, base64);
        };
        reader.readAsDataURL(uploaded);
      } else {
        handleCreateFile(uploaded.name, uploaded.size, uploaded.type);
      }
    }
  };

  // Get current subfolders and files based on path
  const getSubfolders = () => {
    if (currentPath === "/") {
      return ["documents", "images", "downloads", "backups"];
    }
    return [];
  };

  const getCurrentFiles = () => {
    return files.filter(f => {
      const matchesPath = f.path === currentPath;
      const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPath && matchesSearch;
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mime: string, uriString?: string) => {
    const m = mime.toLowerCase();
    if (m.includes("image")) {
      if (uriString && (uriString.startsWith("data:") || uriString.startsWith("http"))) {
        return (
          <div className="w-5 h-5 rounded overflow-hidden flex items-center justify-center bg-gray-950 shrink-0 border border-gray-800">
            <img src={uriString} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="Thumbnail" />
          </div>
        );
      }
      return <Image className="h-5 w-5 text-green-400" />;
    }
    if (m.includes("video")) return <Film className="h-5 w-5 text-purple-400" />;
    if (m.includes("pdf") || m.includes("text") || m.includes("doc")) return <FileText className="h-5 w-5 text-blue-400" />;
    if (m.includes("javascript") || m.includes("json") || m.includes("html") || m.includes("typescript")) return <FileCode className="h-5 w-5 text-yellow-400" />;
    return <File className="h-5 w-5 text-gray-400" />;
  };

  const pathBreadcrumbs = currentPath.split("/").filter(p => p !== "");

  // Import file from Google Drive to Local Workspace
  const handleImportGoogleDriveFile = (gFile: any) => {
    const isAlreadyImported = files.some(f => f.uriString === `gdrive_sync_${gFile.id}`);
    if (isAlreadyImported) {
      setImportNotification(`"${gFile.name}" is already imported in your Workspace!`);
      setTimeout(() => setImportNotification(null), 3500);
      return;
    }

    const newFile: AppFile = {
      id: files.length ? Math.max(...files.map(f => f.id)) + 1 : 1,
      name: gFile.name,
      path: currentPath,
      size: parseInt(gFile.size) || 12240, // 12 KB fallback
      mimeType: gFile.mimeType || "application/octet-stream",
      uriString: `gdrive_sync_${gFile.id}`,
      timestamp: Date.now()
    };

    onFilesChange([...files, newFile]);
    setImportNotification(`Successfully imported "${gFile.name}" to Workspace path: "${currentPath}"!`);
    setTimeout(() => setImportNotification(null), 4000);
  };

  const filteredDriveFiles = driveFiles.filter(f => 
    f.name.toLowerCase().includes(driveSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4" id="files-container">
      {/* Dynamic import micro-toast alert banner */}
      <AnimatePresence>
        {importNotification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-blue-950/90 border border-blue-500/30 text-blue-300 text-xs rounded-xl flex items-center justify-between shadow-xl"
          >
            <span>{importNotification}</span>
            <button 
              onClick={() => setImportNotification(null)}
              className="text-[10px] font-bold text-blue-400 hover:text-white px-2 py-0.5"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Navigation / Google Drive Connect */}
        <div className="space-y-4">
          {/* Selector Tabs */}
          <div className="grid grid-cols-2 gap-1.5 bg-gray-950 p-1.5 rounded-xl border border-gray-800">
            <button
              onClick={() => setDriveTab(false)}
              className={`py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center ${
                !driveTab 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/10" 
                  : "text-gray-400 hover:text-white hover:bg-gray-900/30"
              }`}
            >
              Workspace
            </button>
            <button
              onClick={() => setDriveTab(true)}
              className={`py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                driveTab 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/10" 
                  : "text-gray-400 hover:text-white hover:bg-gray-900/30"
              }`}
            >
              <HardDrive className="h-3 w-3" />
              Google Drive
            </button>
          </div>

          {!driveTab ? (
            <>
              {/* Workspace directory tree list */}
              <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-800 pb-2">
                  Workspace Paths
                </h3>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => { setCurrentPath("/"); setSelectedFile(null); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg text-left transition-all cursor-pointer ${
                      currentPath === "/" ? "bg-blue-600/10 text-blue-400" : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    <Folder className="h-4 w-4" /> Root (/)
                  </button>
                  {availablePaths.filter(p => p !== "/").map((p) => (
                    <button
                      key={p}
                      onClick={() => { setCurrentPath(p); setSelectedFile(null); }}
                      className={`w-full flex items-center gap-2 pl-6 pr-3 py-1.5 text-xs font-semibold rounded-lg text-left transition-all cursor-pointer ${
                        currentPath === p ? "bg-blue-600/10 text-blue-400" : "text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      <Folder className="h-4 w-4 shrink-0" /> {p.substring(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer space-y-3 ${
                  dragOver 
                    ? "border-blue-500 bg-blue-500/5 text-blue-400" 
                    : "border-gray-800 bg-gray-900/10 text-gray-500 hover:border-gray-700 hover:text-gray-400"
                }`}
              >
                <UploadCloud className="h-10 w-10 mx-auto" />
                <div className="space-y-1">
                  <p className="text-xs font-bold">Drag and drop file</p>
                  <p className="text-[10px] text-gray-500">or click to browse local storage</p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </>
          ) : (
            <>
              {/* Google Drive connected control states */}
              {currentUser && accessToken ? (
                <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4 space-y-3 text-center">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto border border-blue-500/20">
                    <HardDrive className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-200">Google Drive Connected</h4>
                    <p className="text-[9px] text-gray-500 truncate">{currentUser.email}</p>
                  </div>
                  <button
                    onClick={fetchGoogleDriveFiles}
                    disabled={isFetchingDrive}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-gray-950 hover:bg-gray-900 border border-gray-850 hover:border-gray-750 text-[10px] text-gray-400 hover:text-white rounded-lg transition-all cursor-pointer font-bold"
                  >
                    <RefreshCw className={`h-3 w-3 ${isFetchingDrive ? "animate-spin" : ""}`} />
                    Refresh Drive Files
                  </button>
                  <button
                    onClick={openGooglePicker}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] rounded-lg transition-all cursor-pointer font-bold shadow-md shadow-blue-500/10"
                  >
                    <Plus className="h-3 w-3" />
                    Open Google Picker
                  </button>
                </div>
              ) : (
                <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-5 text-center space-y-4">
                  <HardDrive className="h-10 w-10 text-blue-400 mx-auto" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-200">Connect Google Drive</h4>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      Unlock real-time cloud file importing! Browse and download any of your private files from Google Drive straight into your OS.
                    </p>
                  </div>
                  <button
                    onClick={onLogin}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-lg shadow-blue-500/10"
                  >
                    <LogIn className="h-4 w-4" />
                    Connect Google Drive
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Center: Main browser list container */}
        <div className="lg:col-span-2 space-y-4">
          {!driveTab ? (
            <>
              {/* Local file search row */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-gray-400">
                  <span className="cursor-pointer hover:text-white" onClick={() => setCurrentPath("/")}>root</span>
                  {pathBreadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={crumb}>
                      <ChevronRight className="h-3 w-3 text-gray-600" />
                      <span 
                        className="cursor-pointer hover:text-white" 
                        onClick={() => setCurrentPath("/" + pathBreadcrumbs.slice(0, idx + 1).join("/"))}
                      >
                        {crumb}
                      </span>
                    </React.Fragment>
                  ))}
                </div>

                <div className="relative md:w-48 shrink-0">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search path..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-8 pr-3 py-1 text-xs focus:outline-none focus:border-blue-500 text-gray-100 placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Local Explorer Grid Panel */}
              <div className="bg-gray-900/35 border border-gray-800/80 rounded-xl p-4 min-h-[420px] space-y-4">
                {getSubfolders().length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Directories</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {getSubfolders().map((folder) => (
                        <div
                          key={folder}
                          onClick={() => { setCurrentPath("/" + folder); setSelectedFile(null); }}
                          className="p-3 rounded-lg bg-gray-950/60 border border-gray-850 hover:border-gray-700 cursor-pointer flex items-center gap-2.5 transition-all"
                        >
                          <Folder className="h-5 w-5 text-blue-500 fill-blue-500/10 shrink-0" />
                          <span className="text-xs font-semibold text-gray-200 truncate">{folder}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Files</h4>
                  {getCurrentFiles().length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-12">No files stored in this path.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {getCurrentFiles().map((file) => {
                        const isActive = selectedFile?.id === file.id;
                        return (
                          <div
                            key={file.id}
                            onClick={() => setSelectedFile(file)}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                              isActive
                                ? "bg-blue-600/10 border-blue-500"
                                : "bg-gray-950/30 border-gray-850 hover:border-gray-700 hover:bg-gray-950/50"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {getFileIcon(file.mimeType, file.uriString)}
                              <div className="space-y-0.5 min-w-0">
                                <h5 className="text-xs font-bold text-gray-200 truncate">{file.name}</h5>
                                <p className="text-[9px] font-mono text-gray-500 font-semibold">{formatBytes(file.size)}</p>
                              </div>
                            </div>

                            <button
                              onClick={(e) => handleDeleteFile(file.id, e)}
                              className="text-gray-500 hover:text-red-400 p-1.5 hover:bg-red-950/10 rounded-lg transition-all cursor-pointer shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Google Drive Directory Row search */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400 font-mono font-bold uppercase tracking-wider">
                  Google Drive directory Listing
                </span>
                <div className="relative md:w-48 shrink-0">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Filter Drive files..."
                    value={driveSearchQuery}
                    onChange={(e) => setDriveSearchQuery(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-8 pr-3 py-1 text-xs focus:outline-none focus:border-blue-500 text-gray-100 placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Google Drive Explorer Panel Grid */}
              <div className="bg-gray-900/35 border border-gray-800/80 rounded-xl p-4 min-h-[420px] space-y-4">
                {isFetchingDrive ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-3">
                    <RefreshCw className="h-7 w-7 text-blue-500 animate-spin" />
                    <p className="text-xs text-gray-400 font-medium">Connecting and fetching Google Drive repository...</p>
                  </div>
                ) : !currentUser || !accessToken ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto space-y-2">
                    <Info className="h-8 w-8 text-gray-700" />
                    <h5 className="text-xs font-bold text-gray-300">Google Connection Required</h5>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Please use the sidebar sign-in control to authenticate and authorize read access to your cloud files.
                    </p>
                  </div>
                ) : filteredDriveFiles.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-20">No Google Drive files found matching filter.</p>
                ) : (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">
                      Available Google Drive Files
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredDriveFiles.map((gFile) => {
                        const fileAlreadyInWorkspace = files.some(f => f.uriString === `gdrive_sync_${gFile.id}`);
                        return (
                          <div
                            key={gFile.id}
                            className={`p-3 rounded-xl bg-gray-950/40 border border-gray-850 hover:border-gray-750 flex items-center justify-between gap-3`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {getFileIcon(gFile.mimeType || "")}
                              <div className="space-y-0.5 min-w-0">
                                <h5 className="text-xs font-bold text-gray-200 truncate">{gFile.name}</h5>
                                <p className="text-[9px] text-gray-500 truncate max-w-[130px]">
                                  {gFile.mimeType ? gFile.mimeType.split("/")[1] || gFile.mimeType : "Unknown Type"}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleImportGoogleDriveFile(gFile)}
                              disabled={fileAlreadyInWorkspace}
                              className={`px-2.5 py-1 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${
                                fileAlreadyInWorkspace 
                                  ? "bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed" 
                                  : "bg-blue-600/15 text-blue-400 border-blue-500/25 hover:bg-blue-600/25"
                              }`}
                            >
                              {fileAlreadyInWorkspace ? "Imported" : "Import"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

         {/* Right Side: Metadata file inspector */}
        <div className="space-y-4">
          {selectedFile ? (
            <div className="bg-gray-900/40 p-5 rounded-2xl border border-gray-800 space-y-4 flex flex-col justify-between min-h-[350px]">
              <div className="space-y-4">
                <div className="text-center space-y-2 pb-3 border-b border-gray-800/60">
                  <div className="w-12 h-12 rounded-lg bg-gray-950 border border-gray-750 flex items-center justify-center mx-auto overflow-hidden">
                    {getFileIcon(selectedFile.mimeType, selectedFile.uriString)}
                  </div>
                  <h4 className="text-xs font-bold text-white break-all leading-normal px-2">{selectedFile.name}</h4>
                </div>

                <div className="space-y-2.5 text-xs text-gray-300">
                  <div className="flex justify-between py-1 border-b border-gray-850/30">
                    <span className="text-gray-500 font-bold uppercase text-[9px] tracking-wider">File Path</span>
                    <span className="font-mono text-[10px] text-gray-300">{selectedFile.path}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-850/30">
                    <span className="text-gray-500 font-bold uppercase text-[9px] tracking-wider">File Size</span>
                    <span className="font-mono text-[10px] text-gray-300">{formatBytes(selectedFile.size)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-850/30">
                    <span className="text-gray-500 font-bold uppercase text-[9px] tracking-wider">MIME Type</span>
                    <span className="font-mono text-[10px] text-blue-400 truncate max-w-[120px]">{selectedFile.mimeType}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-850/30">
                    <span className="text-gray-500 font-bold uppercase text-[9px] tracking-wider">Source Origin</span>
                    <span className="font-mono text-[9px] text-yellow-500 uppercase tracking-widest">
                      {selectedFile.uriString.startsWith("gdrive") ? "Google Drive" : "Workspace Local"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-850/30">
                    <span className="text-gray-500 font-bold uppercase text-[9px] tracking-wider">Created/Sync</span>
                    <span className="font-mono text-[10px] text-gray-300">
                      {new Date(selectedFile.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {selectedFile.mimeType.toLowerCase().includes("image") && selectedFile.uriString && (
                  <div className="rounded-xl overflow-hidden border border-gray-850 bg-gray-950 p-2 text-center mt-3">
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Image Preview</p>
                    <img 
                      src={selectedFile.uriString} 
                      referrerPolicy="no-referrer"
                      className="max-h-40 w-full object-contain rounded-lg bg-black" 
                      alt={selectedFile.name} 
                    />
                  </div>
                )}
              </div>

              {selectedFile.uriString.startsWith("gdrive_sync_") ? (
                <div className="space-y-3 mt-2">
                  <div className="p-3 bg-gray-950/60 border border-gray-850 rounded-xl space-y-2 text-center">
                    <p className="text-[10px] font-bold text-blue-400">Google Cloud Sync-Linked</p>
                    <p className="text-[9px] text-gray-500 leading-relaxed">Fetch live content data from your Google Workspace using authorization tokens.</p>
                    
                    {!docContent && !sheetValues ? (
                      <button
                        onClick={handleFetchFileContent}
                        disabled={isFetchingContent}
                        className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isFetchingContent ? "Loading Content..." : "Fetch Content / Preview"}
                      </button>
                    ) : (
                      <button
                        onClick={() => { setDocContent(null); setSheetValues(null); }}
                        className="w-full py-1 bg-gray-900 hover:bg-gray-850 text-gray-400 text-[9px] font-bold rounded cursor-pointer"
                      >
                        Clear Preview
                      </button>
                    )}
                  </div>

                  {/* Render document content */}
                  {docContent && (
                    <div className="p-3 bg-gray-950 border border-gray-850 rounded-xl max-h-[220px] overflow-y-auto text-left">
                      <h5 className="text-[9px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-850 pb-1 mb-1.5">Document Preview</h5>
                      <p className="text-[10px] text-gray-300 whitespace-pre-wrap leading-relaxed select-text font-mono">{docContent}</p>
                    </div>
                  )}

                  {/* Render sheet content */}
                  {sheetValues && (
                    <div className="p-2 bg-gray-950 border border-gray-850 rounded-xl max-h-[220px] overflow-auto text-left">
                      <h5 className="text-[9px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-850 pb-1 mb-1.5">Spreadsheet Preview (A1:F20)</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-[9px]">
                          <tbody>
                            {sheetValues.map((row, rIdx) => (
                              <tr key={rIdx} className="border-b border-gray-900/40">
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="p-1 border-r border-gray-900/20 text-gray-300 font-mono truncate max-w-[80px]" title={cell}>
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => {
                    setImportNotification(`Local File URL: http://localhost:3000/api/files/${selectedFile.uriString}`);
                    setTimeout(() => setImportNotification(null), 5000);
                  }}
                  className="w-full text-center py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                >
                  Get Download URL
                </button>
              )}
            </div>
          ) : (
            <div className="bg-gray-900/20 border border-gray-800/80 p-6 rounded-xl text-center">
              <Info className="h-10 w-10 text-gray-700 mx-auto mb-3" />
              <p className="text-xs text-gray-500">Select a file card to inspect metadata details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
