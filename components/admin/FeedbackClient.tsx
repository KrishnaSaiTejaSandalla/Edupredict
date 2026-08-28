"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import { deleteFeedback } from "@/lib/feedback-actions";
import { MessageSquare, LifeBuoy, Send, CheckCircle, Clock, AlertCircle, Trash2 } from "lucide-react";

type FeedbackItem = {
  id: number;
  userId: number;
  schoolId: number;
  title: string;
  message: string;
  category: string;
  createdAt: Date | string;
  userName: string;
  userRole: string;
};

type HelpTicketItem = {
  id: number;
  ticketId: string;
  driverId: number;
  driverName: string;
  driverPhone: string;
  category: string;
  priority: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  replies: Array<{ sender: string; message: string; date: string }>;
  createdAt: string;
};

type Props = {
  initialFeedback: FeedbackItem[];
  initialTickets?: HelpTicketItem[];
};

export default function FeedbackClient({ initialFeedback, initialTickets = [] }: Props) {
  const [activeTab, setActiveTab] = useState<'feedback' | 'tickets'>('feedback');
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>(initialFeedback);
  const [ticketsList, setTicketsList] = useState<HelpTicketItem[]>(initialTickets);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isPending, startTransition] = useTransition();
  const [replyInput, setReplyInput] = useState<{ [ticketId: string]: string }>({});
  const [replyingTicketId, setReplyingTicketId] = useState<string | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<{ id: number; title: string } | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<{ ticketId: string; category: string } | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter, activeTab]);

  const reloadData = async () => {
    try {
      if (activeTab === 'feedback') {
        const res = await fetch("/api/feedback");
        if (res.ok) {
          const data = await res.json();
          setFeedbackList(data);
        }
      } else {
        const res = await fetch("/api/admin/tickets");
        if (res.ok) {
          const resData = await res.json();
          if (resData.success) setTicketsList(resData.data);
        }
      }
    } catch (err) {
      console.error("Failed to refresh data:", err);
    }
  };

  const handleUpdateTicket = async (ticketId: string, newStatus?: string, replyMessage?: string) => {
    setReplyingTicketId(ticketId);
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status: newStatus, replyMessage }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(replyMessage ? "Reply sent & notification broadcast!" : "Ticket status updated.");
        setReplyInput((prev) => ({ ...prev, [ticketId]: "" }));
        await reloadData();
      } else {
        toast.error(data.message || "Failed to update ticket.");
      }
    } catch {
      toast.error("Error updating ticket.");
    } finally {
      setReplyingTicketId(null);
    }
  };

  const handleDeleteClick = (item: FeedbackItem) => {
    setTicketToDelete(null);
    setFeedbackToDelete({ id: item.id, title: item.title });
    setDeleteModalOpen(true);
  };

  const handleTicketDeleteClick = (ticket: HelpTicketItem) => {
    setFeedbackToDelete(null);
    setTicketToDelete({ ticketId: ticket.ticketId, category: ticket.category });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (feedbackToDelete) {
      setDeleteModalOpen(false);
      startTransition(async () => {
        try {
          await deleteFeedback(feedbackToDelete.id);
          toast.success(`Feedback "${feedbackToDelete.title}" deleted.`);
          await reloadData();
        } catch (err: any) {
          toast.error(err.message || "Failed to delete feedback.");
        } finally {
          setFeedbackToDelete(null);
        }
      });
    } else if (ticketToDelete) {
      setDeleteModalOpen(false);
      startTransition(async () => {
        try {
          const res = await fetch(`/api/admin/tickets?ticketId=${ticketToDelete.ticketId}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (data.success) {
            toast.success(`Ticket "${ticketToDelete.ticketId}" deleted.`);
            await reloadData();
          } else {
            toast.error(data.message || "Failed to delete ticket.");
          }
        } catch (err: any) {
          toast.error(err.message || "Failed to delete ticket.");
        } finally {
          setTicketToDelete(null);
        }
      });
    }
  };

  const filteredFeedback = feedbackList.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.userName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredTickets = ticketsList.filter((ticket) => {
    const matchesSearch =
      ticket.ticketId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Support & Feedback Desk</h1>
          <p className="text-sm text-muted-foreground">Manage user feedback and driver partner support tickets in realtime.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border">
          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'feedback' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Feedback ({feedbackList.length})
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'tickets' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LifeBuoy className="w-4 h-4" />
            Driver Help Tickets ({ticketsList.length})
          </button>
        </div>
      </div>

      {activeTab === 'feedback' ? (
        /* FEEDBACK TAB */
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search feedback..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 rounded-xl border bg-background text-sm w-72"
            />
          </div>

          <div className="grid gap-4">
            {filteredFeedback.map((item) => (
              <div key={item.id} className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base">{item.title}</span>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary">
                    {item.category}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{item.message}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>By: {item.userName} ({item.userRole})</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {filteredFeedback.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground border rounded-xl">No feedback found.</div>
            )}
          </div>
        </div>
      ) : (
        /* TICKETS TAB */
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search tickets or drivers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 rounded-xl border bg-background text-sm w-72"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-xl border bg-background text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div className="grid gap-4">
            {filteredTickets.map((ticket) => (
              <div key={ticket.id} className="p-5 rounded-2xl border bg-card text-card-foreground shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-primary">{ticket.ticketId}</span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {ticket.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={ticket.status}
                      onChange={(e) => handleUpdateTicket(ticket.ticketId, e.target.value)}
                      className="text-xs font-bold px-3 py-1 rounded-lg border bg-background"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                    <button
                      onClick={() => handleTicketDeleteClick(ticket)}
                      title="Delete Ticket"
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg border hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Driver: <span className="font-semibold text-foreground">{ticket.driverName}</span> ({ticket.driverPhone})</div>
                  <p className="text-sm font-medium">{ticket.message}</p>
                </div>

                {/* Existing Replies */}
                {ticket.replies && ticket.replies.length > 0 && (
                  <div className="bg-muted/50 rounded-xl p-3 space-y-2 text-xs border">
                    <div className="font-bold text-muted-foreground">Replies & Updates:</div>
                    {ticket.replies.map((reply, i) => (
                      <div key={i} className="space-y-0.5">
                        <span className="font-semibold text-primary">{reply.sender}: </span>
                        <span>{reply.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Admin Reply Box */}
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Type reply to driver..."
                    value={replyInput[ticket.ticketId] || ""}
                    onChange={(e) => setReplyInput({ ...replyInput, [ticket.ticketId]: e.target.value })}
                    className="flex-1 px-3 py-1.5 rounded-lg border text-xs bg-background"
                  />
                  <button
                    disabled={replyingTicketId === ticket.ticketId || !replyInput[ticket.ticketId]?.trim()}
                    onClick={() => handleUpdateTicket(ticket.ticketId, undefined, replyInput[ticket.ticketId])}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Reply
                  </button>
                </div>
              </div>
            ))}

            {filteredTickets.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground border rounded-xl">No help tickets found.</div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title={ticketToDelete ? "Delete Help Ticket" : "Delete Feedback"}
        message={
          ticketToDelete
            ? `Are you sure you want to delete ticket "${ticketToDelete.ticketId}"? This will permanently remove it from both Admin and Driver apps.`
            : `Are you sure you want to delete "${feedbackToDelete?.title}"?`
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
