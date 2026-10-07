"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getLoginDestination } from "@/lib/loginDestination";

// Imported from Andima-SMKI features/log-activity @ 02a29c7, including feature/maintenance.

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

type ActivityLog = {
  id: string;
  name: string;
  email: string;
  department: string;
  departmentLabel: string;
  role: string;
  description: string;
  createdAt: string;
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

function ActivityUserIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" style={{ width: "15px", height: "15px", flexShrink: 0, fill: "currentColor" }}>
      <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 1.5c-3.1 0-5.5 1.6-5.5 3.7V15h11v-1.8c0-2.1-2.4-3.7-5.5-3.7Z" />
    </svg>
  );
}

function ChevronDownIcon({ isOpen }: { isOpen?: boolean }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      style={{ 
        width: "14px", 
        height: "14px", 
        fill: "none", 
        stroke: "currentColor", 
        strokeWidth: 2, 
        strokeLinecap: "round", 
        strokeLinejoin: "round",
        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease"
      }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function SmkiIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: "20px", height: "20px", flexShrink: 0, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

{/* HEADER LOGO SIDEBAR */}
function CompanyLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
      <div
        style={{
          width: "40px",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background: "transparent", // Diubah ke transparent
        }}
      >
        <img 
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-ANDIMA-wzx4gpZx20EFE5IYcH3jqabixELIo3.png" 
          alt="Logo ANDIMA" 
          style={{ width: "100%", height: "100%", objectFit: "contain" }} 
        />
      </div>
      <div>
        <div style={{ color: "#ffffff", fontSize: "16px", fontWeight: 800, letterSpacing: "0.5px" }}>
          ANDIMA
        </div>
        <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "1px" }}>
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
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState('');
  const [activityReload, setActivityReload] = useState(0);
  const [activitySortAscending, setActivitySortAscending] = useState<boolean>(false);
  // State untuk Dropdown Sidebar SMKI & Navigasi Tab
  const [isSmkiOpen, setIsSmkiOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("account-maintains");
  const [currentUserFullName, setCurrentUserFullName] = useState<string>("Loading...");

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

  /* 2. CHECK THE USER POSITION BEFORE OPENING SMKI */
  useEffect(() => {
    const checkITUserAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const { data: userData, error } = await supabase
        .from("b2_register")
        .select("position_id, full_name, is_active")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error || !userData || userData.is_active === false) {
        alert("Akses ditolak. Halaman ini khusus untuk Tim IT / Security Admin.");
        router.push("/login");
        return;
      }

      const destination = getLoginDestination(userData.position_id);
      if (destination !== '/smki/dashboard') {
        router.replace(destination || '/login');
        return;
      }

      if (userData.full_name) {
      setCurrentUserFullName(userData.full_name);
      }

      await fetchEmployeesFromSupabase();
      setIsLoading(false);
    };

    checkITUserAndFetchData();
  }, [router]);

  useEffect(() => {
    if (activeTab !== 'log-activity') return;
    const controller = new AbortController();
    async function loadActivity() {
      setActivityLoading(true);
      setActivityError('');
      setActivityLogs([]);
      try {
        const logs: ActivityLog[] = [];
        const pageSize = 500;
        for (let offset = 0; ; offset += pageSize) {
          // Read all described activities, without filtering by login identity or role.
          const { data, error } = await supabase.from('b1_activity')
            .select('id, name, email, department_name, position, description, date, time, created_at')
            .not('description', 'is', null)
            .neq('description', '')
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(offset, offset + pageSize - 1)
            .abortSignal(controller.signal);
          if (controller.signal.aborted) return;
          if (error) throw error;
          const batch = data ?? [];
          for (const row of batch) {
            if (typeof row.description !== 'string' || !row.description.trim()) continue;
            const eventTime = row.date && row.time ? `${row.date}T${row.time}+07:00` : '';
            const createdAt = eventTime && Number.isFinite(Date.parse(eventTime)) ? eventTime : row.created_at;
            logs.push({
              id: String(row.id),
              name: row.name || '-',
              email: row.email || '-',
              department: row.department_name || '-',
              departmentLabel: row.department_name || '-',
              role: row.position || '-',
              description: row.description.trim(),
              createdAt: createdAt && Number.isFinite(Date.parse(createdAt)) ? createdAt : '',
            });
          }
          if (batch.length < pageSize) break;
        }
        if (!controller.signal.aborted) setActivityLogs(logs);
      } catch (error) {
        if (!controller.signal.aborted) {
          const message = error && typeof error === 'object' && 'message' in error
            ? String(error.message) : 'Koneksi database gagal.';
          setActivityError(`Gagal membaca b1_activity: ${message}`);
        }
      } finally {
        if (!controller.signal.aborted) setActivityLoading(false);
      }
    }
    void loadActivity();
    return () => controller.abort();
  }, [activeTab, activityReload]);

  /* 3. LOGIKA AUTO-LOGOUT SAAT BERGANTI HARI */
  useEffect(() => {
    const getLocalDateString = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const initialDate = getLocalDateString();

    const interval = setInterval(async () => {
      const currentDate = getLocalDateString();

      if (currentDate !== initialDate) {
        clearInterval(interval);
        await supabase.auth.signOut();
        router.push("/login?reason=day_changed");
      }
    }, 5000); // Pengecekan setiap 5 detik

    return () => clearInterval(interval);
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

  const filteredActivityLogs = activityLogs
    .filter((activity) => selectedDepartment === "All" || activity.department === selectedDepartment)
    .sort((first, second) => {
      const timeDifference = (Date.parse(first.createdAt) || 0) - (Date.parse(second.createdAt) || 0);
      return activitySortAscending ? timeDifference : -timeDifference;
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

    if (editForm.newPassword && editForm.newPassword.trim() !== "") {
    const newPass = editForm.newPassword.trim();

    // 1. Cek Minimal Panjang Password (misal: 8 karakter)
    if (newPass.length < 8) {
      setErrorMessage("The password must be at least 8 characters long.");
      return;
    }

    // 2. Cek kombinasi Huruf, Angka, dan Karakter Spesial (misal: &*^ dll)
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/;
    if (!passwordRegex.test(newPass)) {
      setErrorMessage("The password must contain a combination of letters, numbers, and special characters (such as &*^).");
      return;
    }

    // 3. Cek agar tidak sama dengan password saat ini di database
    const { data: currentData, error: fetchErr } = await supabase
      .from("b2_register")
      .select("password")
      .eq("id", editingEmployee?.id)
      .single();

    if (!fetchErr && currentData) {
      if (currentData.password === newPass) {
        setErrorMessage("The new password cannot be the same as the current password!");
        return;
      }
    }
  }

    try {
      const selectedDeptUuid = DEPARTMENT_UUID_MAP[editForm.department];
      const selectedPosUuid = POSITION_UUID_MAP[editForm.position];

      const updateData: Record<string, any> = {
      full_name: editForm.name.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      departement_id: selectedDeptUuid,
      position_id: selectedPosUuid,
      employment_status: editForm.employmentStatus,
      };

      // Sertakan password jika diisi pengguna
      if (editForm.newPassword && editForm.newPassword.trim() !== "") {
        updateData.password = editForm.newPassword.trim(); 
      }

      let query = supabase
        .from("b2_register")
        .update(updateData);
        
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
        
        {/* 1. LOGO & TITLE */}
        <CompanyLogo />

        {/* 2. NAVIGATION WITH DROPDOWN */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, marginTop: "20px" }}>
          <div>
            {/* BUTTON SMKI DROPDOWN HEADER */}
            <button
              onClick={() => setIsSmkiOpen(!isSmkiOpen)}
              style={{
                width: "100%",
                height: "44px",
                padding: "0 16px",
                border: 0,
                borderRadius: "10px",
                background: "#055be5", // Warna Biru Sesuai Desain
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "15px",
                fontWeight: 700,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span>SMKI</span>
              <ChevronDownIcon isOpen={isSmkiOpen} />
            </button>

            {/* SUBMENU ITEM SMKI */}
            {isSmkiOpen && (
              <div style={{ position: "relative", marginTop: "12px", paddingLeft: "24px" }}>
                {/* Garis Vertikal Indikator Kiri */}
                <div
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "0",
                    bottom: "8px",
                    width: "1px",
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                  }}
                />
                
                {/* Submenu 1: Account Maintains */}
                <button
                  onClick={() => setActiveTab("account-maintains")}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: 0,
                    borderRadius: "10px",
                    // Ubah di sini: putih agak transparan jika aktif, transparan jika tidak
                    backgroundColor: activeTab === "account-maintains" ? "rgba(255, 255, 255, 0.15)" : "transparent",
                    // Teks putih solid jika aktif, abu-abu jika tidak
                    color: activeTab === "account-maintains" ? "#ffffff" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "13px",
                    fontWeight: activeTab === "account-maintains" ? 700 : 500, // Cetak tebal saat aktif agar makin jelas
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                  }}
                >
                  <AccountIcon />
                  <span>Account Maintains</span>
                </button>

                {/* Submenu 2: Log Activity */}
                <button
                  onClick={() => setActiveTab("log-activity")}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: 0,
                    borderRadius: "10px",
                    backgroundColor: activeTab === "log-activity" ? "rgba(255, 255, 255, 0.15)" : "transparent",
                    color: activeTab === "log-activity" ? "#ffffff" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "13px",
                    fontWeight: activeTab === "log-activity" ? 700 : 500,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                  }}
                >
                  <ActivityIcon />
                  <span>Log Activity</span>
                </button>

                {/* Submenu 3: Log Login */}
                <button
                  onClick={() => setActiveTab("log-login")}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: 0,
                    borderRadius: "10px",
                    backgroundColor: activeTab === "log-login" ? "rgba(255, 255, 255, 0.15)" : "transparent",
                    color: activeTab === "log-login" ? "#ffffff" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "13px",
                    fontWeight: activeTab === "log-login" ? 700 : 500,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                  }}
                >
                  <LoginIcon />
                  <span>Log Login</span>
                </button>

              </div>
            )}
          </div>
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
          <header style={{ width: "100%", height: activeTab === "log-activity" ? "42px" : "56px", padding: activeTab === "log-activity" ? "0 16px" : "0 24px", background: "#ffffff", borderBottom: "1px solid #e2e8f0", color: "#0f172a", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, boxSizing: "border-box", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>ANDIMA SMKI</span>
              <span style={{ color: "#cbd5e1" }}>|</span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", whiteSpace: "nowrap" }}>
                {activeTab === "log-activity" ? "Log Activity" : activeTab === "log-login" ? "Log Login" : "Account Maintains"}
              </span>
              {activeTab === "log-activity" && (
                <div style={{ position: "relative", marginLeft: "clamp(12px, 3vw, 32px)" }}>
                  <button
                    type="button"
                    aria-expanded={isFilterOpen}
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    style={{ width: "174px", height: "28px", padding: "0 10px", border: 0, borderRadius: "9px", background: "#f1f1f1", color: "#475569", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", fontWeight: 500, cursor: "pointer", boxSizing: "border-box" }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {selectedDepartment === "All" ? "Select Status" : selectedDepartment}
                    </span>
                    <ChevronDownIcon isOpen={isFilterOpen} />
                  </button>
                  {isFilterOpen && (
                    <div style={{ position: "absolute", left: 0, top: "32px", background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 4px 10px rgba(15,23,42,0.12)", zIndex: 30, width: "220px", overflow: "hidden" }}>
                      {["All", ...DEPARTMENT_OPTIONS].map((department) => (
                        <button
                          key={department}
                          type="button"
                          onClick={() => { setSelectedDepartment(department); setIsFilterOpen(false); }}
                          style={{ width: "100%", padding: "7px 10px", background: selectedDepartment === department ? "#f1f5f9" : "#ffffff", color: "#475569", border: 0, textAlign: "left", fontSize: "10px", fontWeight: 500, cursor: "pointer" }}
                        >
                          {department}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {/* Profil Guest / User Login */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#bbf7d0", color: "#166534", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800 }}>
                  IT
                </div>
                <div>
                  {/* Menggunakan state nama user yang login */}
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#0f172a", lineHeight: "1.2" }}>
                    {currentUserFullName}
                  </div>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>Information Technology</div>
                </div>
              </div>
            </div>
          </header>

          {/* AREA KONTEN (FILTER + TABEL) */}
          {activeTab === "log-activity" ? (
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", background: "#f1f3fc" }}>
              <div style={{ minWidth: "760px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1.25fr 1fr 0.7fr 1fr 0.9fr", alignItems: "center", minHeight: "34px", padding: "0 18px", background: "#f8f9ff", color: "#506487", fontSize: "11px", fontWeight: 800, letterSpacing: "0.2px", borderBottom: "1px solid #e6eaf3", boxSizing: "border-box" }}>
                  <div>EMPLOYEE&apos;S NAME</div>
                  <div>EMAIL</div>
                  <div>DEPARTMENT</div>
                  <div>ROLE</div>
                  <div>DESCRIPTION</div>
                  <button
                    type="button"
                    aria-label={`Sort by date and time ${activitySortAscending ? "descending" : "ascending"}`}
                    onClick={() => setActivitySortAscending((ascending) => !ascending)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "3px", padding: 0, border: 0, background: "transparent", color: "inherit", font: "inherit", letterSpacing: "inherit", cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    DATE TIME
                    <svg aria-hidden="true" viewBox="0 0 16 16" style={{ width: "14px", height: "14px", fill: "none", stroke: "currentColor", strokeWidth: 1.5 }}>
                      <path d="M5 2v11m0 0L2.5 10.5M5 13l2.5-2.5M11 14V3m0 0L8.5 5.5M11 3l2.5 2.5" />
                    </svg>
                  </button>
                </div>

                {activityLoading ? (
                  <div role="status" className="bg-white p-6 text-xs text-slate-500">Memuat Log Activity...</div>
                ) : activityError ? (
                  <div role="alert" className="bg-white p-6 text-xs text-red-600">
                    <p>{activityError}</p>
                    <button type="button" onClick={() => setActivityReload((value) => value + 1)} className="mt-2 cursor-pointer text-blue-600">Coba lagi</button>
                  </div>
                ) : filteredActivityLogs.length > 0 ? (
                  filteredActivityLogs.map((activity) => {
                    const timestamp = new Date(activity.createdAt);

                    return (
                      <div key={activity.id} style={{ display: "grid", gridTemplateColumns: "1.15fr 1.25fr 1fr 0.7fr 1fr 0.9fr", alignItems: "center", minHeight: "48px", padding: "0 18px", background: "#ffffff", color: "#111827", fontSize: "10px", fontWeight: 650, borderBottom: "1px solid #e9edf5", boxSizing: "border-box" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0 }}>
                          <ActivityUserIcon />
                          <span>{activity.name}</span>
                        </div>
                        <div style={{ overflowWrap: "anywhere" }}>{activity.email}</div>
                        <div>{activity.departmentLabel}</div>
                        <div>{activity.role}</div>
                        <div style={{ paddingRight: "8px" }}>{activity.description}</div>
                        <div style={{ display: "flex", flexDirection: "column", whiteSpace: "nowrap", lineHeight: 1.25 }}>
                          <span>{activity.createdAt ? timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Jakarta" }) : "-"}</span>
                          <span>{activity.createdAt ? timestamp.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Jakarta" }) : "-"}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: "24px 18px", background: "#ffffff", color: "#64748b", fontSize: "12px" }}>
                    Tidak ada aktivitas dengan deskripsi untuk departemen ini.
                  </div>
                )}
              </div>
            </div>
          ) : (
          <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto", boxSizing: "border-box" }}>
            
            {/* 2. TOMBOL FILTER (STYLE KAPSUL / OUTLINE SESUAI GAMBAR) */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "14px", position: "relative" }}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                style={{
                  width: "300px",
                  height: "36px",
                  padding: "0 16px",
                  border: "1px solid #94a3b8",
                  borderRadius: "20px",
                  background: "#ffffff",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              >
                <span>{selectedDepartment === "All" ? "Select Status" : selectedDepartment}</span>
                <ChevronDownIcon />
              </button>

              {isFilterOpen && (
                <div style={{ position: "absolute", right: 0, top: "42px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 30, width: "220px", overflow: "hidden" }}>
                  <button
                    onClick={() => { setSelectedDepartment("All"); setIsFilterOpen(false); }}
                    style={{ width: "100%", padding: "10px 16px", background: selectedDepartment === "All" ? "#f1f5f9" : "transparent", color: selectedDepartment === "All" ? "#0f172a" : "#475569", border: 0, textAlign: "left", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                  >
                    All
                  </button>
                  {DEPARTMENT_OPTIONS.map((dept) => (
                    <button
                      key={dept}
                      onClick={() => { setSelectedDepartment(dept); setIsFilterOpen(false); }}
                      style={{ width: "100%", padding: "10px 16px", background: selectedDepartment === dept ? "#f1f5f9" : "transparent", color: selectedDepartment === dept ? "#0f172a" : "#475569", border: 0, textAlign: "left", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. TABEL DATA (DI BAWAH FILTER) */}
            <div style={{ background: "#ffffff", borderRadius: "6px", border: "1px solid #e2e8f0", overflow: "hidden", width: "100%" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.3fr 1.2fr 1.2fr 0.6fr", alignItems: "center", padding: "10px 16px", background: "#f8fafc", color: "#64748b", fontSize: "11px", fontWeight: 800, letterSpacing: "0.5px", borderBottom: "1px solid #e2e8f0" }}>
                <div>EMPLOYEE'S NAME</div>
                <div>E-MAIL</div>
                <div>DEPARTMENT</div>
                <div>POSITION</div>
                <div style={{ textAlign: "center" }}>ACTION</div>
              </div>

              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <div key={employee.id} style={{ display: "grid", gridTemplateColumns: "1.3fr 1.3fr 1.2fr 1.2fr 0.6fr", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #f1f5f9", fontSize: "12px", color: !employee.isActive ? "#94a3b8" : "#1e293b", background: "#ffffff" }}>
                    
                    {/* Nama & Initial Karyawan */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700 }}>
                      <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#cbd5e1", color: "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, flexShrink: 0 }}>
                        {employee.initial}
                      </span>
                      <span>{employee.name}</span>
                    </div>

                    {/* Email */}
                    <div style={{ color: "#64748b" }}>{employee.email}</div>

                    {/* Department (Sambung ke Supabase) */}
                    <div style={{ fontWeight: 600, color: "#334155" }}>
                      {employee.department}
                    </div>

                    {/* Position (Sambung ke Supabase) */}
                    <div style={{ fontWeight: 600, color: "#334155" }}>
                      {employee.position}
                    </div>

                    {/* Action Buttons */}
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
          )}
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

              {/* New Password (Optional) */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>
                  RESET PASSWORD (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={editForm.newPassword || ""}
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