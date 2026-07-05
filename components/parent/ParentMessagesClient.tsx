"use client";

import { useState, useEffect } from "react";

type Contact = {
  id: string; // "teacher_id" or "admin_id"
  dbId: number;
  name: string;
  role: "teacher" | "admin";
  email: string | null;
  profileImageUrl: string | null;
  subjectName?: string;
  displayClass?: string;
};

type Message = {
  id: string;
  sender: "parent" | "other";
  text: string;
  timestamp: string;
};

type Props = {
  contacts: Contact[];
  parentName: string;
  studentName: string;
};

const BOT_REPLIES = [
  "Thank you for reaching out. I'll check my records and get back to you shortly.",
  "Hello! I will review this during class prep and follow up with a detailed response.",
  "Your message has been received. I am currently out of class, but I will write back soon.",
  "Thanks for the update. We will support your child in every way possible.",
  "Excellent points. Let's touch base during the upcoming parent-teacher meeting.",
  "Thank you for contacting school operations. We are looking into this request.",
];

export default function ParentMessagesClient({ contacts, parentName, studentName }: Props) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(contacts[0] || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typedMessage, setTypedMessage] = useState("");

  // Store conversation messages keyed by contact.id
  const [chatHistories, setChatHistories] = useState<Record<string, Message[]>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Seed default histories
  useEffect(() => {
    // Try to load from localStorage if available
    const saved = localStorage.getItem("ep_parent_chats_history");
    if (saved) {
      try {
        setChatHistories(JSON.parse(saved));
        return;
      } catch (e) {
        console.error(e);
      }
    }

    // Otherwise, generate initial messages
    const initialHistories: Record<string, Message[]> = {};
    const initialUnreads: Record<string, number> = {};

    contacts.forEach((contact, idx) => {
      const isTeacher = contact.role === "teacher";
      const welcome = isTeacher
        ? `Hello! I am ${contact.name}, teaching ${contact.subjectName || "Subject"} for ${studentName}. Let me know if you'd like to discuss their academic performance.`
        : `Welcome to the school administration desk. I am ${contact.name}. How can I assist you with school operations today?`;

      initialHistories[contact.id] = [
        {
          id: `welcome-${contact.id}`,
          sender: "other",
          text: welcome,
          timestamp: new Date(Date.now() - 3600000 * 2).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ];

      // Mark first few contacts as having 1 unread message
      if (idx > 0 && idx < 3) {
        initialUnreads[contact.id] = 1;
      }
    });

    setChatHistories(initialHistories);
    setUnreadCounts(initialUnreads);
  }, [contacts, studentName]);

  // Persist histories in localStorage
  const saveHistory = (hist: Record<string, Message[]>) => {
    localStorage.setItem("ep_parent_chats_history", JSON.stringify(hist));
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    // Mark as read
    setUnreadCounts((prev) => ({
      ...prev,
      [contact.id]: 0,
    }));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !typedMessage.trim()) return;

    const timeString = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: Message = {
      id: `parent-${Date.now()}`,
      sender: "parent",
      text: typedMessage.trim(),
      timestamp: timeString,
    };

    const updatedHistory = {
      ...chatHistories,
      [selectedContact.id]: [...(chatHistories[selectedContact.id] || []), userMsg],
    };

    setChatHistories(updatedHistory);
    saveHistory(updatedHistory);
    setTypedMessage("");

    // Simulate Bot Response
    const currentContactId = selectedContact.id;
    setTimeout(() => {
      const botMsgText = BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)];
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: "other",
        text: botMsgText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setChatHistories((prev) => {
        const hist = {
          ...prev,
          [currentContactId]: [...(prev[currentContactId] || []), botMsg],
        };
        saveHistory(hist);
        return hist;
      });

      // Increment unread count if contact is not currently selected
      if (selectedContact.id !== currentContactId) {
        setUnreadCounts((prev) => ({
          ...prev,
          [currentContactId]: (prev[currentContactId] || 0) + 1,
        }));
      }
    }, 1500);
  };

  // Filter contacts
  const filteredContacts = contacts.filter((c) => {
    return c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.subjectName || "").toLowerCase().includes(searchQuery.toLowerCase());
  });

  const activeMessages = selectedContact ? chatHistories[selectedContact.id] || [] : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="pb-4 border-b border-theme mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
          Communication
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Message Center
        </h1>
        <p className="mt-2 text-sm text-secondary">
          Initiate direct communication channels with class instructors and school administrators.
        </p>
      </div>

      {contacts.length === 0 ? (
        <div className="rounded-2xl border border-theme bg-surface p-12 text-center text-sm font-medium text-muted">
          No class teachers or administration contacts found.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 rounded-3xl border border-theme bg-surface overflow-hidden min-h-[580px] shadow-xl">
          {/* Contacts Panel (1/3 col) */}
          <div className="lg:col-span-1 border-r border-theme flex flex-col h-[580px]">
            {/* Search */}
            <div className="p-4 border-b border-subtle">
              <input
                type="text"
                placeholder="Search teachers/admins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 rounded-xl border border-theme bg-base px-3 text-xs text-primary outline-none focus:border-cyan-500 placeholder:text-muted transition"
              />
            </div>

            {/* Contacts List */}
            <div className="flex-1 overflow-y-auto space-y-0.5 p-2 scrollbar-hide">
              {filteredContacts.map((contact) => {
                const active = selectedContact?.id === contact.id;
                const unread = unreadCounts[contact.id] || 0;
                const initials = contact.name.split(" ").filter(Boolean).map(x => x[0]).join("").slice(0,2).toUpperCase();

                return (
                  <button
                    key={contact.id}
                    onClick={() => handleSelectContact(contact)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition duration-150 text-left ${
                      active ? "bg-cyan-500/10 text-cyan-400" : "hover:bg-hover"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {contact.profileImageUrl ? (
                        <div className="h-10 w-10 overflow-hidden rounded-xl border border-theme shrink-0">
                          <img src={contact.profileImageUrl} alt={contact.name} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <span className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          contact.role === "teacher"
                            ? "bg-cyan-500/20 text-cyan-400"
                            : "bg-purple-500/20 text-purple-400"
                        }`}>
                          {initials}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-primary truncate">{contact.name}</p>
                        <p className="text-[10px] text-muted truncate mt-0.5">
                          {contact.role === "teacher"
                            ? `${contact.subjectName || "Instructor"} • Teacher`
                            : "Operations Desk • Admin"}
                        </p>
                      </div>
                    </div>

                    {unread > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shrink-0">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat Window Panel (2/3 col) */}
          <div className="lg:col-span-2 flex flex-col h-[580px] bg-hover/5">
            {selectedContact ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-subtle bg-surface flex items-center gap-3">
                  <span className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    selectedContact.role === "teacher"
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "bg-purple-500/20 text-purple-400"
                  }`}>
                    {selectedContact.name.split(" ").filter(Boolean).map(x => x[0]).join("").slice(0,2).toUpperCase()}
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-primary">{selectedContact.name}</h3>
                    <p className="text-[9px] text-muted font-medium uppercase mt-0.5 tracking-wider">
                      {selectedContact.role === "teacher"
                        ? `Class ${selectedContact.displayClass} • Subject: ${selectedContact.subjectName}`
                        : "Official School Administrator"}
                    </p>
                  </div>
                </div>

                {/* Messages Display */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                  {activeMessages.map((msg) => {
                    const isParent = msg.sender === "parent";
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isParent ? "justify-end" : "justify-start"} animate-in fade-in duration-150`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl p-3.5 shadow-sm text-xs ${
                            isParent
                              ? "bg-cyan-600 text-white rounded-tr-none"
                              : "bg-surface border border-theme text-secondary rounded-tl-none"
                          }`}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          <p className={`text-[8px] mt-1.5 text-right ${isParent ? "text-white/60" : "text-muted"}`}>
                            {msg.timestamp}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 bg-surface border-t border-subtle flex gap-3">
                  <input
                    type="text"
                    placeholder={`Type a message to ${selectedContact.name}...`}
                    value={typedMessage}
                    onChange={(e) => setTypedMessage(e.target.value)}
                    className="flex-1 h-11 rounded-xl border border-theme bg-base px-4 text-xs text-primary outline-none focus:border-cyan-500 placeholder:text-muted transition"
                  />
                  <button
                    type="submit"
                    className="rounded-xl btn-blue px-6 py-2.5 text-xs font-bold shrink-0"
                  >
                    Send 🚀
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center text-muted p-8">
                <svg viewBox="0 0 24 24" className="h-10 w-10 mb-4 fill-current opacity-30">
                  <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                </svg>
                <p className="text-xs font-semibold">No Contact Selected</p>
                <p className="text-[10px] mt-1">Select a teacher or coordinator on the left to start conversing.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
