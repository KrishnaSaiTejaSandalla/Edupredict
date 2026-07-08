"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import { createBus, updateBus, deleteBus, getBusStops, saveBusStops } from "@/lib/transport-actions";

type Bus = {
  id: number;
  schoolId: number;
  registrationNumber: string;
  routeName: string | null;
  driverName: string | null;
  driverPhone: string | null;
  capacity: number | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string | null;
};

type Props = {
  initialBuses: Bus[];
};

const inputCls = "input-theme";
const labelCls = "block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5";
const selectCls = "select-theme";

export default function TransportClient({ initialBuses }: Props) {
  const [busesList, setBusesList] = useState<Bus[]>(initialBuses);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    registrationNumber: "",
    routeName: "",
    driverName: "",
    driverPhone: "",
    capacity: "",
    isActive: "true",
  });

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [busToDelete, setBusToDelete] = useState<{ id: number; regNum: string } | null>(null);

  // Stops management state
  const [stops, setStops] = useState<{
    id?: number;
    stopName: string;
    pickupTime: string;
    dropTime: string;
    sequenceNumber: number;
    studentCount: number;
  }[]>([]);

  const handleAddStop = () => {
    const nameEl = document.getElementById("newStopName") as HTMLInputElement;
    const pickupEl = document.getElementById("newPickupTime") as HTMLInputElement;
    const dropEl = document.getElementById("newDropTime") as HTMLInputElement;

    if (!nameEl || !pickupEl || !dropEl) return;

    const stopName = nameEl.value.trim();
    const pickupTime = pickupEl.value;
    const dropTime = dropEl.value;

    if (!stopName) {
      toast.error("Stop name is required.");
      return;
    }
    if (!pickupTime || !dropTime) {
      toast.error("Pickup and Drop times are required.");
      return;
    }

    const newStop = {
      stopName,
      pickupTime,
      dropTime,
      sequenceNumber: stops.length + 1,
      studentCount: 0,
    };

    setStops([...stops, newStop]);

    // Clear inputs
    nameEl.value = "";
    pickupEl.value = "";
    dropEl.value = "";
  };

  const handleRemoveStop = (indexToRemove: number) => {
    const filtered = stops.filter((_, idx) => idx !== indexToRemove);
    const reindexed = filtered.map((s, idx) => ({
      ...s,
      sequenceNumber: idx + 1,
    }));
    setStops(reindexed);
  };

  const handleMoveStop = (index: number, direction: number) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= stops.length) return;

    const updated = [...stops];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const reindexed = updated.map((s, idx) => ({
      ...s,
      sequenceNumber: idx + 1,
    }));
    setStops(reindexed);
  };

  // Reset page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const reloadData = async () => {
    try {
      const res = await fetch("/api/transport");
      if (res.ok) {
        const data = await res.json();
        setBusesList(data);
      }
    } catch (err) {
      console.error("Failed to refresh buses:", err);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      registrationNumber: "",
      routeName: "",
      driverName: "",
      driverPhone: "",
      capacity: "",
      isActive: "true",
    });
    setStops([]);
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({
      registrationNumber: "",
      routeName: "",
      driverName: "",
      driverPhone: "",
      capacity: "",
      isActive: "true",
    });
    setStops([]);
    setShowForm(true);
  };

  const openEdit = async (bus: Bus) => {
    setEditingId(bus.id);
    setFormData({
      registrationNumber: bus.registrationNumber,
      routeName: bus.routeName || "",
      driverName: bus.driverName || "",
      driverPhone: bus.driverPhone || "",
      capacity: bus.capacity ? bus.capacity.toString() : "",
      isActive: bus.isActive.toString(),
    });
    setStops([]);
    setShowForm(true);

    try {
      const fetchedStops = await getBusStops(bus.id);
      setStops(fetchedStops.map(s => ({
        id: s.id,
        stopName: s.stopName,
        pickupTime: s.pickupTime,
        dropTime: s.dropTime,
        sequenceNumber: s.sequenceNumber,
        studentCount: s.studentCount
      })));
    } catch (err) {
      console.error("Failed to load stops:", err);
      toast.error("Failed to load bus stops.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.registrationNumber) {
      toast.error("Registration number is required.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          registrationNumber: formData.registrationNumber,
          routeName: formData.routeName || undefined,
          driverName: formData.driverName || undefined,
          driverPhone: formData.driverPhone || undefined,
          capacity: formData.capacity ? Number(formData.capacity) : undefined,
          isActive: formData.isActive === "true",
        };

        if (editingId) {
          await updateBus(editingId, payload);
          await saveBusStops(editingId, stops);
          toast.success("Bus updated successfully.");
        } else {
          await createBus(payload);
          toast.success("Bus created successfully.");
        }
        closeForm();
        await reloadData();
      } catch (err: any) {
        toast.error(err.message || "An error occurred.");
      }
    });
  };

  const handleDeleteClick = (bus: Bus) => {
    setBusToDelete({ id: bus.id, regNum: bus.registrationNumber });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!busToDelete) return;
    setDeleteModalOpen(false);
    startTransition(async () => {
      try {
        await deleteBus(busToDelete.id);
        toast.success(`Bus "${busToDelete.regNum}" removed successfully.`);
        await reloadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to remove bus.");
      } finally {
        setBusToDelete(null);
      }
    });
  };

  // Stats calculation
  const totalBuses = busesList.length;
  const activeBuses = busesList.filter((b) => b.isActive).length;
  const totalCapacity = busesList
    .filter((b) => b.isActive)
    .reduce((sum, b) => sum + (b.capacity || 0), 0);

  // Filters
  const filteredBuses = busesList.filter((b) => {
    const search = searchQuery.toLowerCase();
    return (
      b.registrationNumber.toLowerCase().includes(search) ||
      (b.driverName && b.driverName.toLowerCase().includes(search)) ||
      (b.routeName && b.routeName.toLowerCase().includes(search))
    );
  });

  const totalPages = Math.ceil(filteredBuses.length / itemsPerPage) || 1;
  const paginatedBuses = filteredBuses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-8">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
            Operations
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Transport Manager
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Manage school buses, seat capacities, drivers, and daily routes.
          </p>
        </div>

        <button
          onClick={() => (showForm && !editingId ? closeForm() : openCreate())}
          className="rounded-xl btn-blue px-5 py-3 text-xs font-bold whitespace-nowrap self-start sm:self-auto transition duration-200"
        >
          {showForm && !editingId ? "Close Panel" : "+ Register Bus"}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total registered */}
        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Registered Buses</p>
          <p className="mt-2 text-3xl font-bold text-primary">{totalBuses}</p>
        </div>

        {/* Active routes */}
        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-500">Active Buses / Routes</p>
          <p className="mt-2 text-3xl font-bold text-cyan-400">{activeBuses}</p>
        </div>

        {/* Capacity */}
        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-500">Total Seating Capacity</p>
          <p className="mt-2 text-3xl font-bold text-purple-400">{totalCapacity} seats</p>
        </div>
      </div>

      {/* Editor Panel */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-6">
            {editingId ? "Edit Vehicle Details" : "Register New Vehicle"}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-3">
            {/* Registration number */}
            <div>
              <label className={labelCls}>Registration Number *</label>
              <input
                type="text"
                value={formData.registrationNumber}
                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                required
                className={inputCls}
                placeholder="e.g. MH-12-AB-1234"
              />
            </div>

            {/* Route Name */}
            <div>
              <label className={labelCls}>Route Name</label>
              <input
                type="text"
                value={formData.routeName}
                onChange={(e) => setFormData({ ...formData, routeName: e.target.value })}
                className={inputCls}
                placeholder="e.g. Route A - Downtown"
              />
            </div>

            {/* Capacity */}
            <div>
              <label className={labelCls}>Capacity (Seats)</label>
              <input
                type="number"
                min={1}
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className={inputCls}
                placeholder="e.g. 50"
              />
            </div>

            {/* Driver Name */}
            <div>
              <label className={labelCls}>Driver Name</label>
              <input
                type="text"
                value={formData.driverName}
                onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                className={inputCls}
                placeholder="Driver full name"
              />
            </div>

            {/* Driver Phone */}
            <div>
              <label className={labelCls}>Driver Phone</label>
              <input
                type="text"
                value={formData.driverPhone}
                onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                className={inputCls}
                placeholder="e.g. +91 98765 43210"
              />
            </div>

            {/* Active Status */}
            <div>
              <label className={labelCls}>Status</label>
              <select
                value={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value })}
                className={selectCls}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            {/* Assigned Stops Section — Only in Edit Mode */}
            {editingId && (
              <div className="md:col-span-3 border-t border-border pt-6 mt-4 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
                  Assigned Stops
                </h3>
                
                {/* Stops List Table */}
                <div className="overflow-hidden rounded-xl border border-border bg-background shadow-inner">
                  <table className="w-full text-left text-xs text-foreground">
                    <thead className="border-b border-border bg-surface text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="p-3 pl-4">Seq</th>
                        <th className="p-3">Stop Name</th>
                        <th className="p-3">Pickup</th>
                        <th className="p-3">Drop</th>
                        <th className="p-3">Students</th>
                        <th className="p-3 text-right pr-4">Reorder / Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-subtle">
                      {stops.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-muted-foreground">
                            No stops assigned to this bus. Add one below.
                          </td>
                        </tr>
                      ) : (
                        stops.map((stop, index) => (
                          <tr key={index} className="hover:bg-hover/30 transition duration-150">
                            <td className="p-3 pl-4 font-semibold text-cyan-500">{stop.sequenceNumber}</td>
                            <td className="p-3 font-medium">{stop.stopName}</td>
                            <td className="p-3 text-secondary">{stop.pickupTime}</td>
                            <td className="p-3 text-secondary">{stop.dropTime}</td>
                            <td className="p-3 text-secondary">{stop.studentCount}</td>
                            <td className="p-3 text-right pr-4">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Move Up */}
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => handleMoveStop(index, -1)}
                                  className="p-1.5 rounded-lg hover:bg-hover text-muted hover:text-cyan-400 disabled:opacity-30 disabled:hover:text-muted transition duration-150"
                                  title="Move Up"
                                >
                                  ▲
                                </button>
                                {/* Move Down */}
                                <button
                                  type="button"
                                  disabled={index === stops.length - 1}
                                  onClick={() => handleMoveStop(index, 1)}
                                  className="p-1.5 rounded-lg hover:bg-hover text-muted hover:text-cyan-400 disabled:opacity-30 disabled:hover:text-muted transition duration-150"
                                  title="Move Down"
                                >
                                  ▼
                                </button>
                                {/* Remove */}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStop(index)}
                                  className="p-1.5 rounded-lg hover:bg-hover text-rose-500/70 hover:text-rose-500 transition duration-150"
                                  title="Remove Stop"
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Inline form to add stop */}
                <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Add New Stop</p>
                  <div className="grid gap-3 sm:grid-cols-4 items-end">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Stop Name</label>
                      <input
                        type="text"
                        id="newStopName"
                        placeholder="e.g. Central Station"
                        className="input-theme text-xs h-9 py-1 px-2.5"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Pickup Time</label>
                      <input
                        type="time"
                        id="newPickupTime"
                        className="input-theme text-xs h-9 py-1 px-2.5"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Drop Time</label>
                      <input
                        type="time"
                        id="newDropTime"
                        className="input-theme text-xs h-9 py-1 px-2.5"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddStop}
                      className="h-9 rounded-xl btn-blue text-xs font-bold w-full transition duration-150"
                    >
                      + Add Stop
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Form actions */}
            <div className="md:col-span-3 flex gap-3 mt-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl btn-emerald px-5 py-2.5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Saving..." : editingId ? "Update Vehicle" : "Register Vehicle"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-theme bg-surface px-5 py-2.5 text-xs font-bold text-primary hover:bg-hover transition duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Control Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-theme pb-4">
        <div className="relative w-full sm:w-64">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search transport..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-theme bg-surface pl-9 pr-3 text-xs text-primary outline-none focus:border-cyan-500 placeholder:text-muted transition-all"
          />
        </div>
      </div>

      {/* Buses Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
        <table className="w-full text-left text-sm text-foreground">
          <thead className="border-b border-border bg-background/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4 px-6">Reg Number</th>
              <th className="p-4 px-6">Assigned Route</th>
              <th className="p-4 px-6">Capacity</th>
              <th className="p-4 px-6">Driver</th>
              <th className="p-4 px-6">Status</th>
              <th className="p-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {paginatedBuses.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-sm font-medium text-muted-foreground">
                  No vehicles registered.
                </td>
              </tr>
            ) : (
              paginatedBuses.map((bus) => (
                <tr key={bus.id} className="hover:bg-hover transition duration-200">
                  <td className="p-4 px-6 font-semibold text-primary">{bus.registrationNumber}</td>
                  <td className="p-4 px-6 font-medium text-foreground">{bus.routeName || "—"}</td>
                  <td className="p-4 px-6 text-secondary">{bus.capacity ? `${bus.capacity} seats` : "—"}</td>
                  <td className="p-4 px-6">
                    {bus.driverName ? (
                      <div className="flex flex-col">
                        <span className="font-medium text-primary">{bus.driverName}</span>
                        {bus.driverPhone && (
                          <span className="text-[10px] text-muted">{bus.driverPhone}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="p-4 px-6">
                    <span
                      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-semibold border ${
                        bus.isActive
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                      }`}
                    >
                      {bus.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Edit */}
                      <button
                        onClick={() => openEdit(bus)}
                        title="Edit Vehicle"
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-hover text-muted-foreground hover:text-cyan-400 hover:border-cyan-400/30 transition duration-150"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
                        </svg>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteClick(bus)}
                        title="Deregister Vehicle"
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-hover text-muted-foreground hover:text-rose-500 hover:border-rose-500/30 transition duration-150"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pt-4 border-t border-border mt-4 w-full">
          <div>
            {currentPage > 1 && (
              <button
                onClick={() => setCurrentPage((p) => p - 1)}
                className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150 text-foreground"
              >
                ← Previous
              </button>
            )}
          </div>
          <span className="tabular-nums">Page {currentPage} of {totalPages} ({filteredBuses.length} total buses)</span>
          <div>
            {currentPage < totalPages && (
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150 text-foreground"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Deregister Bus Profile?"
        message={`Are you sure you want to completely deregister and delete bus ${busToDelete?.regNum}? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setBusToDelete(null);
        }}
      />
    </div>
  );
}
