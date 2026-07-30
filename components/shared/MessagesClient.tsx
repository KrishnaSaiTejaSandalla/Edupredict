'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ChatContact } from '@/lib/message-actions';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

/* ── WhatsApp-style date / time helpers ── */
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDateSeparator(date: Date): string {
  const now = new Date();
  if (isSameDay(date, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatLastMessageAt(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  if (isSameDay(date, now)) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Yesterday';
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 7 * 24 * 60 * 60 * 1000) return date.toLocaleDateString(undefined, { weekday: 'long' });
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
/* ── end helpers ── */

type Message = {
  id: number;
  senderId: number;
  receiverId: number;
  message: string;
  attachmentUrl: string | null;
  mediaType: string | null;
  mediaSize: number | null;
  fileName: string | null;
  isRead: boolean;
  createdAt: string;
};

type Props = {
  currentUserId: number;
  currentUserRole: string;
  initialContacts: ChatContact[];
};

export default function MessagesClient({ currentUserId, currentUserRole, initialContacts }: Props) {
  const [contacts, setContacts] = useState<ChatContact[]>(initialContacts);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(initialContacts[0] || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const cacheRef = useRef<Record<number, Message[]>>({});

  // Search and Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [contactPage, setContactPage] = useState(1);
  const contactsPerPage = 8;

  // Message log page
  const [messagesOffset, setMessagesOffset] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const messagesLimit = 30;

  // Form input states
  const [typedMessage, setTypedMessage] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<{
    url: string;
    fileName: string;
    mediaSize: number;
    mediaType: string;
  } | null>(null);

  // Custom Modal States
  const [showMenu, setShowMenu] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteMsgConfirmOpen, setDeleteMsgConfirmOpen] = useState(false);
  const [msgToDelete, setMsgToDelete] = useState<Message | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Emoji Tray State
  const [showEmojiTray, setShowEmojiTray] = useState(false);

  // Shared Media Modal
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [sharedMedia, setSharedMedia] = useState<any[]>([]);

  // Image Zoom Modal
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Voice note recording states
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Filter contacts by search
  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalContactPages = Math.ceil(filteredContacts.length / contactsPerPage) || 1;
  const paginatedContacts = filteredContacts.slice(
    (contactPage - 1) * contactsPerPage,
    contactPage * contactsPerPage
  );

  // Fetch message history for selected contact (returns latest first, so we reverse it)
  const fetchMessages = async (contactId: number, append: boolean = false) => {
    // Snappy loading: load from cache immediately if available
    if (!append && cacheRef.current[contactId]) {
      setMessages(cacheRef.current[contactId]);
    }

    try {
      const currentOffset = append ? messagesOffset + messagesLimit : 0;
      const res = await fetch(
        `/api/messages/history?otherUserId=${contactId}&limit=${messagesLimit}&offset=${currentOffset}`,
        {
          headers: { 'x-role': currentUserRole }
        }
      );
      if (res.ok) {
        const data: Message[] = await res.json();

        if (data.length < messagesLimit) {
          setHasMoreMessages(false);
        } else {
          setHasMoreMessages(true);
        }

        // WhatsApp Style: oldest first, so we reverse the retrieved page
        const reversed = [...data].reverse();

        if (append) {
          // Prepend older messages to top, preserve scroll offset
          const container = scrollContainerRef.current;
          const oldScrollHeight = container ? container.scrollHeight : 0;

          setMessages((prev) => {
            const updated = [...reversed, ...prev];
            cacheRef.current[contactId] = updated;
            return updated;
          });
          setMessagesOffset(currentOffset);

          setTimeout(() => {
            if (container) {
              container.scrollTop = container.scrollHeight - oldScrollHeight;
            }
          }, 50);
        } else {
          setMessages(reversed);
          cacheRef.current[contactId] = reversed;
          setMessagesOffset(0);
          scrollToBottom();
        }
      }
    } catch (e) {
      console.error("Failed to load message history:", e);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Mark messages read
  const markAsRead = async (contactId: number) => {
    try {
      await fetch('/api/messages/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': currentUserRole
        },
        body: JSON.stringify({ senderId: contactId }),
      });

      // Update unread count locally
      setContacts((prev) =>
        prev.map((c) => (c.id === contactId ? { ...c, unreadCount: 0 } : c))
      );

      // Re-hydrate global unread count
      if (typeof window !== "undefined" && (window as any).__ep_hydrate_unread) {
        (window as any).__ep_hydrate_unread();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Switch chat
  const handleSelectContact = (contact: ChatContact) => {
    setSelectedContact(contact);
    setMessages([]);
    setMessagesOffset(0);
    setHasMoreMessages(true);
    setTypedMessage("");
    setAttachmentUrl("");
    setUploadedMedia(null);
    setShowAttachmentInput(false);
    setShowEmojiTray(false);
  };

  // Fetch messages initially on selected contact
  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.id);
      markAsRead(selectedContact.id);
    }
  }, [selectedContact?.id]);

  // Audio recording timer effect
  useEffect(() => {
    if (isRecordingAudio) {
      setRecordingSeconds(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, [isRecordingAudio]);

  // Listen to SSE updates via custom window events
  useEffect(() => {
    const handleIncomingMessage = (e: Event) => {
      const customEvent = e as CustomEvent;
      const msg: any = customEvent.detail;

      // Real-time Clear Conversation event
      if (msg.type === "clear") {
        if (selectedContact) {
          setMessages([]);
          cacheRef.current[selectedContact.id] = [];
        }
        return;
      }

      // Real-time Delete Conversation event
      if (msg.type === "delete") {
        setContacts((prev) => prev.filter((c) => c.id !== msg.senderId));
        if (selectedContact && selectedContact.id === msg.senderId) {
          setSelectedContact(null);
          setMessages([]);
        }
        delete cacheRef.current[msg.senderId];
        return;
      }

      // Real-time Delete Single Message event
      if (msg.type === "delete-message") {
        setMessages((prev) => {
          const updated = prev.filter((m) => m.id !== msg.messageId);
          if (selectedContact) cacheRef.current[selectedContact.id] = updated;
          return updated;
        });
        return;
      }

      // Update contacts list lastMessage snippet
      setContacts((prev) => {
        const updated = prev.map((c) => {
          if (c.id === msg.senderId || c.id === msg.receiverId) {
            const isSenderSelected = selectedContact?.id === msg.senderId;
            return {
              ...c,
              lastMessage: msg.message,
              lastMessageAt: msg.createdAt,
              unreadCount: (c.id === msg.senderId && !isSenderSelected) ? (c.unreadCount || 0) + 1 : (c.unreadCount || 0)
            };
          }
          return c;
        });

        // Re-sort: latest message first
        return [...updated].sort((a, b) => {
          if (!a.lastMessageAt) return 1;
          if (!b.lastMessageAt) return -1;
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        });
      });

      // If the incoming message belongs to the current open chat, append it to chronological list bottom
      if (selectedContact && (msg.senderId === selectedContact.id || msg.receiverId === selectedContact.id)) {
        setMessages((prev) => {
          // Check if it already exists by database ID
          const exists = prev.some((m) => m.id === msg.id);
          if (exists) return prev;

          // Check if there is an optimistic message in prev with the same sender, message, and within 10 seconds of creation
          const matchingOptimistic = prev.find(
            (m) =>
              m.id < 0 &&
              m.senderId === msg.senderId &&
              m.message === msg.message &&
              m.attachmentUrl === msg.attachmentUrl &&
              Math.abs(new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 10000
          );

          let updated: Message[];
          if (matchingOptimistic) {
            // Swap the optimistic message immediately with the real message!
            updated = prev.map((m) => m.id === matchingOptimistic.id ? msg : m);
          } else {
            // Otherwise, normal append
            const container = scrollContainerRef.current;
            const isAtBottom = container ? (container.scrollHeight - container.scrollTop - container.clientHeight < 200) : true;
            if (isAtBottom) scrollToBottom();

            updated = [...prev, msg];
          }
          cacheRef.current[selectedContact.id] = updated;
          return updated;
        });

        // Mark read immediately
        if (msg.senderId === selectedContact.id) {
          markAsRead(selectedContact.id);
        }
      } else {
        // Update background contact's cache
        const otherId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
        if (cacheRef.current[otherId]) {
          const exists = cacheRef.current[otherId].some((m) => m.id === msg.id);
          if (!exists) {
            cacheRef.current[otherId] = [...cacheRef.current[otherId], msg];
          }
        }
      }
    };

    window.addEventListener('ep-message', handleIncomingMessage);
    return () => window.removeEventListener('ep-message', handleIncomingMessage);
  }, [selectedContact]);

  // File upload change handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFileAndPrepare(file);
  };

  const uploadFileAndPrepare = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/messages/upload");
    xhr.setRequestHeader("x-role", currentUserRole);

    xhr.upload.addEventListener("progress", (evt) => {
      if (evt.lengthComputable) {
        const pct = Math.round((evt.loaded / evt.total) * 100);
        setUploadProgress(pct);
      }
    });

    xhr.addEventListener("load", () => {
      setUploadProgress(null);
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText);
        // Automatically send the attachment immediately (WhatsApp standard)
        sendPreparedMessage("", res);
      } else {
        toast.error("Failed to upload file.");
      }
    });

    xhr.addEventListener("error", () => {
      setUploadProgress(null);
      toast.error("Upload failed.");
    });

    xhr.send(formData);
  };

  // Voice recording handlers
  const toggleAudioRecording = async () => {
    if (isRecordingAudio) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecordingAudio(false);
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" });

        stream.getTracks().forEach((track) => track.stop());

        const formData = new FormData();
        formData.append("file", file);

        setUploadProgress(0);
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/messages/upload");
        xhr.setRequestHeader("x-role", currentUserRole);

        xhr.upload.addEventListener("progress", (evt) => {
          if (evt.lengthComputable) {
            setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          setUploadProgress(null);
          if (xhr.status === 200) {
            const res = JSON.parse(xhr.responseText);
            sendPreparedMessage("", res);
          } else {
            toast.error("Failed to upload voice note.");
          }
        });

        xhr.addEventListener("error", () => {
          setUploadProgress(null);
          toast.error("Failed to upload voice note.");
        });

        xhr.send(formData);
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      toast.info("Recording voice note... Click microphone button again to stop and send.");
    } catch (err) {
      console.error("Failed to start voice recording:", err);
      toast.error("Could not access microphone.");
    }
  };

  // Clear conversation handler (custom modal)
  const handleClearConversation = async () => {
    if (!selectedContact) return;
    setClearConfirmOpen(true);
  };

  const confirmClearConversation = async () => {
    if (!selectedContact) return;
    setIsProcessingAction(true);

    try {
      const res = await fetch("/api/messages/clear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-role": currentUserRole,
        },
        body: JSON.stringify({ otherUserId: selectedContact.id }),
      });

      if (res.ok) {
        setMessages([]);
        toast.success("Conversation cleared.");
      } else {
        toast.error("Failed to clear conversation.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred.");
    } finally {
      setIsProcessingAction(false);
      setClearConfirmOpen(false);
    }
  };

  // Delete conversation handler (custom modal)
  const handleDeleteConversation = async () => {
    if (!selectedContact) return;
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteConversation = async () => {
    if (!selectedContact) return;
    setIsProcessingAction(true);

    try {
      const res = await fetch("/api/messages/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-role": currentUserRole,
        },
        body: JSON.stringify({ otherUserId: selectedContact.id }),
      });

      if (res.ok) {
        setMessages([]);
        setContacts((prev) => prev.filter((c) => c.id !== selectedContact.id));
        setSelectedContact(null);
        toast.success("Conversation deleted.");
      } else {
        toast.error("Failed to delete conversation.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred.");
    } finally {
      setIsProcessingAction(false);
      setDeleteConfirmOpen(false);
    }
  };

  // Delete message handler
  const handleDeleteMessage = (msg: Message) => {
    setMsgToDelete(msg);
    setDeleteMsgConfirmOpen(true);
  };

  const confirmDeleteMessage = async () => {
    if (!msgToDelete) return;
    setIsProcessingAction(true);

    try {
      const res = await fetch("/api/messages/delete-single", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-role": currentUserRole,
        },
        body: JSON.stringify({ messageId: msgToDelete.id }),
      });

      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== msgToDelete.id));
        toast.success("Message deleted.");
      } else {
        toast.error("Failed to delete message.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred.");
    } finally {
      setIsProcessingAction(false);
      setDeleteMsgConfirmOpen(false);
      setMsgToDelete(null);
    }
  };

  // View shared media list handler
  const handleViewSharedMedia = async () => {
    if (!selectedContact) return;
    setShowMenu(false);

    try {
      const res = await fetch(`/api/messages/media?otherUserId=${selectedContact.id}`, {
        headers: { "x-role": currentUserRole },
      });
      if (res.ok) {
        const data = await res.json();
        setSharedMedia(data);
        setShowMediaModal(true);
      } else {
        toast.error("Failed to fetch shared media.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred.");
    }
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendPreparedMessage(typedMessage, null);
  };

  const sendPreparedMessage = async (textToSend: string, mediaInfo: any) => {
    if (!selectedContact) return;
    if (!textToSend.trim() && !mediaInfo) return;

    setIsSending(true);

    // Generate guaranteed unique temporary UUID for optimistic rendering
    const tempId = -Math.floor(Math.random() * 10000000);
    const optimisticMsg: Message = {
      id: tempId,
      senderId: currentUserId,
      receiverId: selectedContact.id,
      message: textToSend,
      attachmentUrl: mediaInfo?.url || null,
      mediaType: mediaInfo?.mediaType || null,
      mediaSize: mediaInfo?.mediaSize || null,
      fileName: mediaInfo?.fileName || null,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // Optimistically append the message immediately (WhatsApp style: bottom of chronological list)
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();
    setTypedMessage("");

    try {
      const payload: any = {
        receiverId: selectedContact.id,
        message: textToSend,
        attachmentUrl: mediaInfo?.url || undefined,
      };

      if (mediaInfo) {
        payload.mediaType = mediaInfo.mediaType;
        payload.mediaSize = mediaInfo.mediaSize;
        payload.fileName = mediaInfo.fileName;
      }

      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': currentUserRole
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data: Message = await res.json();

        // Swap temporary message with real database message (preserving layout)
        setMessages((prev) => {
          const alreadyAdded = prev.some((m) => m.id === data.id);
          if (alreadyAdded) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((m) => m.id === tempId ? data : m);
        });
        scrollToBottom();

        // Update contact last message details in parallel
        setContacts((prev) => {
          const updated = prev.map((c) =>
            c.id === selectedContact.id
              ? { ...c, lastMessage: data.message || "Sent an attachment 📁", lastMessageAt: data.createdAt }
              : c
          );
          return [...updated].sort((a, b) => {
            if (!a.lastMessageAt) return 1;
            if (!b.lastMessageAt) return -1;
            return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
          });
        });
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to send message.");
        // Rollback optimistic update
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send message.");
      // Rollback optimistic update
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsSending(false);
      setShowAttachmentInput(false);
      setShowEmojiTray(false);
    }
  };

  // Textarea enter handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (typedMessage.trim()) {
        sendPreparedMessage(typedMessage, null);
      }
    }
  };

  // Auto-grow textarea height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [typedMessage]);

  // Insert emoji
  const handleEmojiClick = (emoji: string) => {
    setTypedMessage((prev) => prev + emoji);
    setShowEmojiTray(false);
    textareaRef.current?.focus();
  };

  // Group messages chronologically with date separators
  const renderMessageList = () => {
    let lastDateStr = "";

    return messages.map((msg, idx) => {
      const self = msg.senderId === currentUserId;

      // Determine if a date separator is needed (WhatsApp-style)
      const msgDate = new Date(msg.createdAt);
      const dateStr = formatDateSeparator(msgDate);

      const showDateSeparator = dateStr !== lastDateStr;
      lastDateStr = dateStr;

      // Group consecutive bubbles: tighter spacing if same sender
      const nextMsg = messages[idx + 1];
      const sameNextSender = nextMsg && nextMsg.senderId === msg.senderId;

      return (
        <div key={msg.id} className="w-full flex flex-col">
          {showDateSeparator && (
            <div className="w-full flex justify-center my-4 select-none">
              <span className="bg-hover border border-theme px-3.5 py-1 rounded-full text-[9px] font-bold text-secondary tracking-wide shadow-sm">
                {dateStr}
              </span>
            </div>
          )}

          <div
            className={[
              "group relative flex flex-col max-w-[70%] transition-all duration-150",
              self ? "self-end items-end" : "self-start items-start",
              sameNextSender ? "mb-1" : "mb-3"
            ].join(" ")}
          >
            {/* Bubble */}
            <div
              className={[
                "rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm relative group",
                self
                  ? "bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-tr-none"
                  : "bg-hover/80 border border-theme text-primary rounded-tl-none"
              ].join(" ")}
            >
              {/* Deletion overlay trigger inside bubbles */}
              <button
                type="button"
                onClick={() => handleDeleteMessage(msg)}
                className={[
                  "absolute -top-2.5 p-1 rounded-lg border border-theme bg-surface hover:bg-hover opacity-0 group-hover:opacity-100 transition shadow-md z-10 text-[9px] text-rose-400 font-bold",
                  self ? "-left-8" : "-right-8"
                ].join(" ")}
                title="Delete Message"
              >
                🗑️
              </button>

              {msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}

              {msg.attachmentUrl && (() => {
                const ext = msg.attachmentUrl.split('.').pop()?.toLowerCase() || '';
                const isImg = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
                const isVid = ['mp4', 'mov', 'webm', 'ogg'].includes(ext);
                const isAud = ['mp3', 'wav', 'm4a', 'webm', 'ogg'].includes(ext);
                const isPdf = ext === 'pdf';

                if (isImg) {
                  return (
                    <div
                      onClick={() => setZoomedImage(msg.attachmentUrl)}
                      className="mt-1.5 rounded-xl overflow-hidden border border-theme max-w-[260px] cursor-pointer hover:opacity-90 transition shadow-inner"
                    >
                      <img src={msg.attachmentUrl} alt="attachment" className="w-full h-auto object-cover max-h-[180px]" />
                    </div>
                  );
                }

                if (isVid) {
                  return (
                    <div className="mt-1.5 rounded-xl overflow-hidden border border-theme max-w-[280px]">
                      <video src={msg.attachmentUrl} controls className="w-full h-auto max-h-[200px]" />
                    </div>
                  );
                }

                if (isAud) {
                  return (
                    <div className="mt-1.5 rounded-xl overflow-hidden border border-theme p-2 bg-surface/50 w-full min-w-[220px] flex items-center gap-2">
                      <audio src={msg.attachmentUrl} controls className="w-full h-7 shrink-0" />
                    </div>
                  );
                }

                const displaySize = msg.mediaSize ? `${Math.round(msg.mediaSize / 1024)} KB` : "";

                return (
                  <div className={[
                    "mt-1.5 rounded-xl p-2.5 flex items-center gap-3 border text-[10px] min-w-[220px]",
                    self ? "bg-white/10 border-white/20" : "bg-surface border-theme"
                  ].join(" ")}>
                    <span className="text-xl shrink-0">{isPdf ? "📄" : "📁"}</span>
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold block truncate text-primary">{msg.fileName || msg.attachmentUrl.split("/").pop()}</span>
                      <span className="text-[8px] text-muted uppercase tracking-wider">{displaySize ? `${displaySize} • ` : ""}{ext} file</span>
                    </div>
                    <a
                      href={msg.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={[
                        "font-bold hover:underline shrink-0 ml-auto px-2.5 py-1 rounded border bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                      ].join(" ")}
                    >
                      Open
                    </a>
                  </div>
                );
              })()}
            </div>

            <span className="text-[8px] text-muted mt-1 px-1">
              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 overflow-hidden text-primary">
      {/* Left panel: Contacts list */}
      <div className="w-[340px] border border-theme bg-surface rounded-2xl flex flex-col shrink-0 min-h-0 overflow-hidden shadow-sm">
        {/* Contact search */}
        <div className="p-4 border-b border-theme space-y-3 shrink-0">
          <h2 className="text-sm font-bold tracking-wide">Conversations</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setContactPage(1);
              }}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-theme bg-hover text-xs text-primary focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition"
            />
            <svg viewBox="0 0 24 24" className="absolute left-3.5 top-3 h-4 w-4 text-muted fill-none stroke-current" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
            </svg>
          </div>
        </div>

        {/* Contacts Scroller */}
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide divide-y divide-theme">
          {paginatedContacts.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">No contacts found.</div>
          ) : (
            paginatedContacts.map((contact) => {
              const active = selectedContact?.id === contact.id;
              const hasUnread = typeof contact.unreadCount === "number" && contact.unreadCount > 0;
              const initials = contact.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

              return (
                <button
                  key={`contact-${contact.id}`}
                  onClick={() => handleSelectContact(contact)}
                  className={[
                    "w-full text-left p-4 transition flex items-start gap-3 hover:bg-hover",
                    active ? "bg-hover/70 border-l-4 border-cyan-500" : ""
                  ].join(" ")}
                >
                  {/* Avatar */}
                  {contact.profileImageUrl ? (
                    <div className="relative h-10 w-10 rounded-xl overflow-hidden shrink-0 border border-theme">
                      <img src={contact.profileImageUrl} alt={contact.name} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-cyan-500/20 border border-cyan-500/30 text-xs font-bold text-cyan-400 shrink-0">
                      {initials}
                    </span>
                  )}

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold truncate text-primary">{contact.name}</span>
                      {contact.lastMessageAt && (
                        <span className="text-[9px] text-muted whitespace-nowrap">
                          {formatLastMessageAt(contact.lastMessageAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-flex rounded bg-cyan-500/15 px-1.5 py-0.5 text-[8px] font-bold text-cyan-400 uppercase tracking-wider">
                        {contact.role}
                      </span>
                    </div>

                    {contact.lastMessage && (
                      <p className="text-[10px] text-muted truncate mt-1.5 leading-relaxed">{contact.lastMessage}</p>
                    )}
                  </div>

                  {/* Unread badge */}
                  {hasUnread && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[9px] font-bold text-white shrink-0 self-center">
                      {contact.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Contact Pagination */}
        {totalContactPages > 1 && (
          <div className="p-3 border-t border-theme flex items-center justify-between text-[10px] text-muted shrink-0 bg-hover/20">
            <button
              onClick={() => setContactPage((p) => Math.max(1, p - 1))}
              disabled={contactPage === 1}
              className="px-2 py-1 border border-theme rounded hover:bg-hover disabled:opacity-40"
            >
              Prev
            </button>
            <span>
              Page {contactPage} of {totalContactPages}
            </span>
            <button
              onClick={() => setContactPage((p) => Math.min(totalContactPages, p + 1))}
              disabled={contactPage === totalContactPages}
              className="px-2 py-1 border border-theme rounded hover:bg-hover disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Right panel: Chat workspace */}
      <div className="flex-1 border border-theme bg-surface rounded-2xl flex flex-col overflow-hidden shadow-sm relative">
        {selectedContact ? (
          <>
            {/* Header info */}
            <div className="p-4 border-b border-theme flex items-center justify-between shrink-0 bg-hover/10 relative">
              <div className="flex items-center gap-3">
                {selectedContact.profileImageUrl ? (
                  <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0 border border-theme">
                    <img src={selectedContact.profileImageUrl} alt={selectedContact.name} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-cyan-500/20 border border-cyan-500/30 text-xs font-bold text-cyan-400 shrink-0">
                    {selectedContact.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div>
                  <h3 className="text-xs font-bold text-primary">{selectedContact.name}</h3>
                  <span className="text-[9px] text-muted uppercase tracking-wider mt-0.5 block">{selectedContact.role}</span>
                </div>
              </div>

              {/* Menu options Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenu(p => !p)}
                  className="h-10 w-10 flex items-center justify-center rounded-xl border border-theme bg-hover hover:bg-hover/80 text-muted transition duration-150"
                  title="Menu options"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                    <circle cx="12" cy="6" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="18" r="2" />
                  </svg>
                </button>

                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 mt-2 w-48 rounded-xl border border-theme bg-surface p-1 shadow-xl z-30 text-xs font-semibold animate-in fade-in slide-in-from-top-1">
                      <button
                        onClick={handleClearConversation}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-hover text-primary transition"
                      >
                        Clear Conversation
                      </button>
                      <button
                        onClick={handleDeleteConversation}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-hover text-rose-400 transition"
                      >
                        Delete Conversation
                      </button>
                      <button
                        onClick={handleViewSharedMedia}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-hover text-primary transition"
                      >
                        View Shared Media
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          toast.info("Disappearing Messages (Coming Soon!)");
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-hover text-muted transition"
                      >
                        Disappearing Messages
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          toast.info(`Chatting with ${selectedContact.name} (${selectedContact.role})`);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-hover text-primary transition"
                      >
                        Conversation Info
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Message Area */}
            <div
              ref={scrollContainerRef}
              className="flex-1 p-6 overflow-y-auto min-h-0 space-y-4 scrollbar-thin bg-base/20"
            >
              {/* Load Older Messages */}
              {hasMoreMessages && messages.length >= messagesLimit && (
                <button
                  onClick={() => fetchMessages(selectedContact.id, true)}
                  className="mx-auto block text-[10px] font-bold text-cyan-400 hover:underline py-2 mb-4"
                >
                  Load Older Messages 🔄
                </button>
              )}

              {/* Chronological message items */}
              {renderMessageList()}

              <div ref={messagesEndRef} />
            </div>

            {/* Upload progress indicator */}
            {uploadProgress !== null && (
              <div className="mx-4 mb-2 p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-between text-[10px] text-cyan-400 font-medium animate-pulse shrink-0">
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading attachment file...
                </span>
                <span className="tabular-nums font-bold">{uploadProgress}%</span>
              </div>
            )}

            {/* Input Composer Box */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-theme shrink-0 bg-hover/10 space-y-3 relative">
              {/* Emoji tray dropdown */}
              {showEmojiTray && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowEmojiTray(false)} />
                  <div className="absolute bottom-full left-4 mb-2 p-2.5 bg-surface border border-theme rounded-xl shadow-xl z-20 flex gap-2 max-w-[280px] flex-wrap animate-in fade-in slide-in-from-bottom-2">
                    {["👍", "❤️", "😂", "😮", "😢", "🙏", "🚀", "🔥", "🎉", "💬", "😊", "👀", "💯", "✅", "❌"].map((emoji) => (
                      <button
                        key={`emoji-${emoji}`}
                        type="button"
                        onClick={() => handleEmojiClick(emoji)}
                        className="text-lg hover:scale-125 transition duration-100"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {showAttachmentInput && (
                <div className="flex gap-2 items-center bg-surface border border-theme p-2.5 rounded-xl animate-in fade-in zoom-in-95 duration-100">
                  <input
                    type="file"
                    id="chat-file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById("chat-file-upload")?.click()}
                    disabled={isSending || uploadProgress !== null}
                    className="h-9 px-3 rounded-lg border border-theme bg-hover hover:bg-hover/80 text-primary text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    📁 Choose File
                  </button>

                  <button
                    type="button"
                    onClick={toggleAudioRecording}
                    disabled={isSending || uploadProgress !== null}
                    className={[
                      "h-9 px-3 rounded-lg border flex items-center gap-1.5 text-xs font-semibold transition duration-150 disabled:opacity-50",
                      isRecordingAudio ? "border-rose-500 bg-rose-500/10 text-rose-400" : "border-theme bg-hover text-primary"
                    ].join(" ")}
                  >
                    🎤 {isRecordingAudio ? `Recording (${recordingSeconds}s)... Stop ⏹️` : "Voice Note"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentUrl("");
                      setUploadedMedia(null);
                      setShowAttachmentInput(false);
                    }}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-theme hover:bg-hover text-muted text-xs font-bold ml-auto"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="flex items-end gap-3">
                {/* Emoji button */}
                <button
                  type="button"
                  onClick={() => setShowEmojiTray(p => !p)}
                  className="h-10 w-10 flex items-center justify-center rounded-xl border border-theme bg-hover hover:bg-hover/80 text-muted transition shrink-0"
                  title="Insert Emoji"
                >
                  😊
                </button>

                {/* Attachment toggle */}
                <button
                  type="button"
                  onClick={() => setShowAttachmentInput(prev => !prev)}
                  title="Add attachment"
                  className={[
                    "h-10 w-10 flex items-center justify-center rounded-xl border transition shrink-0",
                    showAttachmentInput || attachmentUrl
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                      : "border-theme bg-hover hover:bg-hover/80 text-muted"
                  ].join(" ")}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                  </svg>
                </button>

                {/* Growing Textarea */}
                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder={`Type a message to ${selectedContact.name}...`}
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 min-h-[40px] max-h-[120px] py-3 px-4 rounded-xl border border-theme bg-hover text-xs text-primary focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition resize-none scrollbar-none"
                />

                <button
                  type="submit"
                  disabled={isSending || uploadProgress !== null || (!typedMessage.trim() && !attachmentUrl.trim())}
                  className="h-10 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-40 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 shrink-0"
                >
                  {isSending ? "..." : "Send"}
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current shrink-0">
                    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                  </svg>
                </button>
              </div>
            </form>

            {/* Reusable Custom Confirmation Modals inside Chat Workspace */}
            <ConfirmationModal
              isOpen={clearConfirmOpen}
              title="Clear Conversation?"
              message="This will permanently remove all messages in this conversation. This action cannot be undone."
              confirmLabel="Clear Chat"
              variant="danger"
              isConfirming={isProcessingAction}
              onConfirm={confirmClearConversation}
              onCancel={() => setClearConfirmOpen(false)}
              inPlace={true}
            />

            <ConfirmationModal
              isOpen={deleteConfirmOpen}
              title="Delete Conversation?"
              message="Deleting this conversation will remove all messages and participants for you. This action cannot be undone."
              confirmLabel="Delete"
              variant="danger"
              isConfirming={isProcessingAction}
              onConfirm={confirmDeleteConversation}
              onCancel={() => setDeleteConfirmOpen(false)}
              inPlace={true}
            />

            <ConfirmationModal
              isOpen={deleteMsgConfirmOpen}
              title="Delete Message?"
              message="This will permanently delete this message for both participants. This action cannot be undone."
              confirmLabel="Delete Message"
              variant="danger"
              isConfirming={isProcessingAction}
              onConfirm={confirmDeleteMessage}
              onCancel={() => {
                setDeleteMsgConfirmOpen(false);
                setMsgToDelete(null);
              }}
              inPlace={true}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-2 bg-base/20">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <svg viewBox="0 0 24 24" className="h-8 w-8 fill-none stroke-current" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
            </span>
            <h3 className="text-xs font-bold">Your Inbox</h3>
            <p className="text-[10px] text-muted max-w-xs">Select a contact from the list on the left to start a real-time conversation.</p>
          </div>
        )}
      </div>

      {/* Shared Media Modal */}
      {showMediaModal && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-theme rounded-2xl max-w-xl w-full p-6 flex flex-col h-[500px]">
            <div className="flex justify-between items-center pb-4 border-b border-theme">
              <h2 className="text-sm font-bold">Shared Media & Documents</h2>
              <button
                onClick={() => setShowMediaModal(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-theme hover:bg-hover text-muted text-xs font-bold"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 pr-1 scrollbar-hide space-y-4">
              {sharedMedia.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted">
                  No shared files in this conversation.
                </div>
              ) : (
                sharedMedia.map((item, idx) => {
                  return (
                    <div key={`media-${item.id || idx}`} className="rounded-xl border border-theme p-3 bg-hover/20 flex gap-3 items-center">
                      <span className="text-2xl shrink-0">
                        {item.mediaType === "image" ? "🖼️" : item.mediaType === "video" ? "🎥" : item.mediaType === "audio" ? "🎵" : "📄"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate text-primary">{item.fileName}</p>
                        <p className="text-[9px] text-muted mt-0.5">
                          {item.mediaSize ? `${Math.round(item.mediaSize / 1024)} KB` : "Unknown Size"} • {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <a
                        href={item.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-cyan-400 hover:underline border border-cyan-500/20 bg-cyan-500/10 rounded px-2.5 py-1"
                      >
                        Open
                      </a>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal overlay */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-slate-950/80 z-[100000] flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl border border-theme">
            <img src={zoomedImage} alt="Enlarged shared view" className="w-full h-auto max-h-[85vh] object-contain" />
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-slate-900/60 text-white hover:bg-slate-900/80 flex items-center justify-center text-lg font-bold shadow-lg"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
