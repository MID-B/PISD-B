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

/* PEMETAAN NAMA DEPARTEMEN KE UUID SUPABASE */
const DEPARTMENT_UUID_MAP: Record<string, string> = {
  "Human Resources": "72cd470d-216c-48b6-abd9-0cd05a4d8974",
  "Logistics & Shipment Operations": "d38c1ed7-abd4-4a57-ab9d-0ba1d396fbfc",
  "Information Technology": "8113ab6f-d5cc-4c94-bbf6-e08047931fab",
  "Finance, Accounting & Tax": "1653db5f-2b64-418f-b28b-68cb7b9dae8e",
  "Commercial & Customer Success": "97ac5d35-5da2-4f5d-9d36-78500f403cc7",
};

/* PEMETAAN UUID DEPARTEMEN KE NAMA TAMPILAN */
const UUID_DEPARTMENT_MAP: Record<string, string> = {
  "72cd470d-216c-48b6-abd9-0cd05a4d8974": "Human Resources",
  "d38c1ed7-abd4-4a57-ab9d-0ba1d396fbfc": "Logistics & Shipment Operations",
  "8113ab6f-d5cc-4c94-bbf6-e08047931fab": "Information Technology",
  "1653db5f-2b64-418f-b28b-68cb7b9dae8e": "Finance, Accounting & Tax",
  "97ac5d35-5da2-4f5d-9d36-78500f403cc7": "Commercial & Customer Success",
};

/* PEMETAAN NAMA JABATAN KE UUID SUPABASE */
const POSITION_UUID_MAP: Record<string, string> = {
  "Freight Forwarding Specialist": "40a8e1f1-0713-4e5d-a7af-061b6e5f495c",
  "HR Administrator": "96c66ea1-44b6-474f-9410-ad992dd14b93",
  "Information Technology": "265c9357-105c-437c-a244-6897122f17c1",
  "Accounting Associate": "10da1bac-a6a8-472e-a171-e4984ab768d9",
  "Sales Executive": "58706b7f-950b-4e71-b066-792fbd91424d",
  "Director": "0ec333af-8737-413f-adab-841a3067e485",
};

/* PEMETAAN UUID JABATAN KE NAMA TAMPILAN */
const UUID_POSITION_MAP: Record<string, string> = {
  "40a8e1f1-0713-4e5d-a7af-061b6e5f495c": "Freight Forwarding Specialist",
  "96c66ea1-44b6-474f-9410-ad992dd14b93": "HR Administrator",
  "265c9357-105c-437c-a244-6897122f17c1": "Information Technology",
  "10da1bac-a6a8-472e-a171-e4984ab768d9": "Accounting Associate",
  "58706b7f-950b-4e71-b066-792fbd91424d": "Sales Executive",
  "0ec333af-8737-413f-adab-841a3067e485": "Director",
};

/* TYPES */
type Employee = {
  id: string;
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

{/* PROFILE */}
        function CompanyLogo() {
          return (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "#3B6FF5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(59,111,245,0.3)",
                  flexShrink: 0,
                }}
              >
                <svg
                  style={{ width: "20px", height: "20px", color: "#ffffff" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457-.39-2.823-1.07-4"
                  />
                </svg>
              </div>
              <div>
                <div style={{ color: "#ffffff", fontSize: "14px", fontWeight: 800, letterSpacing: "0.5px" }}>
                  ANDIMA
                </div>
                <div style={{ color: "#B0C6D4", fontSize: "10px", marginTop: "1px" }}>
                  Logistics Suite
                </div>
              </div>
            </div>
          );
        }

/* SMKI PAGE MAIN COMPONENT */
export default function SmkiPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
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

  // State untuk Modal Konfirmasi Status
  const [statusConfirmEmployee, setStatusConfirmEmployee] = useState<Employee | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  /* 1. FETCH DATA KARYAWAN DARI TABEL SUPABASE b2_register */
  const fetchEmployeesFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from("b2_register")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Gagal mengambil data karyawan:", error.message);
        return;
      }

      if (data) {
        const mappedData: Employee[] = data.map((item: any) => {
          const name = item.full_name || "Karyawan";
          const firstChar = name.trim().charAt(0).toUpperCase();

          return {
            id: item.id || item.employee_id,
            employeeId: item.employee_id || "EMP-000",
            initial: firstChar || "A",
            name: item.full_name || "Karyawan",
            email: item.email || "",
            phone: item.phone || item.phone || "-",
            department: UUID_DEPARTMENT_MAP[item.departement_id] || "Information Technology",
            position: UUID_POSITION_MAP[item.position_id] || "Information Technology",
            employmentStatus: item.employment_status || "Permanent",
            isActive: item.is_active !== false,
          };
        });

        setEmployees(mappedData);
      }
    } catch (err) {
      console.error("Error Fetching Data:", err);
    }
  };

  /* 2. PROTEKSI HAK AKSES DEPARTEMEN IT */
  useEffect(() => {
    const checkITUserAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const { data: userData, error } = await supabase
        .from("b2_register")
        .select("departement_id")
        .ilike("email", session.user.email || "")
        .maybeSingle();

      const IT_DEPARTMENT_UUID = "8113ab6f-d5cc-4c94-bbf6-e08047931fab";

      if (error || !userData || userData.departement_id !== IT_DEPARTMENT_UUID) {
        alert("Akses ditolak. Halaman ini khusus untuk Tim IT / Security Admin.");
        router.push("/login");
        return;
      }

      await fetchEmployeesFromSupabase();
      setIsLoading(false);
    };

    checkITUserAndFetchData();
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

  /* 3. UPDATE STATUS KEAKTIFAN AKUN DI SUPABASE */
  const handleConfirmToggleStatus = async () => {
    if (!statusConfirmEmployee) return;

    const targetId = statusConfirmEmployee.id;
    const willBeActive = !statusConfirmEmployee.isActive;

    try {
      const { error } = await supabase
        .from("b2_register")
        .update({ is_active: willBeActive })
        .eq("email", statusConfirmEmployee.email);

      if (error) {
        alert("Gagal memperbarui status keaktifan di database: " + error.message);
        return;
      }

      setEmployees((prev) =>
        prev.map((emp) => {
          if (emp.id === targetId) {
            return { ...emp, isActive: willBeActive };
          }
          return emp;
        })
      );
    } catch (err) {
      alert("Terjadi kesalahan sistem saat memperbarui status.");
    } finally {
      setStatusConfirmEmployee(null);
    }
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

  /* 4. UPDATE DATA EDIT KARYAWAN KE SUPABASE */
  const handleSaveEdit = async (e: React.FormEvent) => {
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

    try {
      const selectedDeptUuid = DEPARTMENT_UUID_MAP[editForm.department];
      const selectedPosUuid = POSITION_UUID_MAP[editForm.position];

      let query = supabase
        .from("b2_register")
        .update({
          full_name: editForm.name.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim(),
          departement_id: selectedDeptUuid,
          position_id: selectedPosUuid,
          employment_status: editForm.employmentStatus,
        });
      if (editingEmployee?.id) {
        query = query.eq("id", editingEmployee.id);
      } else {
        query = query.ilike("email", editingEmployee?.email.trim() || "");
      }

      const { data, error } = await query.select();

      if (error) {
        setErrorMessage("Gagal memperbarui data di Supabase: " + error.message);
        return;
      }

      // Cek apakah ada baris yang benar-benar ter-update
      if (!data || data.length === 0) {
        setErrorMessage("Data tidak ditemukan di Supabase. Periksa izin RLS UPDATE tabel b2_register.");
        return;
      }

      await fetchEmployeesFromSupabase();
      setEditingEmployee(null);
    } catch (err) {
      setErrorMessage("Terjadi kesalahan sistem saat menyimpan data.");
    }
  };

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
      <aside style={{ width: "250px", height: "100vh", flexShrink: 0, position: "relative", padding: "24px 16px", background: "#0f2038", color: "#fff", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
        
        
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
        <button
          onClick={handleLogout}
          style={{width: "100%", height: "44px", borderRadius: "22px", border: "2px solid #f43f5e", background: "transparent", color: "#f43f5e", display: "flex",
            alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "15px", fontWeight: 700, marginTop: "auto", transition: "all 0.2s ease",
          }}
        >
          Logout
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
        <section style={{ flex: 1, height: "100vh", background: "#ffffff", display: "flex", flexDirection: "column", overflow: "hidden", boxSizing: "border-box" }}>

          {/* 1. TOP BAR / HEADER (PROFIL DI KANAN) */}
          <header style={{ width: "100%", height: "56px", padding: "0 24px", background: "#ffffff", borderBottom: "1px solid #e2e8f0", color: "#0f172a", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>ANDIMA SMKI</span>
              <span style={{ color: "#cbd5e1" }}>|</span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>Account Maintains</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {/* Badge Notifikasi Red */}
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#ef4444", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700 }}>
                3
              </div>

              {/* Profil Guest */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#bbf7d0", color: "#166534", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800 }}>
                  A
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#0f172a", lineHeight: "1.2" }}>Joko Rusdi</div>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>Guest</div>
                </div>
              </div>
            </div>
          </header>

          {/* AREA KONTEN (FILTER + TABEL) */}
          <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto", boxSizing: "border-box" }}>
            
            {/* 2. TOMBOL FILTER (DI BAWAH TOP BAR, DI ATAS TABEL) */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "14px", position: "relative" }}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                style={{ padding: "6px 16px", border: "1px solid #cbd5e1", borderRadius: "16px", background: "#475569", color: "#fff", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                <span>Filter</span>
                <ChevronDownIcon />
              </button>

              {isFilterOpen && (
                <div style={{ position: "absolute", right: 0, top: "36px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 30, width: "220px", overflow: "hidden" }}>
                  <button
                    onClick={() => { setSelectedDepartment("All"); setIsFilterOpen(false); }}
                    style={{ width: "100%", padding: "10px 16px", background: selectedDepartment === "All" ? "#0550D7" : "transparent", color: selectedDepartment === "All" ? "#fff" : "#1e293b", border: 0, textAlign: "left", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                  >
                    All
                  </button>
                  {DEPARTMENT_OPTIONS.map((dept) => (
                    <button
                      key={dept}
                      onClick={() => { setSelectedDepartment(dept); setIsFilterOpen(false); }}
                      style={{ width: "100%", padding: "10px 16px", background: selectedDepartment === dept ? "#0550D7" : "transparent", color: selectedDepartment === dept ? "#fff" : "#1e293b", border: 0, textAlign: "left", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. TABEL DATA (DI BAWAH FILTER) */}
            <div style={{ background: "#ffffff", borderRadius: "6px", border: "1px solid #e2e8f0", overflow: "hidden", width: "100%" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr 0.8fr", alignItems: "center", padding: "10px 16px", background: "#f8fafc", color: "#64748b", fontSize: "11px", fontWeight: 800, letterSpacing: "0.5px", borderBottom: "1px solid #e2e8f0" }}>
                <div>EMPLOYEE'S NAME</div>
                <div>E-MAIL</div>
                <div>ROLE</div>
                <div style={{ textAlign: "center" }}>ACTION</div>
              </div>

              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <div key={employee.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr 0.8fr", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #f1f5f9", fontSize: "12px", color: !employee.isActive ? "#94a3b8" : "#1e293b", background: "#ffffff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700 }}>
                      <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#cbd5e1", color: "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, flexShrink: 0 }}>
                        {employee.initial}
                      </span>
                      <span>{employee.name}</span>
                    </div>
                    <div style={{ color: "#64748b" }}>{employee.email}</div>
                    <div style={{ fontWeight: 600, color: "#334155" }}>HRMS</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }}>
                      <button onClick={() => handleOpenEdit(employee)} style={{ border: 0, background: "transparent", cursor: "pointer", padding: 0 }}>
                        <EditIcon />
                      </button>
                      <button onClick={() => handleOpenStatusConfirm(employee)} style={{ border: 0, background: "transparent", cursor: "pointer", padding: 0 }}>
                        <DisableIcon active={employee.isActive} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: "12px" }}>
                  No employees found.
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