"use client";

import { useState, useEffect } from "react";

type Announcement = {
  id: number;
  announcementId: string;
  title: string | null;
  message: string | null;
  priority: string | null;
  createdAt: string;
  attachmentUrl?: string;
};

type Props = {
  initialAnnouncements: Announcement[];
};

export default function ParentAnnouncementsClient({ initialAnnouncements }: Props) {
  const [announcements] = useState<Announcement[]>(initialAnnouncements);

  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected announcement for detail modal
  const [selectedAnn, setSelectedAnn] = useState<Announcement | null>(null);

  // Filter
  const filteredAnnouncements = announcements.filter((row) => {
    const matchesSearch =
      (row.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.message || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDate = !dateFilter || row.createdAt.startsWith(dateFilter);

    return matchesSearch && matchesDate;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFilter]);

  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage) || 1;
  const paginatedAnnouncements = filteredAnnouncements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPriorityBadge = (prio: string | null) => {
    switch (prio?.toLowerCase()) {
      case "high":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    }
  };

  const isImage = (url: string) => {
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
  };

  const isVideo = (url: string) => {
    return /\.(mp4|webm|ogg)$/i.test(url);
  };

  const isPdf = (url: string) => {
    return /\.pdf$/i.test(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
          Communication
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          School Announcements
        </h1>
        <p className="mt-2 text-sm text-secondary">
          Stay updated with direct official circulars, media releases, and notices published by the Admin.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-theme pb-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search circulars..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-theme bg-surface pl-9 pr-3 text-xs text-primary outline-none focus:border-cyan-500 placeholder:text-muted transition-all"
            />
          </div>

          {/* Date Selector */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-10 rounded-xl border border-theme bg-surface px-3 text-xs text-primary outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Announcements List */}
      {paginatedAnnouncements.length === 0 ? (
        <div className="rounded-2xl border border-theme bg-surface p-12 text-center text-sm font-medium text-muted">
          No circulars or announcements found.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {paginatedAnnouncements.map((row) => (
            <div
              key={row.id}
              onClick={() => setSelectedAnn(row)}
              className="group rounded-2xl border border-theme bg-surface hover:bg-hover hover:-translate-y-1 p-6 shadow-sm transition duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-2">
                  <span className={`rounded border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${getPriorityBadge(row.priority)}`}>
                    {row.priority || "medium"}
                  </span>
                  <span className="text-[10px] text-muted font-semibold">
                    {new Date(row.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>

                <h3 className="text-base font-bold text-primary group-hover:text-cyan-400 transition truncate">
                  {row.title}
                </h3>

                <p className="text-xs text-secondary leading-relaxed line-clamp-3 whitespace-pre-wrap">
                  {row.message}
                </p>

                {row.attachmentUrl && (
                  <div className="rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-2 flex items-center gap-2 text-[10px] font-bold text-cyan-400">
                    <span>📄</span>
                    <span className="truncate max-w-[200px]">{row.attachmentUrl.split("/").pop()}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-subtle pt-4 text-right">
                <span className="text-[10px] font-bold text-cyan-400 group-hover:underline">Read Full Notice →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs font-semibold text-muted pt-4 border-t border-theme">
          <div>
            {currentPage > 1 && (
              <button
                onClick={() => setCurrentPage((p) => p - 1)}
                className="rounded-xl border border-theme bg-surface px-4 py-2 hover:bg-hover transition"
              >
                ← Previous
              </button>
            )}
          </div>
          <span>
            Page {currentPage} of {totalPages} ({filteredAnnouncements.length} announcements)
          </span>
          <div>
            {currentPage < totalPages && (
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                className="rounded-xl border border-theme bg-surface px-4 py-2 hover:bg-hover transition"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Detailed Modal */}
      {selectedAnn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-theme bg-surface p-6 sm:p-8 shadow-2xl animate-in scale-in duration-150 scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start pb-4 border-b border-subtle">
              <div>
                <span className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getPriorityBadge(selectedAnn.priority)}`}>
                  {selectedAnn.priority || "medium"}
                </span>
                <h2 className="text-xl font-bold text-primary mt-2">{selectedAnn.title}</h2>
                <p className="text-[10px] text-muted mt-1 font-semibold">
                  Published: {new Date(selectedAnn.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedAnn(null)}
                className="rounded-lg p-1.5 hover:bg-hover text-muted hover:text-primary transition"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="mt-6 space-y-6">
              <div className="text-xs text-secondary leading-relaxed whitespace-pre-wrap">
                {selectedAnn.message}
              </div>

              {/* Attachment Display */}
              {selectedAnn.attachmentUrl && (
                <div className="space-y-3 border-t border-subtle pt-6">
                  <h4 className="text-[10px] uppercase font-bold text-muted tracking-wider">Attachment circular</h4>

                  {/* Media Embed checks */}
                  {isImage(selectedAnn.attachmentUrl) && (
                    <div className="rounded-2xl border border-theme overflow-hidden bg-base max-h-72 flex justify-center items-center">
                      <img src={selectedAnn.attachmentUrl} alt="Circular attachment" className="object-contain max-h-72 w-full" />
                    </div>
                  )}

                  {isVideo(selectedAnn.attachmentUrl) && (
                    <div className="rounded-2xl border border-theme overflow-hidden bg-base">
                      <video controls className="w-full max-h-72">
                        <source src={selectedAnn.attachmentUrl} />
                      </video>
                    </div>
                  )}

                  {isPdf(selectedAnn.attachmentUrl) && (
                    <div className="rounded-2xl border border-theme p-4 bg-base flex items-center justify-between text-xs">
                      <span className="font-semibold text-primary truncate max-w-[300px]">
                        {selectedAnn.attachmentUrl.split("/").pop()}
                      </span>
                      <a
                        href={selectedAnn.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 font-bold hover:underline"
                      >
                        Preview PDF 👁️
                      </a>
                    </div>
                  )}

                  {/* Universal Download CTA */}
                  <div className="flex justify-between items-center bg-hover/20 rounded-xl p-3 border border-theme text-xs">
                    <span className="truncate max-w-[350px] font-medium text-secondary">{selectedAnn.attachmentUrl.split("/").pop()}</span>
                    <a
                      href={selectedAnn.attachmentUrl}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl btn-blue px-4 py-2 text-xs font-bold whitespace-nowrap"
                    >
                      Download File 📥
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setSelectedAnn(null)}
                className="rounded-xl border border-theme bg-surface px-5 py-2.5 text-xs font-bold text-primary hover:bg-hover transition duration-200"
              >
                Close notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
