"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* MASTER DATA OPTIONS */
const DEPARTMENT_OPTIONS = [
  "Human Resources",
  "Logistics & Shipment Operations",
  "Information Technology",
  "Finance, Accounting & Tax",
  "Commercial & Customer Success",
];

const POSITION_OPTIONS = [
  "Freight Forwarding Specialist",
  "HR Administrator",
  "Information Technology",
  "Director",
  "Accounting Associate",
  "Sales Executive",
];

/* TYPES */
type Employee = {
  id: number;
  employeeId: string;
  initial: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  employmentStatus: "Probation" | "Permanent";
  isActive: boolean;
};

/* INITIAL DUMMY DATA */
const initialEmployees: Employee[] = [
  { id: 1, employeeId: "EMP-001", initial: "J", name: "Jovan Juan", email: "JovanJJ@andima.co.id", phone: "081234567890", department: "Human Resources", position: "HR Administrator", employmentStatus: "Permanent", isActive: true },
  { id: 2, employeeId: "EMP-002", initial: "H", name: "Hendro Saputra", email: "HendroSapt67@andima.co.id", phone: "081298765432", department: "Human Resources", position: "HR Administrator", employmentStatus: "Probation", isActive: true },
  { id: 3, employeeId: "EMP-003", initial: "A", name: "Ahmad Syahreza", email: "RezaAhmad@andima.co.id", phone: "081311223344", department: "Commercial & Customer Success", position: "Sales Executive", employmentStatus: "Permanent", isActive: true },
  { id: 4, employeeId: "EMP-004", initial: "K", name: "Kresna Made", email: "Made12Kresna@andima.co.id", phone: "081255667788", department: "Logistics & Shipment Operations", position: "Freight Forwarding Specialist", employmentStatus: "Permanent", isActive: false },
  { id: 5, employeeId: "EMP-005", initial: "G", name: "Genaro Arya", email: "Genaro16@andima.co.id", phone: "081399887766", department: "Information Technology", position: "Information Technology", employmentStatus: "Probation", isActive: true },
  { id: 6, employeeId: "EMP-006", initial: "D", name: "Dimas Wibowo", email: "DimasWibo45@andima.co.id", phone: "081244556677", department: "Finance, Accounting & Tax", position: "Accounting Associate", employmentStatus: "Permanent", isActive: true },
];

/* SVG ICONS */
function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: "20px", height: "20px", flexShrink: 0, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="12" cy="9" r="3" />
      <path d="M7 19c.7-3 2.4-4.5 5-4.5s4.3 1.5 5 4.5" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: "20px", height: "20px", flexShrink: 0, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}>
      <circle cx="7" cy="8" r="3" />
      <circle cx="17" cy="8" r="3" />
      <path d="M2.5 19c.5-3 2-4.5 4.5-4.5S11 16 11.5 19" />
      <path d="M12.5 19c.5-3 2-4.5 4.5-4.5s4 1.5 4.5 4.5" />
    </svg>
  );
}

function LoginIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: "20px", height: "20px", flexShrink: 0, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="9" r="2.5" />
      <path d="M7.5 18c.7-2.8 2.2-4.2 4.5-4.2s3.8 1.4 4.5 4.2" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: "18px", height: "18px", display: "block", color: "#475569", fill: "currentColor" }}>
      <path d="M4.5 16.9V20h3.1L18.7 8.9l-3.1-3.1L4.5 16.9Z" fill="currentColor" />
      <path d="M14.5 7.7l3.1 3.1" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function DisableIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: "18px", height: "18px", display: "block", color: active ? "#64748b" : "#ef4444", fill: "currentColor" }}>
      <path d="M8.2 8.3a3.2 3.2 0 1 1 6.4 0 3.2 3.2 0 0 1-6.4 0Z" fill="currentColor" />
      <path d="M5.7 19.2c.4-3.1 2.3-5 5.7-5s5.3 1.9 5.7 5" fill="currentColor" />
      {!active && <path d="M5 5l14 14" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />}
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" style={{ width: "22px", height: "22px", flexShrink: 0, color: "#f42d5b", fill: "none" }}>
      <path d="M17 4H7.5C6.7 4 6 4.7 6 5.5v17c0 .8.7 1.5 1.5 1.5H17" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 14h11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M19 9l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: "18px", height: "18px", fill: "none", stroke: "#fff", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" }}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: "14px", height: "14px", fill: "none", stroke: "#fff", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/* SMKI PAGE MAIN COMPONENT */
export default function SmkiPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All");
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // State untuk Modal Edit
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    email: string;
    phone: string;
    department: string;
    position: string;
    employmentStatus: "Probation" | "Permanent";
    newPassword?: string;
  }>({
    name: "",
    email: "",
    phone: "",
    department: DEPARTMENT_OPTIONS[0],
    position: POSITION_OPTIONS[0],
    employmentStatus: "Permanent",
    newPassword: "",
  });

  // State untuk Modal Konfirmasi Toggle Status
  const [statusConfirmEmployee, setStatusConfirmEmployee] = useState<Employee | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  /* =========================================================
     PROTEKSI HALAMAN: Verifikasi UUID IT secara Otomatis
  ========================================================= */
  useEffect(() => {
    const checkITUser = async () => {
      // 1. Cek session user yang sedang login
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Jika belum login, lempar ke halaman login
        router.push("/login");
        return;
      }

      // 2. Ambil departement_id milik user yang sedang aktif
      const { data: userData, error } = await supabase
        .from("b2_register")
        .select("departement_id")
        .eq("email", session.user.email)
        .maybeSingle();

      // UUID Departemen IT
      const IT_DEPARTMENT_UUID = "8113ab6f-d5cc-4c94-bbf6-e08047931fab";

      // 3. Jika BUKAN tim IT, lempar balik ke login
      if (error || !userData || userData.departement_id !== IT_DEPARTMENT_UUID) {
        alert("Akses ditolak. Halaman ini khusus untuk Tim IT / Security Admin.");
        router.push("/login");
        return;
      }

      setIsLoading(false);
    };

    checkITUser();
  }, [router]);

  // Handler Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Handler Filter Department
  const filteredEmployees = employees.filter((emp) => {
    if (selectedDepartment === "All") return true;
    return emp.department.toLowerCase() === selectedDepartment.toLowerCase();
  });

  // Buka Modal Konfirmasi Status
  const handleOpenStatusConfirm = (emp: Employee) => {
    setStatusConfirmEmployee(emp);
  };

  // Eksekusi Ubah Status setelah Dikonfirmasi
  const handleConfirmToggleStatus = () => {
    if (!statusConfirmEmployee) return;

    const targetId = statusConfirmEmployee.id;
    const willBeActive = !statusConfirmEmployee.isActive;

    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === targetId) {
          return { ...emp, isActive: willBeActive };
        }
        return emp;
      })
    );

    setStatusConfirmEmployee(null);
  };

  // Handler Buka Modal Edit
  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditForm({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      position: emp.position,
      employmentStatus: emp.employmentStatus,
      newPassword: "",
    });
    setErrorMessage("");
  };

  // Handler Simpan Perubahan Modal Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!editForm.name.trim()) {
      setErrorMessage("Full name is required.");
      return;
    }

    if (!editForm.email.trim() || !editForm.email.includes("@")) {
      setErrorMessage("Invalid e-mail format.");
      return;
    }

    if (!editForm.phone.trim()) {
      setErrorMessage("Phone number is required.");
      return;
    }

    if (editForm.newPassword && editForm.newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters.");
      return;
    }

    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === editingEmployee?.id) {
          const firstChar = editForm.name.trim().charAt(0).toUpperCase();
          return {
            ...emp,
            name: editForm.name.trim(),
            email: editForm.email.trim(),
            phone: editForm.phone.trim(),
            department: editForm.department,
            position: editForm.position,
            employmentStatus: editForm.employmentStatus,
            initial: firstChar || emp.initial,
          };
        }
        return emp;
      })
    );

    setEditingEmployee(null);
  };

  // Tampilkan layar loading saat pengecekan hak akses
  if (isLoading) {
    return (
      <div style={{ background: "#07111f", color: "#fff", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        Loading Dashboard IT...
      </div>
    );
  }

  return (
    <main style={{ width: "100vw", height: "100vh", display: "flex", background: "#000", overflow: "hidden", fontFamily: "Arial, Helvetica, sans-serif", margin: 0, padding: 0, boxSizing: "border-box" }}>

      {/* SIDEBAR */}
      <aside style={{ width: "240px", height: "100vh", flexShrink: 0, position: "relative", padding: "25px 16px", background: "#07111f", color: "#fff", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
        
        {/* PROFILE */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{ width: "45px", height: "45px", borderRadius: "50%", background: "#8057e8", flexShrink: 0 }} />
          <div>
            <div style={{ color: "#fff", fontSize: "15px", fontWeight: 800, letterSpacing: "0.2px" }}>ANDIMA</div>
            <div style={{ color: "#b9c1ca", fontSize: "11px", marginTop: "2px" }}>IT & Security Admin</div>
            <div style={{ color: "#b9c1ca", fontSize: "11px", marginTop: "1px" }}>@admin_smki</div>
          </div>
        </div>

        {/* COLLAPSE BUTTON */}
        <button style={{ position: "absolute", top: "28px", right: "-12px", width: "26px", height: "26px", borderRadius: "50%", background: "#8057e8", border: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
          <ChevronLeftIcon />
        </button>

        {/* NAVIGATION */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1, marginTop: "15px" }}>
          <button style={{ width: "100%", height: "42px", padding: "0 16px", border: 0, borderRadius: "10px", background: "#8057e8", color: "#fff", display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
            <AccountIcon />
            <span>Account Maintains</span>
          </button>

          <button style={{ width: "100%", height: "42px", padding: "0 16px", border: 0, borderRadius: "10px", background: "transparent", color: "#94a3b8", display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
            <ActivityIcon />
            <span>Log Activity</span>
          </button>

          <button style={{ width: "100%", height: "42px", padding: "0 16px", border: 0, borderRadius: "10px", background: "transparent", color: "#94a3b8", display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
            <LoginIcon />
            <span>Log Login</span>
          </button>
        </nav>

        {/* LOGOUT */}
        <button onClick={handleLogout} style={{ width: "100%", height: "40px", padding: "0 12px", border: 0, background: "transparent", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontSize: "14px", fontWeight: 600, marginTop: "auto" }}>
          <span>Logout</span>
          <LogoutIcon />
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <section style={{ flex: 1, height: "100vh", background: "#f8f9fc", display: "flex", flexDirection: "column", overflow: "hidden", boxSizing: "border-box" }}>

        {/* HEADER */}
        <header style={{ width: "100%", height: "72px", minHeight: "72px", padding: "0 28px", background: "#0d1b2a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, boxSizing: "border-box", position: "relative" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#8057e8", letterSpacing: "1px" }}>ANDIMA MID</div>
            <div style={{ fontSize: "18px", fontWeight: 700, marginTop: "2px" }}>SMKI Employee Dashboard</div>
          </div>

          {/* FILTER DROPDOWN */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              style={{ padding: "8px 16px", border: "1px solid #202d3d", borderRadius: "8px", background: "#172536", color: "#fff", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
            >
              <span>Filter Department: {selectedDepartment}</span>
              <ChevronDownIcon />
            </button>

            {isFilterOpen && (
              <div style={{ position: "absolute", right: 0, top: "45px", background: "#172536", border: "1px solid #202d3d", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", zIndex: 30, width: "240px", overflow: "hidden" }}>
                <button
                  onClick={() => {
                    setSelectedDepartment("All");
                    setIsFilterOpen(false);
                  }}
                  style={{ width: "100%", padding: "10px 16px", background: selectedDepartment === "All" ? "#8057e8" : "transparent", color: "#fff", border: 0, textAlign: "left", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                >
                  All
                </button>
                {DEPARTMENT_OPTIONS.map((dept) => (
                  <button
                    key={dept}
                    onClick={() => {
                      setSelectedDepartment(dept);
                      setIsFilterOpen(false);
                    }}
                    style={{ width: "100%", padding: "10px 16px", background: selectedDepartment === dept ? "#8057e8" : "transparent", color: "#fff", border: 0, textAlign: "left", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* CONTENT & TABLE */}
        <div style={{ flex: 1, padding: "28px", background: "#f8f9fc", overflowY: "auto", boxSizing: "border-box" }}>
          <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)", overflow: "hidden", width: "100%" }}>

            {/* TABLE HEADER - 5 COLUMNS */}
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.3fr 1.2fr 1.2fr 0.6fr", alignItems: "center", padding: "14px 20px", background: "#f1f5f9", color: "#475569", fontSize: "11px", fontWeight: 800, letterSpacing: "0.5px", boxSizing: "border-box" }}>
              <div>EMPLOYEE'S NAME</div>
              <div>E-MAIL</div>
              <div>DEPARTMENT</div>
              <div>POSITION</div>
              <div style={{ textAlign: "center" }}>ACTION</div>
            </div>

            {/* TABLE ROWS */}
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((employee) => {
                const isInactive = !employee.isActive;

                return (
                  <div
                    key={employee.id}
                    style={{ display: "grid", gridTemplateColumns: "1.3fr 1.3fr 1.2fr 1.2fr 0.6fr", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #f1f5f9", fontSize: "13px", color: isInactive ? "#94a3b8" : "#1e293b", background: isInactive ? "#f8fafc" : "#ffffff", transition: "all 0.2s ease", boxSizing: "border-box" }}
                  >
                    {/* Name & ID */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", fontWeight: 700 }}>
                      <span
                        style={{ width: "28px", height: "28px", borderRadius: "50%", background: isInactive ? "#cbd5e1" : "#e2e8f0", color: isInactive ? "#64748b" : "#475569", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0 }}
                      >
                        {employee.initial}
                      </span>
                      <div>
                        <div>{employee.name}</div>
                        <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 500 }}>{employee.employeeId} • {employee.employmentStatus}</div>
                      </div>
                    </div>

                    {/* Email */}
                    <div style={{ color: isInactive ? "#cbd5e1" : "#64748b" }}>
                      {employee.email}
                    </div>

                    {/* Department */}
                    <div style={{ fontWeight: 600, color: isInactive ? "#94a3b8" : "#334155" }}>
                      {employee.department}
                    </div>

                    {/* Position */}
                    <div style={{ fontWeight: 600, color: isInactive ? "#94a3b8" : "#334155" }}>
                      {employee.position}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }}>
                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenEdit(employee)}
                        title="Edit Employee Data"
                        style={{ border: 0, background: "transparent", cursor: "pointer", padding: 0, opacity: isInactive ? 0.4 : 1 }}
                      >
                        <EditIcon />
                      </button>

                      {/* Disable/Enable Button */}
                      <button
                        onClick={() => handleOpenStatusConfirm(employee)}
                        title={employee.isActive ? "Deactivate Employee" : "Reactivate Employee"}
                        style={{ border: 0, background: "transparent", cursor: "pointer", padding: 0 }}
                      >
                        <DisableIcon active={employee.isActive} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                No employees found for department <b>{selectedDepartment}</b>.
              </div>
            )}

          </div>
        </div>
      </section>

      {/* EDIT KARYAWAN */}
      {editingEmployee && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ width: "100%", maxWidth: "520px", background: "#ffffff", borderRadius: "16px", padding: "28px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", boxSizing: "border-box" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                Edit Account ({editingEmployee.employeeId})
              </h3>
              <button
                onClick={() => setEditingEmployee(null)}
                style={{ border: 0, background: "transparent", fontSize: "20px", cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#ef4444", padding: "10px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, marginBottom: "16px" }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Full Name */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              {/* Email & Phone */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>Email Address</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>Phone Number</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {/* Employment Status */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>Employment Status</label>
                <select
                  value={editForm.employmentStatus}
                  onChange={(e) => setEditForm({ ...editForm, employmentStatus: e.target.value as "Probation" | "Permanent" })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#fff", boxSizing: "border-box" }}
                >
                  <option value="Probation">Probation</option>
                  <option value="Permanent">Permanent</option>
                </select>
              </div>

              {/* Position & Department */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>Position</label>
                  <select
                    value={editForm.position}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#fff", boxSizing: "border-box" }}
                  >
                    {POSITION_OPTIONS.map((pos) => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>Department</label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#fff", boxSizing: "border-box" }}
                  >
                    {DEPARTMENT_OPTIONS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reset Password Optional */}
              <div style={{ marginTop: "6px", paddingTop: "12px", borderTop: "1px solid #e2e8f0" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>
                  Reset Password <span style={{ color: "#94a3b8", fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter new password to reset"
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "20px" }}>
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  style={{ padding: "12px 20px", borderRadius: "12px", border: 0, background: "#1e293b", color: "#ffffff", fontSize: "14px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s ease" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "12px 20px", borderRadius: "12px", border: 0, background: "#3B6FF5", color: "#ffffff", fontSize: "14px", fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 20px rgba(59,111,245,0.35)", transition: "all 0.2s ease" }}
                >
                  Edit User
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* CONFIRMATION STATUS */}
      {statusConfirmEmployee && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ width: "100%", maxWidth: "420px", background: "#ffffff", borderRadius: "16px", padding: "28px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", textAlign: "center", boxSizing: "border-box" }}>
            
            <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: statusConfirmEmployee.isActive ? "#fee2e2" : "#dbeafe", color: statusConfirmEmployee.isActive ? "#ef4444" : "#3B6FF5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto" }}>
              <DisableIcon active={!statusConfirmEmployee.isActive} />
            </div>

            <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
              {statusConfirmEmployee.isActive ? "Deactivate Employee?" : "Activate Employee?"}
            </h3>

            <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5", margin: "0 0 24px 0" }}>
              Are you sure you want to {statusConfirmEmployee.isActive ? "deactivate" : "reactivate"}{" "}
              <b>{statusConfirmEmployee.name}</b> ({statusConfirmEmployee.employeeId})?
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setStatusConfirmEmployee(null)}
                style={{ padding: "12px 20px", borderRadius: "12px", border: 0, background: "#1e293b", color: "#ffffff", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleStatus}
                style={{ padding: "12px 20px", borderRadius: "12px", border: 0, background: statusConfirmEmployee.isActive ? "#ef4444" : "#3B6FF5", color: "#ffffff", fontSize: "14px", fontWeight: 700, cursor: "pointer", boxShadow: statusConfirmEmployee.isActive ? "0 4px 14px rgba(239,68,68,0.35)" : "0 4px 14px rgba(59,111,245,0.35)" }}
              >
                {statusConfirmEmployee.isActive ? "Yes, Deactivate" : "Yes, Activate"}
              </button>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}
