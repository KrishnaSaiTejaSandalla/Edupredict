"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import {
  createBus,
  updateBus,
  deleteBus,
  getAllRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  getRouteStops,
  saveRouteStops,
  createStop,
  updateStop,
  deleteStop,
  getAllStops,
  assignStudentToBus,
  removeStudentFromBus,
  bulkAssignStudentsToBus,
} from "@/lib/transport-actions";
import { getAllClasses } from "@/lib/actions";
import AdminLiveBusMap from "@/components/admin/AdminLiveBusMap";
import { Edit, Trash2, UserPlus, UserMinus } from "lucide-react";

type Bus = {
  id: number;
  schoolId: number;
  registrationNumber: string;
  routeName: string | null;
  routeId: number | null;
  driverName: string | null;
  driverPhone: string | null;
  capacity: number | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string | null;
  assignedCount?: number;
  actualRouteName?: string | null;
};

type Route = {
  id: number;
  schoolId: number;
  routeName: string;
  type: string;
  isActive: boolean;
  stopCount?: number;
  assignedBuses?: string;
};

type Stop = {
  id: number;
  routeId: number | null;
  routeName?: string | null;
  stopName: string;
  pickupTime: string;
  dropTime: string;
  sequenceNumber: number;
  latitude: number | null;
  longitude: number | null;
  studentCount?: number;
};

type Props = {
  initialBuses: Bus[];
  initialRoutes: Route[];
  initialTrackingSnapshots: any[];
};

const inputCls = "input-theme";
const labelCls = "block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5";
const selectCls = "select-theme";

export default function TransportClient({
  initialBuses,
  initialRoutes,
  initialTrackingSnapshots,
}: Props) {
  const [activeTab, setActiveTab] = useState<"vehicles" | "routes" | "stops" | "assignments" | "tracking">("vehicles");
  const [isPending, startTransition] = useTransition();

  // Data lists
  const [busesList, setBusesList] = useState<Bus[]>(initialBuses);
  const [routesList, setRoutesList] = useState<Route[]>(initialRoutes);
  const [stopsList, setStopsList] = useState<Stop[]>([]);
  const [classesList, setClassesList] = useState<{ id: number; name: string; section?: string | null }[]>([]);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Student Assignment tab states
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [assignBusId, setAssignBusId] = useState<number | "">("");

  // Filters for student assignments
  const [classFilter, setClassFilter] = useState<number | "">("");
  const [busFilter, setBusFilter] = useState<string>("all");
  const [routeFilter, setRouteFilter] = useState<string>("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const studentsPerPage = 10;

  // Modals / Panels
  const [showBusForm, setShowBusForm] = useState(false);
  const [editingBusId, setEditingBusId] = useState<number | null>(null);

  const [showRouteForm, setShowRouteForm] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<number | null>(null);

  const [showStopForm, setShowStopForm] = useState(false);
  const [editingStopId, setEditingStopId] = useState<number | null>(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningStudent, setAssigningStudent] = useState<any | null>(null);

  // Forms states
  const [busFormData, setBusFormData] = useState({
    registrationNumber: "",
    routeId: "",
    driverName: "",
    driverPhone: "",
    driverPassword: "",
    driverConfirmPassword: "",
    capacity: "",
    isActive: "true",
  });

  const [routeFormData, setRouteFormData] = useState({
    routeName: "",
    type: "morning", // morning / evening
    isActive: "true",
  });

  const [stopFormData, setStopFormData] = useState({
    routeId: "",
    stopName: "",
    pickupTime: "",
    dropTime: "",
    latitude: "",
    longitude: "",
  });

  const [assignFormData, setAssignFormData] = useState({
    busId: "",
    routeId: "",
    pickupStopId: "",
    morningPickupTime: "",
    returnTime: "",
  });

  // Ordered stops inside route form
  const [routeStops, setRouteStops] = useState<Stop[]>([]);

  // Delete modals state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"bus" | "route" | "stop" | null>(null);
  const [targetToDelete, setTargetToDelete] = useState<{ id: number; name: string } | null>(null);

  // Load classes, stops, routes on mount & tab switches
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const data = await getAllClasses();
        setClassesList(data as any);
      } catch (err) {
        console.error("Failed to load classes:", err);
      }
    };
    loadClasses();
  }, []);

  const refreshBuses = async () => {
    try {
      const res = await fetch("/api/transport");
      if (res.ok) {
        const data = await res.json();
        setBusesList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const refreshRoutes = async () => {
    try {
      const res = await fetch("/api/transport/routes");
      if (res.ok) {
        const data = await res.json();
        setRoutesList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const refreshStops = async () => {
    try {
      const res = await fetch("/api/transport/stops");
      if (res.ok) {
        const data = await res.json();
        setStopsList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === "stops") {
      refreshStops();
    } else if (activeTab === "routes") {
      refreshRoutes();
    } else if (activeTab === "vehicles") {
      refreshBuses();
    }
  }, [activeTab]);

  // Fetch student assignments
  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const params = new URLSearchParams();
      if (classFilter) params.set("classId", String(classFilter));
      if (busFilter !== "all" && busFilter !== "unassigned") {
        params.set("busId", busFilter);
      }
      if (routeFilter !== "all") {
        params.set("routeId", routeFilter);
      }
      if (studentSearch) params.set("search", studentSearch);

      const res = await fetch(`/api/transport/students?${params}`);
      if (res.ok) {
        let data = await res.json();
        if (busFilter === "unassigned") {
          data = data.filter((s: any) => !s.assignedBusId);
        }
        setStudentsList(data);
      }
    } catch (err) {
      console.error("Failed to fetch students:", err);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    setStudentPage(1);
  }, [classFilter, busFilter, routeFilter, studentSearch]);

  useEffect(() => {
    if (activeTab === "assignments") {
      fetchStudents();
    }
  }, [classFilter, busFilter, routeFilter, studentSearch, activeTab]);

  // ────────────── BUS (VEHICLE) SUBMISSIONS ──────────────
  const handleBusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!busFormData.registrationNumber) {
      toast.error("Registration number is required.");
      return;
    }

    if (busFormData.driverName && busFormData.driverPhone) {
      if (!editingBusId && !busFormData.driverPassword) {
        toast.error("Password is required for new drivers.");
        return;
      }
      if (busFormData.driverPassword && busFormData.driverPassword.length < 6) {
        toast.error("Driver password must be at least 6 characters.");
        return;
      }
      if (busFormData.driverPassword && busFormData.driverPassword !== busFormData.driverConfirmPassword) {
        toast.error("Driver passwords do not match.");
        return;
      }
    }

    startTransition(async () => {
      try {
        const payload = {
          registrationNumber: busFormData.registrationNumber,
          routeId: busFormData.routeId ? Number(busFormData.routeId) : undefined,
          driverName: busFormData.driverName || undefined,
          driverPhone: busFormData.driverPhone || undefined,
          driverPassword: busFormData.driverPassword || undefined,
          capacity: busFormData.capacity ? Number(busFormData.capacity) : undefined,
          isActive: busFormData.isActive === "true",
        };

        if (editingBusId) {
          await updateBus(editingBusId, payload);
          toast.success("Bus updated successfully.");
        } else {
          await createBus(payload);
          toast.success("Bus registered successfully.");
        }
        setShowBusForm(false);
        setEditingBusId(null);
        setBusFormData({
          registrationNumber: "",
          routeId: "",
          driverName: "",
          driverPhone: "",
          driverPassword: "",
          driverConfirmPassword: "",
          capacity: "",
          isActive: "true",
        });
        await refreshBuses();
      } catch (err: any) {
        toast.error(err.message || "An error occurred.");
      }
    });
  };

  const openEditBus = (bus: Bus) => {
    setEditingBusId(bus.id);
    setBusFormData({
      registrationNumber: bus.registrationNumber,
      routeId: bus.routeId ? bus.routeId.toString() : "",
      driverName: bus.driverName || "",
      driverPhone: bus.driverPhone || "",
      driverPassword: "",
      driverConfirmPassword: "",
      capacity: bus.capacity ? bus.capacity.toString() : "",
      isActive: bus.isActive.toString(),
    });
    setShowBusForm(true);
  };

  // ────────────── ROUTE SUBMISSIONS ──────────────
  const handleRouteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeFormData.routeName) {
      toast.error("Route name is required.");
      return;
    }

    startTransition(async () => {
      try {
        const stopsPayload = routeStops.map(s => ({
          ...s,
          latitude: s.latitude ?? undefined,
          longitude: s.longitude ?? undefined,
        }));

        if (editingRouteId) {
          await updateRoute(editingRouteId, {
            routeName: routeFormData.routeName,
            type: routeFormData.type,
            isActive: routeFormData.isActive === "true",
          });
          await saveRouteStops(editingRouteId, stopsPayload);
          toast.success("Route updated successfully.");
        } else {
          const res = await createRoute({
            routeName: routeFormData.routeName,
            type: routeFormData.type,
          });
          if (res.success && res.id) {
            await saveRouteStops(res.id, stopsPayload);
          }
          toast.success("Route created successfully.");
        }
        setShowRouteForm(false);
        setEditingRouteId(null);
        setRouteFormData({
          routeName: "",
          type: "morning",
          isActive: "true",
        });
        setRouteStops([]);
        await refreshRoutes();
      } catch (err: any) {
        toast.error(err.message || "An error occurred.");
      }
    });
  };

  const openEditRoute = async (route: Route) => {
    setEditingRouteId(route.id);
    setRouteFormData({
      routeName: route.routeName,
      type: route.type,
      isActive: route.isActive.toString(),
    });
    try {
      const stops = await getRouteStops(route.id);
      setRouteStops(stops.map(s => ({
        id: s.id,
        routeId: s.routeId,
        stopName: s.stopName,
        pickupTime: s.pickupTime,
        dropTime: s.dropTime,
        sequenceNumber: s.sequenceNumber,
        latitude: s.latitude,
        longitude: s.longitude,
      })));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load stops.");
    }
    setShowRouteForm(true);
  };

  const handleAddStopToRoute = () => {
    const nameEl = document.getElementById("newStopName") as HTMLInputElement;
    const pickupEl = document.getElementById("newPickupTime") as HTMLInputElement;
    const dropEl = document.getElementById("newDropTime") as HTMLInputElement;
    const latEl = document.getElementById("newLat") as HTMLInputElement;
    const lngEl = document.getElementById("newLng") as HTMLInputElement;

    if (!nameEl || !pickupEl || !dropEl) return;

    const stopName = nameEl.value.trim();
    const pickupTime = pickupEl.value;
    const dropTime = dropEl.value;
    const lat = latEl ? parseFloat(latEl.value) : null;
    const lng = lngEl ? parseFloat(lngEl.value) : null;

    if (!stopName) {
      toast.error("Stop name is required.");
      return;
    }
    if (!pickupTime || !dropTime) {
      toast.error("Times are required.");
      return;
    }

    const newStop: Stop = {
      id: Math.random(), // Temporary local ID
      routeId: editingRouteId,
      stopName,
      pickupTime,
      dropTime,
      sequenceNumber: routeStops.length + 1,
      latitude: isNaN(lat as number) ? null : lat,
      longitude: isNaN(lng as number) ? null : lng,
    };

    setRouteStops([...routeStops, newStop]);

    // Clear inputs
    nameEl.value = "";
    pickupEl.value = "";
    dropEl.value = "";
    if (latEl) latEl.value = "";
    if (lngEl) lngEl.value = "";
  };

  const handleRemoveRouteStop = (idxToRemove: number) => {
    const filtered = routeStops.filter((_, idx) => idx !== idxToRemove);
    const reordered = filtered.map((s, idx) => ({
      ...s,
      sequenceNumber: idx + 1,
    }));
    setRouteStops(reordered);
  };

  const handleMoveRouteStop = (index: number, direction: number) => {
    const target = index + direction;
    if (target < 0 || target >= routeStops.length) return;

    const updated = [...routeStops];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;

    const reordered = updated.map((s, idx) => ({
      ...s,
      sequenceNumber: idx + 1,
    }));
    setRouteStops(reordered);
  };

  // ────────────── STOP SUBMISSIONS ──────────────
  const handleStopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stopFormData.routeId || !stopFormData.stopName || !stopFormData.pickupTime || !stopFormData.dropTime) {
      toast.error("Required fields are missing.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          routeId: Number(stopFormData.routeId),
          stopName: stopFormData.stopName,
          pickupTime: stopFormData.pickupTime,
          dropTime: stopFormData.dropTime,
          latitude: stopFormData.latitude ? parseFloat(stopFormData.latitude) : undefined,
          longitude: stopFormData.longitude ? parseFloat(stopFormData.longitude) : undefined,
        };

        if (editingStopId) {
          await updateStop(editingStopId, payload);
          toast.success("Stop details updated.");
        } else {
          await createStop(payload);
          toast.success("Stop created successfully.");
        }
        setShowStopForm(false);
        setEditingStopId(null);
        setStopFormData({
          routeId: "",
          stopName: "",
          pickupTime: "",
          dropTime: "",
          latitude: "",
          longitude: "",
        });
        await refreshStops();
      } catch (err: any) {
        toast.error(err.message || "An error occurred.");
      }
    });
  };

  const openEditStop = (stop: Stop) => {
    setEditingStopId(stop.id);
    setStopFormData({
      routeId: stop.routeId ? stop.routeId.toString() : "",
      stopName: stop.stopName,
      pickupTime: stop.pickupTime,
      dropTime: stop.dropTime,
      latitude: stop.latitude ? stop.latitude.toString() : "",
      longitude: stop.longitude ? stop.longitude.toString() : "",
    });
    setShowStopForm(true);
  };

  // ────────────── STUDENT ASSIGNMENT OPERATIONS ──────────────
  const openAssignModal = (student: any) => {
    setAssigningStudent(student);
    setAssignFormData({
      busId: student.assignedBusId ? student.assignedBusId.toString() : "",
      routeId: student.routeId ? student.routeId.toString() : "",
      pickupStopId: student.pickupStopId ? student.pickupStopId.toString() : "",
      morningPickupTime: student.morningPickupTime || "",
      returnTime: student.returnTime || "",
    });
    setShowAssignModal(true);
  };

  // Once Bus is selected in Assign dialog, automatically preselect route and fetch its stops
  const handleAssignBusChange = (targetBusId: number) => {
    const selectedBus = busesList.find(b => b.id === targetBusId);
    if (selectedBus) {
      setAssignFormData(prev => ({
        ...prev,
        busId: targetBusId.toString(),
        routeId: selectedBus.routeId ? selectedBus.routeId.toString() : "",
        pickupStopId: "",
        morningPickupTime: "",
        returnTime: "",
      }));
    } else {
      setAssignFormData(prev => ({
        ...prev,
        busId: "",
        routeId: "",
        pickupStopId: "",
        morningPickupTime: "",
        returnTime: "",
      }));
    }
  };

  const handleAssignStopChange = (targetStopId: number, stopsForRoute: Stop[]) => {
    const stop = stopsForRoute.find(s => s.id === targetStopId);
    if (stop) {
      setAssignFormData(prev => ({
        ...prev,
        pickupStopId: targetStopId.toString(),
        morningPickupTime: stop.pickupTime,
        returnTime: stop.dropTime,
      }));
    }
  };

  const submitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignFormData.busId || !assignFormData.routeId || !assignFormData.pickupStopId) {
      toast.error("Please fill in the bus, route, and stop selection.");
      return;
    }

    startTransition(async () => {
      try {
        await assignStudentToBus(
          assigningStudent.id,
          Number(assignFormData.busId),
          Number(assignFormData.routeId),
          Number(assignFormData.pickupStopId),
          null, // dropStopId optional
          assignFormData.morningPickupTime,
          assignFormData.returnTime
        );
        toast.success("Student assigned successfully.");
        setShowAssignModal(false);
        setAssigningStudent(null);
        fetchStudents();
        refreshBuses();
      } catch (err: any) {
        toast.error(err.message || "Failed to assign student.");
      }
    });
  };

  const handleRemoveStudent = async (studentId: number, currentBusId: number) => {
    try {
      await removeStudentFromBus(studentId, currentBusId);
      toast.success("Assignment removed.");
      fetchStudents();
      refreshBuses();
    } catch (err) {
      toast.error("Error occurred while removing student.");
    }
  };

  const handleBulkAssign = async () => {
    if (!assignBusId) {
      toast.error("Please select a target bus.");
      return;
    }
    if (selectedStudentIds.length === 0) {
      toast.error("No students selected.");
      return;
    }

    startTransition(async () => {
      try {
        await bulkAssignStudentsToBus(selectedStudentIds, Number(assignBusId));
        toast.success(`Successfully assigned ${selectedStudentIds.length} students!`);
        setSelectedStudentIds([]);
        setAssignBusId("");
        fetchStudents();
        refreshBuses();
      } catch (err) {
        toast.error("Error occurred during bulk assignment.");
      }
    });
  };

  const handleSelectAllStudents = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudentIds(studentsList.map((s) => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleSelectStudentToggle = (studentId: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  // ────────────── DELETE MODAL TRIGGERS ──────────────
  const handleDeleteClick = (type: "bus" | "route" | "stop", item: { id: number; name: string }) => {
    setDeleteType(type);
    setTargetToDelete(item);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!targetToDelete || !deleteType) return;
    setDeleteModalOpen(false);

    startTransition(async () => {
      try {
        if (deleteType === "bus") {
          await deleteBus(targetToDelete.id);
          toast.success("Bus deregistered successfully.");
          await refreshBuses();
        } else if (deleteType === "route") {
          await deleteRoute(targetToDelete.id);
          toast.success("Route deleted successfully.");
          await refreshRoutes();
        } else if (deleteType === "stop") {
          await deleteStop(targetToDelete.id);
          toast.success("Stop deleted successfully.");
          await refreshStops();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to delete.");
      } finally {
        setTargetToDelete(null);
        setDeleteType(null);
      }
    });
  };

  // Stats calculation
  const totalBuses = busesList.length;
  const activeBuses = busesList.filter((b) => b.isActive).length;
  const totalCapacity = busesList
    .filter((b) => b.isActive)
    .reduce((sum, b) => sum + (b.capacity || 0), 0);

  // Search & Filters filtering (client side)
  const getFilteredItems = () => {
    const search = searchQuery.toLowerCase();
    if (activeTab === "vehicles") {
      return busesList.filter(
        (b) =>
          b.registrationNumber.toLowerCase().includes(search) ||
          (b.driverName && b.driverName.toLowerCase().includes(search)) ||
          (b.routeName && b.routeName.toLowerCase().includes(search))
      );
    } else if (activeTab === "routes") {
      return routesList.filter((r) => r.routeName.toLowerCase().includes(search));
    } else if (activeTab === "stops") {
      return stopsList.filter((s) => s.stopName.toLowerCase().includes(search));
    }
    return [];
  };

  const filteredItems = getFilteredItems();
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalStudentPages = Math.ceil(studentsList.length / studentsPerPage) || 1;
  const paginatedStudents = studentsList.slice((studentPage - 1) * studentsPerPage, studentPage * studentsPerPage);

  // Reset page on search or tab change
  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery("");
  }, [activeTab]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
            Operations
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Transport Management
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Manage school vehicles, drivers, relational stops, routes, and student assignments.
          </p>
        </div>

        {activeTab === "vehicles" && !showBusForm && (
          <button
            onClick={() => {
              setEditingBusId(null);
              setBusFormData({
                registrationNumber: "",
                routeId: "",
                driverName: "",
                driverPhone: "",
                driverPassword: "",
                driverConfirmPassword: "",
                capacity: "",
                isActive: "true",
              });
              setShowBusForm(true);
            }}
            className="rounded-xl btn-blue px-5 py-3 text-xs font-bold whitespace-nowrap self-start sm:self-auto transition duration-200"
          >
            + Register Bus
          </button>
        )}

        {activeTab === "routes" && !showRouteForm && (
          <button
            onClick={() => {
              setEditingRouteId(null);
              setRouteFormData({ routeName: "", type: "morning", isActive: "true" });
              setRouteStops([]);
              setShowRouteForm(true);
            }}
            className="rounded-xl btn-blue px-5 py-3 text-xs font-bold whitespace-nowrap self-start sm:self-auto transition duration-200"
          >
            + Create Route
          </button>
        )}

        {activeTab === "stops" && !showStopForm && (
          <button
            onClick={() => {
              setEditingStopId(null);
              setStopFormData({
                routeId: "",
                stopName: "",
                pickupTime: "",
                dropTime: "",
                latitude: "",
                longitude: "",
              });
              setShowStopForm(true);
            }}
            className="rounded-xl btn-blue px-5 py-3 text-xs font-bold whitespace-nowrap self-start sm:self-auto transition duration-200"
          >
            + Add Stop
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Buses Registered</p>
          <p className="mt-2 text-3xl font-bold text-primary">{totalBuses}</p>
        </div>
        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-500">Active Fleet / Routes</p>
          <p className="mt-2 text-3xl font-bold text-cyan-400">{activeBuses}</p>
        </div>
        <div className="rounded-2xl border border-theme bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-500">Total Seats</p>
          <p className="mt-2 text-3xl font-bold text-purple-400">{totalCapacity} seats</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-theme pb-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-subtle bg-hover p-1">
          {(["vehicles", "routes", "stops", "assignments", "tracking"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-5 py-2.5 text-xs font-semibold uppercase tracking-wide transition duration-150 border border-transparent ${
                activeTab === tab
                  ? "bg-cyan-500/20 text-cyan-400 shadow-sm border-cyan-500/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "vehicles" && "Vehicles"}
              {tab === "routes" && "Routes"}
              {tab === "stops" && "Stops"}
              {tab === "assignments" && "Student Assignments"}
              {tab === "tracking" && "Live Tracking"}
            </button>
          ))}
        </div>
      </div>

      {/* ────────────────── VEHICLES FORM ────────────────── */}
      {activeTab === "vehicles" && showBusForm && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-6">
            {editingBusId ? "Edit Bus Profile" : "Register New Bus"}
          </h2>
          <form onSubmit={handleBusSubmit} className="grid gap-5 md:grid-cols-3">
            <div>
              <label className={labelCls}>Registration Number *</label>
              <input
                type="text"
                value={busFormData.registrationNumber}
                onChange={(e) => setBusFormData({ ...busFormData, registrationNumber: e.target.value })}
                required
                className={inputCls}
                placeholder="e.g. BUS-101"
              />
            </div>

            <div>
              <label className={labelCls}>Assigned Route</label>
              <select
                value={busFormData.routeId}
                onChange={(e) => setBusFormData({ ...busFormData, routeId: e.target.value })}
                className={selectCls}
              >
                <option value="">No Route Assigned</option>
                {routesList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.routeName} ({r.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Capacity (Seats)</label>
              <input
                type="number"
                min={1}
                value={busFormData.capacity}
                onChange={(e) => setBusFormData({ ...busFormData, capacity: e.target.value })}
                className={inputCls}
                placeholder="e.g. 25"
              />
            </div>

            <div>
              <label className={labelCls}>Driver Name</label>
              <input
                type="text"
                value={busFormData.driverName}
                onChange={(e) => setBusFormData({ ...busFormData, driverName: e.target.value })}
                className={inputCls}
                placeholder="Driver full name"
              />
            </div>

            <div>
              <label className={labelCls}>Driver Phone</label>
              <input
                type="text"
                value={busFormData.driverPhone}
                onChange={(e) => setBusFormData({ ...busFormData, driverPhone: e.target.value })}
                className={inputCls}
                placeholder="Driver mobile number"
              />
            </div>

            <div>
              <label className={labelCls}>
                Driver Password {editingBusId ? "(leave blank to keep)" : "*"}
              </label>
              <input
                type="password"
                value={busFormData.driverPassword}
                onChange={(e) => setBusFormData({ ...busFormData, driverPassword: e.target.value })}
                className={inputCls}
                placeholder={editingBusId ? "••••••" : "Min 6 characters"}
                autoComplete="new-password"
              />
            </div>

            {busFormData.driverPassword && (
              <div>
                <label className={labelCls}>Confirm Password *</label>
                <input
                  type="password"
                  value={busFormData.driverConfirmPassword}
                  onChange={(e) => setBusFormData({ ...busFormData, driverConfirmPassword: e.target.value })}
                  className={inputCls}
                  placeholder="Re-enter password"
                />
              </div>
            )}

            <div>
              <label className={labelCls}>Status</label>
              <select
                value={busFormData.isActive}
                onChange={(e) => setBusFormData({ ...busFormData, isActive: e.target.value })}
                className={selectCls}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div className="md:col-span-3 flex gap-3 mt-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl btn-emerald px-5 py-2.5 text-xs font-bold disabled:opacity-50"
              >
                {isPending ? "Saving..." : editingBusId ? "Update Bus" : "Register Bus"}
              </button>
              <button
                type="button"
                onClick={() => setShowBusForm(false)}
                className="rounded-xl border border-theme bg-surface px-5 py-2.5 text-xs font-bold text-primary hover:bg-hover transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ────────────────── ROUTES FORM ────────────────── */}
      {activeTab === "routes" && showRouteForm && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-6">
            {editingRouteId ? "Edit Route & Stops" : "Create New Route"}
          </h2>
          <form onSubmit={handleRouteSubmit} className="space-y-6">
            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label className={labelCls}>Route Name *</label>
                <input
                  type="text"
                  value={routeFormData.routeName}
                  onChange={(e) => setRouteFormData({ ...routeFormData, routeName: e.target.value })}
                  required
                  className={inputCls}
                  placeholder="e.g. Morning Route A"
                />
              </div>

              <div>
                <label className={labelCls}>Direction *</label>
                <select
                  value={routeFormData.type}
                  onChange={(e) => setRouteFormData({ ...routeFormData, type: e.target.value })}
                  className={selectCls}
                >
                  <option value="morning">Morning</option>
                  <option value="evening">Evening</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Status</label>
                <select
                  value={routeFormData.isActive}
                  onChange={(e) => setRouteFormData({ ...routeFormData, isActive: e.target.value })}
                  className={selectCls}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            {/* STOPS LIST UNDER ROUTE */}
            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="text-sm font-bold text-primary">Ordered Stops</h3>

              <div className="overflow-hidden rounded-xl border border-border bg-background shadow-inner">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="border-b border-border bg-surface text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-3 pl-4">Seq</th>
                      <th className="p-3">Stop Name</th>
                      <th className="p-3">Coordinates (Lat/Lng)</th>
                      <th className="p-3">Pickup Time</th>
                      <th className="p-3">Return Time</th>
                      <th className="p-3 text-right pr-4">Reorder / Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {routeStops.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted-foreground">
                          No stops assigned to this route. Add one below.
                        </td>
                      </tr>
                    ) : (
                      routeStops.map((stop, index) => (
                        <tr key={stop.id} className="hover:bg-hover/30 transition">
                          <td className="p-3 pl-4 font-semibold text-cyan-500">{stop.sequenceNumber}</td>
                          <td className="p-3 font-medium">{stop.stopName}</td>
                          <td className="p-3 text-secondary text-[11px]">
                            {stop.latitude !== null && stop.longitude !== null
                              ? `${stop.latitude}, ${stop.longitude}`
                              : "—"}
                          </td>
                          <td className="p-3 text-secondary">{stop.pickupTime}</td>
                          <td className="p-3 text-secondary">{stop.dropTime}</td>
                          <td className="p-3 text-right pr-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveRouteStop(index, -1)}
                                className="p-1 rounded hover:bg-hover text-muted hover:text-cyan-400 disabled:opacity-30"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                disabled={index === routeStops.length - 1}
                                onClick={() => handleMoveRouteStop(index, 1)}
                                className="p-1 rounded hover:bg-hover text-muted hover:text-cyan-400 disabled:opacity-30"
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveRouteStop(index)}
                                className="p-1 rounded hover:bg-hover text-rose-500"
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

              {/* Inline Form to Add stop to Route */}
              <div className="rounded-xl border border-border bg-surface/50 p-4 grid gap-3 sm:grid-cols-5 items-end">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Stop Name</label>
                  <input type="text" id="newStopName" placeholder="Atal Hostel" className="input-theme text-xs h-9 py-1 px-2.5" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Latitude</label>
                  <input type="text" id="newLat" placeholder="22.28872" className="input-theme text-xs h-9 py-1 px-2.5" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Longitude</label>
                  <input type="text" id="newLng" placeholder="73.36382" className="input-theme text-xs h-9 py-1 px-2.5" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Pickup / Return</label>
                  <div className="flex gap-1">
                    <input type="text" id="newPickupTime" placeholder="8:10 AM" className="input-theme text-xs h-9 py-1 px-1.5 w-1/2" />
                    <input type="text" id="newDropTime" placeholder="4:35 PM" className="input-theme text-xs h-9 py-1 px-1.5 w-1/2" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddStopToRoute}
                  className="h-9 rounded-xl btn-blue text-xs font-bold w-full"
                >
                  + Add Stop
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl btn-emerald px-5 py-2.5 text-xs font-bold disabled:opacity-50"
              >
                {isPending ? "Saving..." : editingRouteId ? "Update Route" : "Create Route"}
              </button>
              <button
                type="button"
                onClick={() => setShowRouteForm(false)}
                className="rounded-xl border border-theme bg-surface px-5 py-2.5 text-xs font-bold text-primary hover:bg-hover transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ────────────────── STOPS FORM ────────────────── */}
      {activeTab === "stops" && showStopForm && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-6">
            {editingStopId ? "Edit Stop Details" : "Create Standalone Stop"}
          </h2>
          <form onSubmit={handleStopSubmit} className="grid gap-5 md:grid-cols-3">
            <div>
              <label className={labelCls}>Assigned Route *</label>
              <select
                value={stopFormData.routeId}
                onChange={(e) => setStopFormData({ ...stopFormData, routeId: e.target.value })}
                required
                className={selectCls}
              >
                <option value="" disabled>Select Route...</option>
                {routesList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.routeName} ({r.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Stop Name *</label>
              <input
                type="text"
                value={stopFormData.stopName}
                onChange={(e) => setStopFormData({ ...stopFormData, stopName: e.target.value })}
                required
                className={inputCls}
                placeholder="e.g. CV Raman Building"
              />
            </div>

            <div>
              <label className={labelCls}>Pickup Time *</label>
              <input
                type="text"
                value={stopFormData.pickupTime}
                onChange={(e) => setStopFormData({ ...stopFormData, pickupTime: e.target.value })}
                required
                className={inputCls}
                placeholder="e.g. 8:15 AM"
              />
            </div>

            <div>
              <label className={labelCls}>Return Time *</label>
              <input
                type="text"
                value={stopFormData.dropTime}
                onChange={(e) => setStopFormData({ ...stopFormData, dropTime: e.target.value })}
                required
                className={inputCls}
                placeholder="e.g. 4:30 PM"
              />
            </div>

            <div>
              <label className={labelCls}>Latitude</label>
              <input
                type="text"
                value={stopFormData.latitude}
                onChange={(e) => setStopFormData({ ...stopFormData, latitude: e.target.value })}
                className={inputCls}
                placeholder="e.g. 22.28872"
              />
            </div>

            <div>
              <label className={labelCls}>Longitude</label>
              <input
                type="text"
                value={stopFormData.longitude}
                onChange={(e) => setStopFormData({ ...stopFormData, longitude: e.target.value })}
                className={inputCls}
                placeholder="e.g. 73.36382"
              />
            </div>

            <div className="md:col-span-3 flex gap-3 mt-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl btn-emerald px-5 py-2.5 text-xs font-bold disabled:opacity-50"
              >
                {isPending ? "Saving..." : editingStopId ? "Update Stop" : "Create Stop"}
              </button>
              <button
                type="button"
                onClick={() => setShowStopForm(false)}
                className="rounded-xl border border-theme bg-surface px-5 py-2.5 text-xs font-bold text-primary hover:bg-hover transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ────────────────── VEHICLES, ROUTES, STOPS TABLES ────────────────── */}
      {activeTab !== "assignments" && activeTab !== "tracking" && !showBusForm && !showRouteForm && !showStopForm && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-theme pb-4">
            <h2 className="text-lg font-bold text-primary">
              {activeTab === "vehicles" && "Registered Vehicles"}
              {activeTab === "routes" && "Route Directory"}
              {activeTab === "stops" && "Relational Stops"}
            </h2>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-theme bg-surface pl-4 pr-3 text-xs text-primary outline-none focus:border-cyan-500 transition-all"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="border-b border-border bg-background/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {activeTab === "vehicles" && (
                  <tr>
                    <th className="p-4 px-6">Bus Number</th>
                    <th className="p-4 px-6">Assigned Route</th>
                    <th className="p-4 px-6">Occupancy</th>
                    <th className="p-4 px-6">Driver Info</th>
                    <th className="p-4 px-6">Status</th>
                    <th className="p-4 px-6 text-right">Actions</th>
                  </tr>
                )}
                {activeTab === "routes" && (
                  <tr>
                    <th className="p-4 px-6">Route Name</th>
                    <th className="p-4 px-6">Type</th>
                    <th className="p-4 px-6">Total Stops</th>
                    <th className="p-4 px-6">Assigned Buses</th>
                    <th className="p-4 px-6 text-right">Actions</th>
                  </tr>
                )}
                {activeTab === "stops" && (
                  <tr>
                    <th className="p-4 px-6">Stop Name</th>
                    <th className="p-4 px-6">Route</th>
                    <th className="p-4 px-6">Coordinates</th>
                    <th className="p-4 px-6">Pickup / Return</th>
                    <th className="p-4 px-6 text-right">Actions</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-subtle">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-sm font-medium text-muted-foreground">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item: any) => (
                    <tr key={item.id} className="hover:bg-hover/50 transition duration-200">
                      {activeTab === "vehicles" && (
                        <>
                          <td className="p-4 px-6">
                             <div className="flex flex-col">
                               <span className="font-semibold text-primary">{item.registrationNumber}</span>
                               {item.nickname && <span className="text-[10px] text-muted-foreground italic">"{item.nickname}"</span>}
                             </div>
                           </td>
                          <td className="p-4 px-6 font-medium text-foreground">{item.actualRouteName || "—"}</td>
                          <td className="p-4 px-6">
                            <span className={`font-semibold ${Number(item.assignedCount || 0) >= Number(item.capacity || 0) ? 'text-amber-500 font-bold' : 'text-secondary'}`}>
                              {item.assignedCount || 0} / {item.capacity || 0}
                            </span>
                          </td>
                          <td className="p-4 px-6">
                            {item.driverName ? (
                              <div className="flex flex-col">
                                <span className="font-medium text-primary text-xs">{item.driverName}</span>
                                <span className="text-[9px] text-muted">{item.driverPhone}</span>
                              </div>
                            ) : (
                              <span className="text-muted text-xs">—</span>
                            )}
                          </td>
                          <td className="p-4 px-6">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${
                              item.isActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}>
                              {item.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="p-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditBus(item)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-hover text-muted-foreground hover:text-cyan-400 transition"
                                title="Edit Vehicle"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick("bus", { id: item.id, name: item.registrationNumber })}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-hover text-muted-foreground hover:text-rose-500 transition"
                                title="Delete Vehicle"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}

                      {activeTab === "routes" && (
                        <>
                          <td className="p-4 px-6 font-semibold text-primary">{item.routeName}</td>
                          <td className="p-4 px-6 font-medium capitalize text-foreground">{item.type}</td>
                          <td className="p-4 px-6 text-secondary">{item.stopCount ?? 0} stops</td>
                          <td className="p-4 px-6 text-secondary text-xs">{item.assignedBuses || "None"}</td>
                          <td className="p-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditRoute(item)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-hover text-muted-foreground hover:text-cyan-400 transition"
                                title="Edit Route"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick("route", { id: item.id, name: item.routeName })}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-hover text-muted-foreground hover:text-rose-500 transition"
                                title="Delete Route"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}

                      {activeTab === "stops" && (
                        <>
                          <td className="p-4 px-6 font-semibold text-primary">{item.stopName}</td>
                          <td className="p-4 px-6 font-medium text-foreground">{item.routeName || "—"}</td>
                          <td className="p-4 px-6 text-secondary text-xs">
                            {item.latitude !== null && item.longitude !== null
                              ? `${item.latitude}, ${item.longitude}`
                              : "—"}
                          </td>
                          <td className="p-4 px-6 text-secondary text-xs">
                            Pickup: {item.pickupTime} <br /> Return: {item.dropTime}
                          </td>
                          <td className="p-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditStop(item)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-hover text-muted-foreground hover:text-cyan-400 transition"
                                title="Edit Stop"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick("stop", { id: item.id, name: item.stopName })}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-hover text-muted-foreground hover:text-rose-500 transition"
                                title="Delete Stop"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pt-4 border-t border-theme w-full">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="rounded-xl border border-border bg-card px-3 py-1.5 hover:bg-hover transition disabled:opacity-50"
              >
                ← Prev
              </button>
              <span className="tabular-nums">Page {currentPage} of {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="rounded-xl border border-border bg-card px-3 py-1.5 hover:bg-hover transition disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ────────────────── STUDENT TRANSPORT ASSIGNMENTS ────────────────── */}
      {activeTab === "assignments" && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="grid gap-3 sm:grid-cols-4 bg-hover/10 p-4 rounded-2xl border border-border">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Class & Section</label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value ? Number(e.target.value) : "")}
                className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-foreground outline-none"
              >
                <option value="">All Classes</option>
                {classesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    Class {c.name}{c.section ? `-${c.section}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Filter Bus</label>
              <select
                value={busFilter}
                onChange={(e) => setBusFilter(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-foreground outline-none"
              >
                <option value="all">All Buses</option>
                <option value="unassigned">Unassigned Only</option>
                {busesList.map((b) => (
                  <option key={b.id} value={b.id}>
                    Bus {b.registrationNumber}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Filter Route</label>
              <select
                value={routeFilter}
                onChange={(e) => setRouteFilter(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-foreground outline-none"
              >
                <option value="all">All Routes</option>
                {routesList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.routeName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Search Student</label>
              <input
                type="text"
                placeholder="Name or roll number..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-foreground outline-none"
              />
            </div>
          </div>

          {/* Bulk Assign Row */}
          {selectedStudentIds.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl animate-in fade-in">
              <span className="text-xs font-bold text-cyan-400">
                {selectedStudentIds.length} students selected for bulk assignment
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={assignBusId}
                  onChange={(e) => setAssignBusId(e.target.value ? Number(e.target.value) : "")}
                  className="h-9 rounded-lg border border-cyan-500/30 bg-background px-3 text-xs text-primary focus:border-cyan-500 outline-none"
                >
                  <option value="">Select Target Bus...</option>
                  {busesList.filter(b => b.isActive).map((b) => (
                    <option key={b.id} value={b.id}>
                      Bus {b.registrationNumber} ({b.actualRouteName || "No Route"})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBulkAssign}
                  className="h-9 px-4 rounded-lg bg-cyan-500 text-white text-xs font-bold hover:bg-cyan-600 transition"
                >
                  Assign Selected
                </button>
              </div>
            </div>
          )}

          {/* Assignments Table */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="border-b border-border bg-background/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4 px-6 w-12">
                    <input
                      type="checkbox"
                      className="rounded border-border text-cyan-500 focus:ring-cyan-500/20"
                      checked={studentsList.length > 0 && selectedStudentIds.length === studentsList.length}
                      onChange={handleSelectAllStudents}
                    />
                  </th>
                  <th className="p-4 px-6">Student</th>
                  <th className="p-4 px-6">Class</th>
                  <th className="p-4 px-6">Assignment Details</th>
                  <th className="p-4 px-6">Times</th>
                  <th className="p-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {loadingStudents ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-xs font-semibold text-muted-foreground animate-pulse">
                      Loading transport roster...
                    </td>
                  </tr>
                ) : paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-sm font-medium text-muted-foreground">
                      No matching students found.
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student) => {
                    const isSelected = selectedStudentIds.includes(student.id);
                    return (
                      <tr key={student.id} className={`hover:bg-hover/50 transition duration-200 ${isSelected ? 'bg-cyan-500/5' : ''}`}>
                        <td className="p-4 px-6">
                          <input
                            type="checkbox"
                            className="rounded border-border text-cyan-500 focus:ring-cyan-500/20"
                            checked={isSelected}
                            onChange={() => handleSelectStudentToggle(student.id)}
                          />
                        </td>
                        <td className="p-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-primary text-xs">{student.name}</span>
                            <span className="text-[9px] text-muted">Roll: {student.rollNumber || "—"}</span>
                          </div>
                        </td>
                        <td className="p-4 px-6 font-medium text-foreground text-xs">
                          {student.className}{student.classSection ? `-${student.classSection}` : ""}
                        </td>
                        <td className="p-4 px-6">
                          {student.assignedBusId ? (
                            <div className="flex flex-col gap-0.5 text-xs text-secondary">
                              <span className="font-bold text-cyan-400">Bus: {student.assignedBusNumber}</span>
                              <span>Route: {student.routeName || "—"}</span>
                              <span className="text-[10px] text-muted">Stop: {student.pickupStopName || "—"}</span>
                            </div>
                          ) : (
                            <span className="inline-flex rounded-full bg-slate-500/10 px-2.5 py-0.5 text-[9px] font-semibold text-slate-500 border border-slate-500/20">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="p-4 px-6 text-xs text-secondary">
                          {student.morningPickupTime ? (
                            <div className="flex flex-col">
                              <span>Pickup: {student.morningPickupTime}</span>
                              <span>Return: {student.returnTime}</span>
                            </div>
                          ) : (
                            "——"
                          )}
                        </td>
                        <td className="p-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {student.assignedBusId ? (
                              <button
                                onClick={() => openAssignModal(student)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-hover text-muted-foreground hover:text-cyan-400 transition"
                                title="Edit Assignment"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => openAssignModal(student)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-hover text-muted-foreground hover:text-cyan-400 transition"
                                title="Assign Transport"
                              >
                                <UserPlus className="h-4 w-4" />
                              </button>
                            )}
                            {student.assignedBusId && (
                              <button
                                onClick={() => handleRemoveStudent(student.id, student.assignedBusId)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-hover text-muted-foreground hover:text-rose-500 transition"
                                title="Remove Assignment"
                              >
                                <UserMinus className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Assignments Pagination */}
          {totalStudentPages > 1 && (
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pt-4 border-t border-theme w-full">
              <button
                disabled={studentPage === 1}
                onClick={() => setStudentPage((p) => p - 1)}
                className="rounded-xl border border-border bg-card px-3 py-1.5 hover:bg-hover transition disabled:opacity-50"
              >
                ← Prev
              </button>
              <span className="tabular-nums">Page {studentPage} of {totalStudentPages}</span>
              <button
                disabled={studentPage === totalStudentPages}
                onClick={() => setStudentPage((p) => p + 1)}
                className="rounded-xl border border-border bg-card px-3 py-1.5 hover:bg-hover transition disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ────────────────── LIVE FLEET MAP TAB ────────────────── */}
      {activeTab === "tracking" && (
        <div className="animate-in fade-in duration-300">
          <AdminLiveBusMap initialBuses={initialTrackingSnapshots} />
        </div>
      )}

      {/* ────────────────── STUDENT ASSIGN MODAL ────────────────── */}
      {showAssignModal && assigningStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-md font-bold text-primary">Assign Student Transport</h3>
                <p className="text-xs text-secondary mt-0.5">Assigning: {assigningStudent.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssigningStudent(null);
                }}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitAssignment} className="space-y-4 text-left">
              <div>
                <label className={labelCls}>Select Bus *</label>
                <select
                  value={assignFormData.busId}
                  onChange={(e) => handleAssignBusChange(Number(e.target.value))}
                  required
                  className={selectCls}
                >
                  <option value="" disabled>Select vehicle...</option>
                  {busesList.filter(b => b.isActive).map((b) => (
                    <option key={b.id} value={b.id}>
                      Bus {b.registrationNumber} ({b.assignedCount || 0}/{b.capacity || 0} seats - {b.actualRouteName || "No Route"})
                    </option>
                  ))}
                </select>
              </div>

              {assignFormData.busId && (
                <>
                  <div>
                    <label className={labelCls}>Route</label>
                    <input
                      type="text"
                      disabled
                      value={
                        routesList.find(r => r.id === Number(assignFormData.routeId))?.routeName ||
                        "No route assigned to this bus"
                      }
                      className="input-theme disabled:opacity-50 text-xs font-semibold"
                    />
                  </div>

                  {assignFormData.routeId ? (
                    (() => {
                      const stopsForRoute = stopsList.filter(s => s.routeId === Number(assignFormData.routeId));
                      return (
                        <>
                          <div>
                            <label className={labelCls}>Select Pickup Stop *</label>
                            <select
                              value={assignFormData.pickupStopId}
                              onChange={(e) => handleAssignStopChange(Number(e.target.value), stopsForRoute)}
                              required
                              className={selectCls}
                            >
                              <option value="" disabled>Select Stop...</option>
                              {stopsForRoute.map((stop) => (
                                <option key={stop.id} value={stop.id}>
                                  Stop {stop.sequenceNumber}: {stop.stopName} (Pickup: {stop.pickupTime})
                                </option>
                              ))}
                            </select>
                          </div>

                          {assignFormData.pickupStopId && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={labelCls}>Pickup Time</label>
                                <input
                                  type="text"
                                  value={assignFormData.morningPickupTime}
                                  onChange={(e) => setAssignFormData({ ...assignFormData, morningPickupTime: e.target.value })}
                                  className={inputCls}
                                  placeholder="e.g. 8:10 AM"
                                />
                              </div>
                              <div>
                                <label className={labelCls}>Return Time</label>
                                <input
                                  type="text"
                                  value={assignFormData.returnTime}
                                  onChange={(e) => setAssignFormData({ ...assignFormData, returnTime: e.target.value })}
                                  className={inputCls}
                                  placeholder="e.g. 4:35 PM"
                                />
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <p className="text-xs text-amber-500 font-medium">
                      Please assign a route to this vehicle first in the Vehicles tab.
                    </p>
                  )}
                </>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isPending || !assignFormData.routeId}
                  className="flex-1 rounded-xl btn-emerald py-2 text-xs font-bold disabled:opacity-50"
                >
                  {isPending ? "Assigning..." : "Confirm Assignment"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssigningStudent(null);
                  }}
                  className="flex-1 rounded-xl border border-theme bg-surface py-2 text-xs font-bold text-primary hover:bg-hover transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title={`Delete ${deleteType === "bus" ? "Bus Profile" : deleteType === "route" ? "Route" : "Stop"}?`}
        message={`Are you sure you want to delete "${targetToDelete?.name}"? All related associations will be updated.`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setTargetToDelete(null);
          setDeleteType(null);
        }}
      />
    </div>
  );
}
