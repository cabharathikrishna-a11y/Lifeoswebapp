import React, { useState } from "react";
import { Contact } from "../types.ts";
import { Search, Plus, Trash2, Folder, Phone, Mail, MapPin, Calendar, Briefcase, UserPlus, Check, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "firebase/auth";

interface ContactsViewProps {
  contacts: Contact[];
  onContactsChange: (contacts: Contact[]) => void;
  currentUser: User | null;
  accessToken: string | null;
  onLogin: () => void;
}

export default function ContactsView({ contacts, onContactsChange, currentUser, accessToken, onLogin }: ContactsViewProps) {
  const [filterFolder, setFilterFolder] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Google Sync State
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [dobString, setDobString] = useState("");
  const [anniversaryString, setAnniversaryString] = useState("");
  const [folder, setFolder] = useState("Work");

  const folders = ["All", "Work", "Friends", "Family", "Other"];

  const handleSyncGoogleContacts = async () => {
    if (!accessToken) {
      onLogin();
      return;
    }
    
    setIsSyncingContacts(true);
    setSyncStatus("Importing Google Contacts...");
    try {
      if (accessToken === "mock-bypass-access-token") {
        await new Promise(resolve => setTimeout(resolve, 1200));
        const mockConnections = [
          { firstName: "Jane", lastName: "Doe", jobTitle: "Lead Designer", email: "jane.doe@example.com", phone: "+1 (555) 123-4567", address: "123 Creative Studio Dr, SF", folder: "Work" },
          { firstName: "John", lastName: "Smith", jobTitle: "Product Manager", email: "john.smith@example.com", phone: "+1 (555) 987-6543", address: "456 Agile Way, NYC", folder: "Work" },
          { firstName: "Sarah", lastName: "Connor", jobTitle: "Personal Trainer", email: "sarah.c@example.com", phone: "+1 (555) 444-2222", address: "789 Resistance Rd, LA", folder: "Friends" },
          { firstName: "Robert", lastName: "Kiyosaki", jobTitle: "Financial Advisor", email: "richdad@example.com", phone: "+1 (555) 888-9999", address: "1 Cashflow Ave, Phoenix", folder: "Family" }
        ];

        let importedCount = 0;
        const updatedContacts = [...contacts];

        mockConnections.forEach((conn) => {
          const emailVal = conn.email;
          const phoneVal = conn.phone;

          const alreadyExists = contacts.some(
            c => (emailVal && c.email.toLowerCase() === emailVal.toLowerCase()) || 
                 (phoneVal && c.phone === phoneVal)
          );

          if (!alreadyExists) {
            const newContact: Contact = {
              id: updatedContacts.length ? Math.max(...updatedContacts.map(c => c.id)) + 1 : 1,
              firstName: conn.firstName,
              middleName: "",
              lastName: conn.lastName,
              jobTitle: conn.jobTitle,
              email: emailVal,
              address: conn.address,
              phone: phoneVal,
              dobString: "",
              anniversaryString: "",
              folder: conn.folder,
              attachedFilesJson: "[]"
            };
            updatedContacts.push(newContact);
            importedCount++;
          }
        });

        if (importedCount > 0) {
          onContactsChange(updatedContacts);
          setSyncStatus(`Successfully imported ${importedCount} contacts from Google Contacts Demo!`);
        } else {
          setSyncStatus("No new contacts found to import.");
        }
        setTimeout(() => setSyncStatus(null), 4000);
        return;
      }

      const response = await fetch(
        "https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations,addresses",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!response.ok) {
        let errorMsg = "Failed to fetch Google Contacts";
        try {
          const errData = await response.json();
          if (errData?.error?.message) {
            errorMsg = `Failed to fetch Google Contacts: ${errData.error.message}`;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }
      const data = await response.json();
      const connections = data.connections || [];
      
      let importedCount = 0;
      const updatedContacts = [...contacts];

      connections.forEach((conn: any) => {
        const emailVal = conn.emailAddresses?.[0]?.value || "";
        const nameObj = conn.names?.[0] || {};
        const first = nameObj.givenName || nameObj.displayName?.split(" ")[0] || "Unknown";
        const last = nameObj.familyName || nameObj.displayName?.split(" ").slice(1).join(" ") || "Contact";
        const middle = nameObj.middleName || "";
        const phoneVal = conn.phoneNumbers?.[0]?.value || "";
        const job = conn.organizations?.[0]?.title || "";
        const addr = conn.addresses?.[0]?.formattedValue || "";

        // Avoid exact duplicates by email or phone
        const alreadyExists = contacts.some(
          c => (emailVal && c.email.toLowerCase() === emailVal.toLowerCase()) || 
               (phoneVal && c.phone === phoneVal)
        );

        if (!alreadyExists && (emailVal || phoneVal || first !== "Unknown")) {
          const newContact: Contact = {
            id: updatedContacts.length ? Math.max(...updatedContacts.map(c => c.id)) + 1 : 1,
            firstName: first,
            middleName: middle,
            lastName: last,
            jobTitle: job,
            email: emailVal,
            address: addr,
            phone: phoneVal,
            dobString: "",
            anniversaryString: "",
            folder: "Other",
            attachedFilesJson: "[]"
          };
          updatedContacts.push(newContact);
          importedCount++;
        }
      });

      if (importedCount > 0) {
        onContactsChange(updatedContacts);
        setSyncStatus(`Successfully imported ${importedCount} contacts!`);
      } else {
        setSyncStatus("No new contacts found to import.");
      }
      setTimeout(() => setSyncStatus(null), 4000);
    } catch (e: any) {
      console.error(e);
      setSyncStatus("Error importing contacts.");
      setTimeout(() => setSyncStatus(null), 4000);
    } finally {
      setIsSyncingContacts(false);
    }
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    const newContact: Contact = {
      id: contacts.length ? Math.max(...contacts.map(c => c.id)) + 1 : 1,
      firstName,
      middleName,
      lastName,
      jobTitle,
      email,
      address,
      phone,
      dobString,
      anniversaryString,
      folder,
      attachedFilesJson: "[]"
    };

    onContactsChange([...contacts, newContact]);
    setIsAdding(false);

    // Reset Form
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setJobTitle("");
    setEmail("");
    setAddress("");
    setPhone("");
    setDobString("");
    setAnniversaryString("");
  };

  const handleDeleteContact = (id: number) => {
    onContactsChange(contacts.filter(c => c.id !== id));
    if (selectedContact?.id === id) setSelectedContact(null);
  };

  const filteredContacts = contacts.filter((contact) => {
    const fullName = `${contact.firstName} ${contact.middleName} ${contact.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || contact.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = filterFolder === "All" || contact.folder === filterFolder;
    return matchesSearch && matchesFolder;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="contacts-container">
      {/* Folder sidebar filter */}
      <div className="space-y-4">
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2.5 border-b border-gray-800 pb-1 flex items-center gap-1.5">
            <Folder className="h-4 w-4 text-blue-400" /> Folders
          </h3>
          <div className="flex flex-col gap-1">
            {folders.map((f) => (
              <button
                key={f}
                onClick={() => setFilterFolder(f)}
                className={`w-full flex items-center justify-between text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filterFolder === f
                    ? "bg-blue-600/10 text-blue-400 border border-blue-500/10"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-950/40"
                }`}
              >
                <span>{f}</span>
                <span className="text-[10px] font-mono text-gray-500 font-bold bg-gray-950/60 border border-gray-850 px-1.5 py-0.2 rounded">
                  {f === "All" ? contacts.length : contacts.filter(c => c.folder === f).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-all cursor-pointer shadow-lg shadow-blue-500/10"
        >
          <Plus className="h-4 w-4" /> Add Contact
        </button>

        {/* Google Workspace Contacts Integration */}
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4 space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Google Contacts</h4>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Import your personal contacts directly from your connected Google Account.
          </p>
          <button
            onClick={handleSyncGoogleContacts}
            disabled={isSyncingContacts}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-gray-950 hover:bg-gray-900 border border-gray-850 hover:border-gray-750 text-[10px] text-blue-400 hover:text-blue-300 rounded-lg transition-all cursor-pointer font-bold disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isSyncingContacts ? "animate-spin" : ""}`} />
            {isSyncingContacts ? "Syncing..." : "Sync Google Contacts"}
          </button>
          {syncStatus && (
            <p className="text-[9px] text-blue-300 font-medium text-center animate-pulse">{syncStatus}</p>
          )}
        </div>
      </div>

      {/* Main Grid: Add form or Contacts listing (col-span-2) */}
      <div className="lg:col-span-2 space-y-4">
        {/* Search list controller */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-blue-500 text-gray-100"
          />
        </div>

        {/* Adding Contact Form overlay */}
        <AnimatePresence>
          {isAdding && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddContact}
              className="overflow-hidden bg-gray-900/50 p-5 rounded-xl border border-gray-800 space-y-4"
            >
              <div className="flex items-center gap-2 border-b border-gray-850 pb-2 mb-2">
                <UserPlus className="h-4.5 w-4.5 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">Create New Contact</h3>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="First Name *"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-gray-950 border border-gray-850 rounded px-2.5 py-1.5 text-xs text-gray-200"
                />
                <input
                  type="text"
                  placeholder="Middle Name"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className="bg-gray-950 border border-gray-850 rounded px-2.5 py-1.5 text-xs text-gray-200"
                />
                <input
                  type="text"
                  required
                  placeholder="Last Name *"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-gray-950 border border-gray-850 rounded px-2.5 py-1.5 text-xs text-gray-200"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Job Title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="bg-gray-950 border border-gray-850 rounded px-2.5 py-1.5 text-xs text-gray-200"
                />

                <select
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  className="bg-gray-950 border border-gray-850 rounded px-2.5 py-1.5 text-xs text-gray-200"
                >
                  <option value="Work">Work</option>
                  <option value="Friends">Friends</option>
                  <option value="Family">Family</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-gray-950 border border-gray-850 rounded px-2.5 py-1.5 text-xs text-gray-200"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-950 border border-gray-850 rounded px-2.5 py-1.5 text-xs text-gray-200"
                />
              </div>

              <input
                type="text"
                placeholder="Physical Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-gray-950 border border-gray-850 rounded px-2.5 py-1.5 text-xs text-gray-200"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Date of Birth</label>
                  <input
                    type="date"
                    value={dobString}
                    onChange={(e) => setDobString(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-850 rounded px-2.5 py-1.5 text-xs text-gray-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Anniversary</label>
                  <input
                    type="date"
                    value={anniversaryString}
                    onChange={(e) => setAnniversaryString(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-850 rounded px-2.5 py-1.5 text-xs text-gray-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-850">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-[10px] bg-gray-850 text-gray-400 px-3 py-1.5 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-[10px] bg-blue-600 text-white px-3 py-1.5 rounded font-bold"
                >
                  Save Profile
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Contacts card list */}
        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
          {filteredContacts.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-8">No contacts found matching criteria.</p>
          ) : (
            filteredContacts.map((contact) => {
              const active = selectedContact?.id === contact.id;
              const initials = `${contact.firstName[0] || ""}${contact.lastName[0] || ""}`;

              return (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-4 ${
                    active
                      ? "bg-blue-600/10 border-blue-500 shadow-md shadow-blue-500/5"
                      : "bg-gray-900/30 border-gray-800 hover:border-gray-750 hover:bg-gray-900/40"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gray-800 text-blue-400 font-bold font-mono text-sm flex items-center justify-center border border-gray-750 shrink-0 uppercase">
                      {initials}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-gray-100 truncate">
                          {contact.firstName} {contact.middleName} {contact.lastName}
                        </h4>
                        <span className="text-[9px] font-bold text-gray-500 bg-gray-950 border border-gray-850 px-1.5 py-0.2 rounded uppercase">
                          {contact.folder}
                        </span>
                      </div>
                      
                      {contact.jobTitle && (
                        <p className="text-[10px] text-gray-400 font-medium truncate flex items-center gap-1">
                          <Briefcase className="h-3 w-3 text-gray-500 shrink-0" /> {contact.jobTitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteContact(contact.id);
                    }}
                    className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-950/10 border border-transparent hover:border-red-950/10 rounded transition-all cursor-pointer shrink-0"
                    title="Delete contact"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sidebar: Detail contact sheet panel */}
      <div className="space-y-4">
        {selectedContact ? (
          <div className="bg-gray-900/40 p-5 rounded-2xl border border-gray-800 space-y-5">
            <div className="text-center space-y-2 pb-4 border-b border-gray-800/60">
              <div className="w-16 h-16 rounded-full bg-gray-800 text-blue-400 font-bold font-mono text-2xl flex items-center justify-center border border-gray-700 mx-auto uppercase">
                {selectedContact.firstName[0]}{selectedContact.lastName[0]}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">
                  {selectedContact.firstName} {selectedContact.middleName} {selectedContact.lastName}
                </h3>
                {selectedContact.jobTitle && (
                  <p className="text-[11px] text-gray-400 font-semibold">{selectedContact.jobTitle}</p>
                )}
                <span className="inline-block text-[9px] font-bold text-gray-400 bg-gray-950 border border-gray-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Folder: {selectedContact.folder}
                </span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-gray-300">
              {selectedContact.phone && (
                <div className="flex items-start gap-2.5">
                  <Phone className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Mobile Phone</span>
                    <p className="font-mono text-xs">{selectedContact.phone}</p>
                  </div>
                </div>
              )}

              {selectedContact.email && (
                <div className="flex items-start gap-2.5">
                  <Mail className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Email Address</span>
                    <p className="font-mono text-xs truncate max-w-[170px]">{selectedContact.email}</p>
                  </div>
                </div>
              )}

              {selectedContact.address && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Physical Address</span>
                    <p className="leading-relaxed">{selectedContact.address}</p>
                  </div>
                </div>
              )}

              {selectedContact.dobString && (
                <div className="flex items-start gap-2.5">
                  <Calendar className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Date of Birth</span>
                    <p className="font-mono text-xs">{selectedContact.dobString}</p>
                  </div>
                </div>
              )}

              {selectedContact.anniversaryString && (
                <div className="flex items-start gap-2.5">
                  <Calendar className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Anniversary</span>
                    <p className="font-mono text-xs">{selectedContact.anniversaryString}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gray-900/20 border border-gray-800/80 p-6 rounded-xl text-center">
            <UserPlus className="h-10 w-10 text-gray-700 mx-auto mb-3" />
            <p className="text-xs text-gray-500">Select a contact profile card to inspect details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
