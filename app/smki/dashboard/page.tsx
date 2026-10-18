"use client";

import React, { Suspense, useState, useEffect, useRef } from "react";
import { ListFilter, Search, X } from 'lucide-react';
import Pagination from '@/components/pagination';
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getLoginDestination } from "@/lib/loginDestination";
import { IT_DEPARTMENT_ID } from '@/lib/activity';
import { getActivities, getActivityById, matchesActivity, logoutWithActivity, trackActivity, type ActivityLog } from '@/query/activity';
import { current } from "immer";

/* MASTER DATA OPTIONS */
const DEPARTMENT_OPTIONS = [
  "Human Resources",
  "Information Technology",
  "Finance, Accounting & Tax",
  "Commercial & Customer Success",
];

const POSITION_OPTIONS = [
  "Director",
  "HR Manager",
  "Associate Officer",
  "Information Technology",
  "Billing",
  "Manager of Accounting",
  "Cash Manager Associate",
  "Tax Manager",
  "Tax Associate",
  "Accounting Associate",
  "Sales Executive",
  "Manager of Customer Success",
  "Field Agent",
  "Sales Administration Associate",
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
  "Director": "4acac2d4-8441-4cd8-bcd3-cf3ce4ca0ee0",
  "HR Manager": "446c8f5a-e923-4668-924d-75e28002fa03",
  "Associate Officer": "7f6c629b-2300-4229-8c24-9df137c3cff2",
  "Information Technology": "265c9357-105c-437c-a244-6897122f17c1",
  "Billing": "7539f5e1-5729-423e-bd87-e15a51fae54c",
  "Manager of Accounting": "8b14d133-0c6c-4867-a807-373cf462e5fe",
  "Cash Manager Associate": "a8be934a-5d25-46cc-94c7-3be79e3ba035",
  "Tax Manager": "67a8e1ba-daa7-4230-9c82-8dfef7e8fd15",
  "Tax Associate": "44f4f4b2-edb9-46c8-933d-9c0dc0fd3646",
  "Accounting Associate": "8669bd7b-bad6-497e-8bbd-39039949224a",
  "Sales Executive": "bc015ef6-0515-4875-a15d-0f38dbf3d2c3",
  "Manager of Customer Success": "48e90a83-86bd-4bd9-8b34-0fe7da11cc18",
  "Field Agent": "2f1901c6-0617-45ba-852f-9556ed957f21",
  "Sales Administration Associate": "ba43f1eb-7e99-4a85-8471-9d3e54e526b9",
};

/* PEMETAAN UUID JABATAN KE NAMA TAMPILAN */
const UUID_POSITION_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(POSITION_UUID_MAP).map(([name, uuid]) => [uuid, name])
);

const VALID_POSITION_DEPARTMENTS: Record<string, string> = {
  "HR Manager": "Human Resources",
  "Associate Officer": "Human Resources",
  "Information Technology": "Information Technology",
  "Billing": "Finance, Accounting & Tax",
  "Manager of Accounting": "Finance, Accounting & Tax",
  "Cash Manager Associate": "Finance, Accounting & Tax",
  "Tax Manager": "Finance, Accounting & Tax",
  "Tax Associate": "Finance, Accounting & Tax",
  "Accounting Associate": "Finance, Accounting & Tax",
  "Sales Executive": "Commercial & Customer Success",
  "Manager of Customer Success": "Commercial & Customer Success",
  "Field Agent": "Commercial & Customer Success",
  "Sales Administration Associate": "Commercial & Customer Success",
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
      <svg viewBox="0 0 24 24" aria-hidden="true" 
        style={{ width: "18px", height: "18px", display: "block", color: active ? "#64748b" : "#ef4444",
          fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
        }}
      >
        {/* Icon Lingkaran Dicoret (Ban Icon) */}
        <circle cx="12" cy="12" r="10" />
        <path d="m4.9 4.9 14.2 14.2" />
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

/* HEADER LOGO SIDEBAR */
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
          background: "transparent",
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
function SmkiDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All");
  const [selectedPosition, setSelectedPosition] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>(""); // State untuk Search Bar
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);
  const itemsPerPage = 8;
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState('');
  const [activityReload, setActivityReload] = useState(0);
  const [activityPage, setActivityPage] = useState(1);
  const activityPageSize = 10;
  const [activityTotal, setActivityTotal] = useState(0);
  const [activitySearch, setActivitySearch] = useState('');
  const [activityStartDate, setActivityStartDate] = useState('');
  const [activityEndDate, setActivityEndDate] = useState('');
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const dateRangeDialogRef = useRef<HTMLDialogElement>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  
  const [isSmkiOpen, setIsSmkiOpen] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const activeTab = searchParams.get('tab') === 'log-activity' ? 'log-activity' : 'account-maintains';
  const [currentUserFullName, setCurrentUserFullName] = useState<string>("Loading...");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successModal, setSuccessModal] = useState<{ isOpen: boolean; name: string }>({
    isOpen: false,
    name: "",
  });

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
    } finally {
      setIsLoading(false); // <--- PASTIKAN INI ADA DI DALAM block finally AGAR SELALU MATI SETELAH FETCH SELESAI/GAGAL
    }
  };

  /* 2. CHECK THE IT DEPARTMENT BEFORE OPENING SMKI */
  useEffect(() => {
    const checkITUserAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const { data: userData, error } = await supabase
        .from("b2_register")
        .select("position_id, departement_id, full_name, is_active")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error || !userData || userData.is_active === false) {
        alert("Akses ditolak. Halaman ini khusus untuk Tim IT / Security Admin.");
        router.push("/login");
        return;
      }

      const isITDepartment = userData.departement_id === IT_DEPARTMENT_ID;
      const isITPosition = userData.position_id === "265c9357-105c-437c-a244-6897122f17c1"; // UUID posisi Information Technology

      if (!isITDepartment && !isITPosition) {
        // Alih-alih ke /login, arahkan kembali ke Landing Page utama
        router.replace('/landing-page');
        return;
      }

     if (userData.full_name) {
        const firstName = userData.full_name.trim().split(" ")[0];
        setCurrentUserFullName(firstName);
      }

      await fetchEmployeesFromSupabase();
      setIsLoading(false);
    };

    checkITUserAndFetchData();
  }, [router]);

  useEffect(() => {
    if (isLoading || activeTab !== 'log-activity') return;
    let disposed = false;
    let revision = 0;
    const filters = {
      page: activityPage, pageSize: activityPageSize, search: activitySearch,
      startDate: activityStartDate, endDate: activityEndDate,
      ascending: Boolean(activityStartDate),
      departmentId: selectedDepartment === 'All' ? undefined : DEPARTMENT_UUID_MAP[selectedDepartment],
    };
    async function loadActivity(showLoading = true) {
      const request = ++revision;
      if (showLoading) { setActivityLoading(true); setActivityError(''); }
      try {
        const result = await getActivities(filters);
        if (disposed || request !== revision) return;
        const lastPage = Math.max(1, Math.ceil(result.total / activityPageSize));
        if (activityPage > lastPage) { setActivityPage(lastPage); return; }
        setActivityLogs(result.rows);
        setActivityTotal(result.total);
        setActivityError('');
      } catch (error) {
        if (!disposed && request === revision) {
          setActivityError(`Gagal membaca b1_activity: ${error instanceof Error ? error.message : 'Koneksi database gagal.'}`);
        }
      } finally {
        if (!disposed && request === revision) setActivityLoading(false);
      }
    }
    const channel = supabase.channel('smki-log-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'b1_activity' }, (payload) => {
        void (async () => {
          try {
            const activity = await getActivityById(String(payload.new.id));
            if (disposed || !activity || !matchesActivity(activity, filters)) return;
            await loadActivity(false);
          } catch { console.error('Gagal memperbarui Log Activity melalui Realtime.'); }
        })();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && !disposed) void loadActivity(false);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error('Koneksi Realtime Log Activity gagal.');
      });
    void loadActivity();
    return () => { disposed = true; void supabase.removeChannel(channel); };
  }, [isLoading, activeTab, activityReload, activityPage, activityPageSize, activitySearch, activityStartDate, activityEndDate, selectedDepartment]);

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
        const { error } = await logoutWithActivity('Sesi berakhir karena hari berganti.');
        if (error) { console.error('Gagal logout saat hari berganti.'); return; }
        router.push("/login?reason=day_changed");
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [router]);

  // Handler Logout
  async function handleLogout() {
  if (signingOut) return;

  setSigningOut(true);
  setLogoutError('');

  try {
    // Catat aktivitas tanpa mengakhiri sesi login
    await trackActivity(
      'Logout',
      'Kembali ke Landing Page dari dashboard MID.'
    );

    // Kembali ke Landing Page
    window.location.href = '/landing-page';
  } catch (error) {
    console.error('Gagal kembali ke Landing Page:', error);
    setLogoutError('Gagal kembali ke Landing Page. Silakan coba lagi.');
    setSigningOut(false);
  }
}

  // Handler Filter Department & Search
  const filteredEmployees = employees.filter((emp) => {
    const matchesDept = selectedDepartment === "All" || emp.department.toLowerCase() === selectedDepartment.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesPos = selectedPosition === "All" || emp.position.toLowerCase() === selectedPosition.toLowerCase();
    const matchesSearch = !searchQuery || emp.name.toLowerCase().includes(query) || emp.email.toLowerCase().includes(query);
    const matchesStatus =
      selectedStatus === "All" ||
      (selectedStatus === "Active" && emp.isActive) ||
      (selectedStatus === "Inactive" && !emp.isActive);
    return matchesSearch && matchesDept && matchesPos && matchesStatus;
  }).sort((a, b) => {
    // Urutkan: Aktif (true / bernilai 1) didahulukan di atas Nonaktif (false / bernilai 0)
    return (b.isActive === a.isActive) ? 0 : b.isActive ? 1 : -1;
  });

    // Pagination Slicing (Tambahkan ini)
  const indexOfLastItem = currentPageNum * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage) || 1;

  const activityTotalPages = Math.max(1, Math.ceil(activityTotal / activityPageSize));
  const filterDateLabel = (date: string) => date.split('-').reverse().join('/');
  const activityRangeLabel = activityStartDate && activityEndDate
    ? `${filterDateLabel(activityStartDate)} - ${filterDateLabel(activityEndDate)}`
    : activityStartDate ? `Mulai ${filterDateLabel(activityStartDate)}`
      : activityEndDate ? `Sampai ${filterDateLabel(activityEndDate)}` : '';

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
      // Menggunakan .eq("id", targetId) agar lebih akurat dibandingkan .eq("email", ...)
      const { data, error } = await supabase
        .from("b2_register")
        .update({ is_active: willBeActive })
        .eq("id", targetId)
        .select('id');

      if (error) {
        alert("Gagal memperbarui status keaktifan di database: " + error.message);
        return;
      }
      
      if (!data?.length) { 
        console.error('Tidak ada akun yang diperbarui. Periksa ID atau RLS policy tabel b2_register.'); 
        alert("Gagal memperbarui status: Akun tidak ditemukan atau dibatasi oleh policy database.");
        return; 
      }

      trackActivity(willBeActive ? 'Activate' : 'Deactivate', `${willBeActive ? 'Mengaktifkan' : 'Menonaktifkan'} akun ${statusConfirmEmployee.name} (${statusConfirmEmployee.email}).`);

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

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedPosition("All");
    setSelectedDepartment("All");
    setSelectedStatus("All");
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

      if (newPass.length < 8) {
        setErrorMessage("The password must be at least 8 characters long.");
        return;
      }

      const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/;
      if (!passwordRegex.test(newPass)) {
        setErrorMessage("The password must contain a combination of letters, numbers, and special characters (such as &*^).");
        return;
      }

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

      if (!data || data.length === 0) {
        setErrorMessage("Data tidak ditemukan di Supabase. Periksa izin RLS UPDATE tabel b2_register.");
        return;
      }

      trackActivity('Update', `Mengubah data akun ${editForm.name.trim()} (${editForm.email.trim()}).`);
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
      <aside style={{ 
        width: isSidebarOpen ? "250px" : "0px", 
        height: "100vh", 
        flexShrink: 0, 
        position: "relative", 
        padding: isSidebarOpen ? "24px 16px" : "0px", 
        background: "#0f2038", 
        color: "#fff", 
        display: "flex", 
        flexDirection: "column", 
        boxSizing: "border-box",
        overflow: "visible", 
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease" 
      }}>
        
        {/* 🔘 TOMBOL BULAT BIRU MELAYANG DI TEPI KANAN */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{
            position: "absolute",
            right: "-18px",
            top: "76px",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "#055be5",
            color: "#ffffff",
            border: "3px solid #0f2038",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
            zIndex: 100,
            transition: "all 0.3s ease",
          }}
          aria-label={isSidebarOpen ? "Tutup Sidebar" : "Buka Sidebar"}
          title={isSidebarOpen ? "Tutup Sidebar" : "Buka Sidebar"}
        >
          <svg 
            viewBox="0 0 24 24" 
            style={{ 
              width: "18px", 
              height: "18px", 
              fill: "none", 
              stroke: "currentColor", 
              strokeWidth: 2.5, 
              strokeLinecap: "round", 
              strokeLinejoin: "round",
              transform: isSidebarOpen ? "rotate(0deg)" : "rotate(180deg)",
              transition: "transform 0.3s ease"
            }}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {isSidebarOpen && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" }}>
            
            {/* COMPANY LOGO */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.1)", whiteSpace: "nowrap" }}>
              <div style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "transparent" }}>
                <img 
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-ANDIMA-wzx4gpZx20EFE5IYcH3jqabixELIo3.png" 
                  alt="Logo ANDIMA" 
                  style={{ width: "100%", height: "100%", objectFit: "contain" }} 
                />
              </div>
              <div>
                <div style={{ color: "#ffffff", fontSize: "16px", fontWeight: 800, letterSpacing: "0.5px" }}>ANDIMA</div>
                <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "1px" }}>Logistics Suite</div>
              </div>
            </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, marginTop: "20px" }}>
          <div>
            <button
              onClick={() => setIsSmkiOpen(!isSmkiOpen)}
              style={{
                width: "100%",
                height: "44px",
                padding: "0 16px",
                border: 0,
                borderRadius: "10px",
                background: "#055be5",
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

            {isSmkiOpen && (
              <div style={{ position: "relative", marginTop: "12px", paddingLeft: "24px" }}>
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
                
                <button
                  onClick={() => router.push('/smki/dashboard')}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: 0,
                    borderRadius: "10px",
                    backgroundColor: activeTab === "account-maintains" ? "rgba(255, 255, 255, 0.15)" : "transparent",
                    color: activeTab === "account-maintains" ? "#ffffff" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "13px",
                    fontWeight: activeTab === "account-maintains" ? 700 : 500,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                  }}
                >
                  <AccountIcon />
                  <span>Account Maintains</span>
                </button>

                <button
                  onClick={() => router.push('/smki/dashboard?tab=log-activity')}
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

                <button
                  onClick={() => router.push("/smki/dashboard/loglogin")}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: 0,
                    borderRadius: "10px",
                    backgroundColor: "transparent",
                    color: "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "13px",
                    fontWeight: 500,
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

        {/* TOMBOL LOGOUT */}
          <button
            onClick={handleLogout}
            style={{ 
              width: "100%", height: "44px", borderRadius: "22px", border: "2px solid #f43f5e", background: "transparent", color: "#f43f5e", display: "flex",
              alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "15px", fontWeight: 700, marginTop: "auto", transition: "all 0.2s ease",
            }}
          >
            Logout
          </button>
        </div>
      )}

      </aside>

      {/* MAIN CONTENT AREA */}
      <section style={{ flex: 1, height: "100vh", background: "#ffffff", display: "flex", flexDirection: "column", overflow: "hidden", boxSizing: "border-box" }}>

        <header style={{ width: "100%", height: activeTab === "log-activity" ? "42px" : "56px", padding: activeTab === "log-activity" ? "0 16px" : "0 24px", background: "#ffffff", borderBottom: "1px solid #e2e8f0", color: "#0f172a", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, boxSizing: "border-box", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>ANDIMA SMKI</span>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", whiteSpace: "nowrap" }}>
              {activeTab === "log-activity" ? "Log Activity" : "Account Maintains"}
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
                    {selectedDepartment === "All" ? "All Departments" : selectedDepartment}
                  </span>
                  <ChevronDownIcon isOpen={isFilterOpen} />
                </button>
                {isFilterOpen && (
                  <div style={{ position: "absolute", left: 0, top: "32px", background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 4px 10px rgba(15,23,42,0.12)", zIndex: 30, width: "220px", overflow: "hidden" }}>
                    {["All", ...DEPARTMENT_OPTIONS].map((department) => (
                      <button
                        key={department}
                        type="button"
                        onClick={() => { setSelectedDepartment(department); setActivityPage(1); setIsFilterOpen(false); }}
                        style={{ width: "100%", padding: "7px 10px", background: selectedDepartment === department ? "#f1f5f9" : "#ffffff", color: "#475569", border: 0, textAlign: "left", fontSize: "10px", fontWeight: 500, cursor: "pointer" }}
                      >
                        {department === "All" ? "All Departments" : department}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#bbf7d0", color: "#166534", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800 }}>
                IT
              </div>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#0f172a", lineHeight: "1.2" }}>
                  {currentUserFullName}
                </div>
                <div style={{ fontSize: "9px", color: "#64748b" }}>Information Technology</div>
              </div>
            </div>
          </div>
        </header>

        {activeTab === "log-activity" ? (
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "20px 24px", boxSizing: "border-box" }}>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs mb-5 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => { setDraftStartDate(activityStartDate); setDraftEndDate(activityEndDate); dateRangeDialogRef.current?.showModal(); }}
                  className={`flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border bg-white px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-blue-500 ${activityStartDate || activityEndDate ? 'border-blue-300 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >
                  <ListFilter aria-hidden="true" className="h-3.5 w-3.5" />Filters
                  {(activityStartDate || activityEndDate) && <span aria-label="Filter tanggal aktif" className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
                </button>
                <dialog
                  ref={dateRangeDialogRef}
                  aria-labelledby="activity-date-range-title"
                  className="fixed inset-0 m-auto w-[480px] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-6 text-[#555555] shadow-xl backdrop:bg-slate-900/30"
                  onClick={(event) => {
                    if (event.target !== event.currentTarget) return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
                  }}
                >
                  <form onSubmit={(event) => {
                    event.preventDefault();
                    if (draftStartDate && draftEndDate && draftStartDate > draftEndDate) return;
                    setActivityStartDate(draftStartDate); setActivityEndDate(draftEndDate); setActivityPage(1);
                    dateRangeDialogRef.current?.close();
                  }}>
                    <h2 id="activity-date-range-title" className="text-[28px] font-bold leading-tight text-black">Filter</h2>
                    <p className="mt-1.5 text-sm text-[#707070]">Pilih rentang tanggal aktivitas.</p>
                    <div className="mt-5">
                      <div role="group" aria-label="Rentang tanggal" className="grid grid-cols-1 gap-4 min-[440px]:grid-cols-2">
                        <label className="block min-w-0">
                          <span className="mb-2 block text-sm font-medium text-slate-700">Tanggal mulai</span>
                          <input type="date" value={draftStartDate} onChange={(event) => {
                            const start = event.target.value;
                            setDraftStartDate(start);
                            if (start && draftEndDate && start > draftEndDate) setDraftEndDate('');
                          }} className="h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 [color-scheme:light]" />
                        </label>
                        <label className="block min-w-0">
                          <span className="mb-2 block text-sm font-medium text-slate-700">Tanggal akhir</span>
                          <input type="date" value={draftEndDate} min={draftStartDate || undefined} onChange={(event) => setDraftEndDate(event.target.value)} className="h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 [color-scheme:light]" />
                        </label>
                      </div>
                    </div>
                    {draftStartDate && draftEndDate && draftStartDate > draftEndDate && <p role="alert" className="mt-2 text-xs text-red-600">Tanggal akhir harus sama atau setelah tanggal mulai.</p>}
                    <div className="mt-8 grid grid-cols-[1fr_1.4fr] gap-4">
                      <button type="button" onClick={() => { setActivityStartDate(''); setActivityEndDate(''); setDraftStartDate(''); setDraftEndDate(''); setActivityPage(1); }} className="h-12 cursor-pointer rounded-lg border border-[#B8B8B8] bg-white text-base font-semibold text-[#555555] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-500">Reset</button>
                      <button type="submit" disabled={Boolean(draftStartDate && draftEndDate && draftStartDate > draftEndDate)} className="h-12 cursor-pointer rounded-lg bg-[#386BF6] text-base font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-40">Apply</button>
                    </div>
                  </form>
                </dialog>
                <div className="relative flex-1 min-w-[280px]">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="search" aria-label="Cari Log Activity berdasarkan nama, email, action, atau deskripsi" placeholder="Search by Employee's Name or Email" value={activitySearch} onChange={(event) => { setActivitySearch(event.target.value); setActivityPage(1); }} className="w-full h-10 pl-10 pr-10 bg-[#f1f3fe] text-xs font-medium text-slate-700 placeholder-slate-400 rounded-xl border border-transparent focus:border-purple-300 focus:bg-white focus:outline-none transition-all [&::-webkit-search-cancel-button]:hidden" />
                  {activitySearch && <button type="button" aria-label="Clear search" onClick={() => { setActivitySearch(''); setActivityPage(1); }} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"><X aria-hidden="true" className="h-3.5 w-3.5" /></button>}
                </div>
                {activityRangeLabel && <p role="status" className="text-[11px] text-slate-500">{activityRangeLabel} (WIB){!activityLoading && !activityError && ` · ${activityTotal} aktivitas · ${activityStartDate ? 'dari tanggal mulai' : 'terbaru lebih dulu'}`}</p>}
              </div>
              <div className="w-full overflow-x-auto rounded-md border border-slate-200 bg-white">
              <table aria-label="Log Activity SMKI" className="w-full min-w-[1200px] table-fixed border-collapse text-left [&_th]:px-4 [&_th]:py-2.5 [&_th]:align-middle [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_td]:[overflow-wrap:anywhere]">
              <colgroup>
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>
              <thead style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "11px", fontWeight: 800, letterSpacing: "0.5px", color: "#64748b", background: "#f8fafc" }} className="[&_th]:font-extrabold [&_th]:whitespace-nowrap">
              <tr className="border-b border-slate-200">
                <th scope="col">EMPLOYEE&apos;S NAME</th>
                <th scope="col">E-MAIL</th>
                <th scope="col">DEPARTMENT</th>
                <th scope="col">ROLE</th>
                <th scope="col">IP ADDRESS</th>
                <th scope="col">BROWSER</th>
                <th scope="col">DESCRIPTION</th>
                <th scope="col" aria-sort={activityStartDate ? 'ascending' : 'descending'} className="whitespace-nowrap">DATE TIME</th>
              </tr>
              </thead>
              <tbody style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", fontWeight: 400, color: "#1e293b" }} className="bg-white">
              {activityLoading ? (
                <tr><td colSpan={8}><div role="status" className="text-slate-500">Memuat Log Activity...</div></td></tr>
              ) : activityError ? (
                <tr><td colSpan={8}><div role="alert" className="text-red-600">
                  <p>{activityError}</p>
                  <button type="button" onClick={() => setActivityReload((value) => value + 1)} className="mt-2 cursor-pointer text-blue-600">Coba lagi</button>
                </div></td></tr>
              ) : activityLogs.length > 0 ? (
                activityLogs.map((activity) => {
                  const timestamp = new Date(activity.createdAt);
                  return (
                    <tr key={activity.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                      <td className="font-bold"><div className="flex items-center gap-2.5 min-w-0">
                        <span aria-hidden="true" className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-slate-300 text-[11px] font-bold text-slate-700">{activity.name.trim().charAt(0).toUpperCase() || '?'}</span>
                        <span className="min-w-0">{activity.name}</span>
                      </div></td>
                      <td className="text-slate-500">{activity.email}</td>
                      <td className="font-semibold text-slate-700">{activity.department}</td>
                      <td className="font-semibold text-slate-700">{activity.role}</td>
                      <td>{activity.ipAddress}</td>
                      <td>{activity.userAgent}</td>
                      <td className="whitespace-pre-line">{activity.description}</td>
                      <td><div style={{ display: "flex", flexDirection: "column", whiteSpace: "nowrap" }}>
                        <span>{activity.createdAt ? timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Jakarta" }) : "-"}</span>
                        <span>{activity.createdAt ? timestamp.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Jakarta" }) : "-"}</span>
                      </div></td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={8} className="text-slate-500">
                  Tidak ada aktivitas yang sesuai dengan pencarian dan filter.
                </td></tr>
              )}
              </tbody>
            </table>
            </div>
            {!activityLoading && !activityError && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                <p role="status">Menampilkan {activityTotal ? (activityPage - 1) * activityPageSize + 1 : 0}–{Math.min(activityPage * activityPageSize, activityTotal)} dari {activityTotal} aktivitas.</p>
                <Pagination label="Pagination Log Activity" page={activityPage} totalPages={activityTotalPages} onPageChange={setActivityPage} />
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto", boxSizing: "border-box" }}>
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs mb-5 flex flex-wrap items-center gap-3">
              
              {/* 1. SEARCH INPUT BAR */}
              <div className="relative flex-1 min-w-[280px]">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by Employee's Name or Email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-[#f1f3fe] text-xs font-medium text-slate-700 placeholder-slate-400 rounded-xl border border-transparent focus:border-purple-300 focus:bg-white focus:outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* 2. FILTER DEPARTMENT (Dipindah ke Kiri) */}
              <select
                value={selectedDepartment}
                onChange={(e) => {
                  const newDept = e.target.value;
                  setSelectedDepartment(newDept);
                  // Reset position ke "All" jika posisi sebelumnya tidak sesuai dengan departemen baru
                  if (newDept !== "All" && selectedPosition !== "All") {
                    const validDept = VALID_POSITION_DEPARTMENTS[selectedPosition];
                    if (validDept && validDept !== newDept && selectedPosition !== "Director") {
                      setSelectedPosition("All");
                    }
                  }
                }}
                className="h-10 px-3.5 bg-white text-xs font-medium text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400 cursor-pointer shadow-2xs"
              >
                <option value="All">All Departement</option>
                {DEPARTMENT_OPTIONS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

              {/* 3. FILTER POSITION (Dipindah ke Kanan & Dibatasi Berdasarkan Departemen) */}
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                className="h-10 px-3.5 bg-white text-xs font-medium text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400 cursor-pointer shadow-2xs"
              >
                <option value="All">All Position</option>
                {POSITION_OPTIONS
                  .filter(pos => selectedDepartment === "All" || pos === "Director" || VALID_POSITION_DEPARTMENTS[pos] === selectedDepartment)
                  .map((pos) => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
              </select>

              {/* 4. FILTER STATUS */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-10 px-3.5 bg-white text-xs font-medium text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400 cursor-pointer shadow-2xs"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              {/* 5. TOMBOL RESET */}
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-10 px-3.5 flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-purple-600 bg-transparent hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-200 ml-auto sm:ml-0"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span>Reset</span>
              </button>

            </div>

            {/* TABEL DATA KARYAWAN */}
            <div style={{ background: "#ffffff", borderRadius: "6px", border: "1px solid #e2e8f0", overflow: "hidden", width: "100%" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.3fr 1.2fr 1.2fr 0.6fr", alignItems: "center", padding: "10px 16px", background: "#f8fafc", color: "#64748b", fontSize: "11px", fontWeight: 800, letterSpacing: "0.5px", borderBottom: "1px solid #e2e8f0" }}>
                <div>EMPLOYEE'S NAME</div>
                <div>E-MAIL</div>
                <div>DEPARTMENT</div>
                <div>POSITION</div>
                <div style={{ textAlign: "center" }}>ACTION</div>
              </div>

              {currentEmployees.length > 0 ? (
                currentEmployees.map((employee) => (
                  <div key={employee.id} style={{ display: "grid", gridTemplateColumns: "1.3fr 1.3fr 1.2fr 1.2fr 0.6fr", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #f1f5f9", fontSize: "12px", color: !employee.isActive ? "#94a3b8" : "#1e293b", background: "#ffffff" }}>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700 }}>
                      <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#cbd5e1", color: "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, flexShrink: 0 }}>
                        {employee.initial}
                      </span>
                      <span>{employee.name}</span>
                    </div>

                    <div style={{ color: "#64748b" }}>{employee.email}</div>

                    <div style={{ fontWeight: 600, color: "#334155" }}>
                      {employee.department}
                    </div>

                    <div style={{ fontWeight: 600, color: "#334155" }}>
                      {employee.position}
                    </div>

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
            
            {/* PAGINATION DENGAN TRANSISI HALUS (SMOOTH FADE TRANSITION) */}
            {filteredEmployees.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", padding: "0 4px", flexShrink: 0 }}>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                Showing <b>{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredEmployees.length)}</b> of <b>{filteredEmployees.length}</b> employees
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                
                {/* Tombol Previous dengan Ikon Panah Kiri */}
                <button
                  onClick={() => setCurrentPageNum((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPageNum === 1}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    background: currentPageNum === 1 ? "#f8fafc" : "#ffffff",
                    color: currentPageNum === 1 ? "#94a3b8" : "#1e293b",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: currentPageNum === 1 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s ease"
                  }}
                >
                  <svg viewBox="0 0 24 24" style={{ width: "14px", height: "14px", fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" }}>
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Previous
                </button>

                {/* 3 Kotak Angka Halaman */}
                {(() => {
                  let startPage = 1;

                  if (totalPages <= 3) {
                    startPage = 1;
                  } else if (currentPageNum === 1) {
                    startPage = 1;
                  } else if (currentPageNum === totalPages) {
                    startPage = totalPages - 2;
                  } else {
                    startPage = currentPageNum - 1;
                  }

                  const visiblePages = [];
                  for (let i = startPage; i < startPage + Math.min(3, totalPages); i++) {
                    visiblePages.push(i);
                  }

                  return visiblePages.map((pageNum) => {
                    const isActive = currentPageNum === pageNum;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPageNum(pageNum)}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          border: isActive ? "none" : "1px solid #cbd5e1",
                          background: isActive ? "#2563eb" : "#ffffff",
                          color: isActive ? "#ffffff" : "#1e293b",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                          boxShadow: isActive ? "0 4px 12px rgba(37, 99, 235, 0.3)" : "none",
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  });
                })()}

                {/* Tombol Next dengan Ikon Panah Kanan */}
                <button
                  onClick={() => setCurrentPageNum((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPageNum === totalPages}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    background: currentPageNum === totalPages ? "#f8fafc" : "#ffffff",
                    color: currentPageNum === totalPages ? "#94a3b8" : "#1e293b",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: currentPageNum === totalPages ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s ease"
                  }}
                >
                  Next
                  <svg viewBox="0 0 24 24" style={{ width: "14px", height: "14px", fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
                </div>  
              </div>
          )}
        </div>
        )}
      </section>

      {/* EDIT KARYAWAN */}
      {editingEmployee && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "20px" }}>
          <div 
            className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden" 
            style={{ width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", background: "#ffffff", borderRadius: "16px", padding: "28px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", boxSizing: "border-box" }}
          >
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                Edit Account ({editingEmployee.employeeId})
              </h3>
              <button
                onClick={() => {
                  setEditingEmployee(null);
                  setFieldErrors({});
                }}
                style={{ border: 0, background: "transparent", fontSize: "20px", cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const errors: Record<string, string> = {};

                // 1. Full Name
                if (!editForm.name?.trim()) {
                  errors.name = "Full Name is required.";
                } else if (editForm.name.length > 50) {
                  errors.name = "Full name cannot exceed 50 characters.";
                }

                // 2. Email Address (WAJIB @andima.co.id)
                if (!editForm.email?.trim()) {
                  errors.email = "Email address is required.";
                } else {
                  const emailRegex = /^[^\s@]+@andima\.co\.id$/;
                  if (!emailRegex.test(editForm.email.trim())) {
                    errors.email = "Email must use the @andima.co.id domain.";
                  }
                }

                // 3. Password (Optional)
                if (editForm.newPassword && editForm.newPassword.trim() !== "") {
                  const newPass = editForm.newPassword.trim();
                  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/;

                  if (newPass.length < 8) {
                    errors.newPassword = "The password must be at least 8 characters long.";
                  } else if (newPass.length > 15) {
                    errors.newPassword = "Reset Password must not exceed 15 characters.";
                  } else if (!passwordRegex.test(newPass)) {
                    errors.newPassword = "The password must contain letters, numbers, and special characters.";
                  }
                }

                // 4. Phone Number
                if (!editForm.phone?.trim()) {
                  errors.phone = "Phone number is required.";
                } else if (!/^\d*$/.test(editForm.phone.trim())) {
                  errors.phone = "Phone Number must contain numbers only.";
                } else if (editForm.phone.trim().length < 10 || editForm.phone.trim().length > 12) {
                  errors.phone = "Phone Number must be between 10 and 12 digits.";
                }

                // 5. Employment Status
                if (!editForm.department) {
                  errors.department = "Please select a department.";
                }
                if (!editForm.position) {
                  errors.position = "Please select a position.";
                }

                // Cek jika ada error
                if (Object.keys(errors).length > 0) {
                  setFieldErrors(errors);
                  return;
                }

                setFieldErrors({});
                handleSaveEdit(e);
              }}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {/* FULL NAME */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => {
                    setEditForm({ ...editForm, name: e.target.value });
                    setFieldErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  style={{ 
                    width: "100%", 
                    padding: "10px 12px", 
                    borderRadius: "8px", 
                    border: fieldErrors.name ? "1px solid #ef4444" : "1px solid #cbd5e1", 
                    fontSize: "13px", 
                    boxSizing: "border-box" 
                  }}
                />
                {fieldErrors.name && (
                  <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: 600, marginTop: "4px", display: "block" }}>
                    {fieldErrors.name}
                  </span>
                )}
              </div>

              {/* EMAIL ADDRESS */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>Email Address</label>
                <input
                  type="text"
                  value={editForm.email}
                  onChange={(e) => {
                    setEditForm({ ...editForm, email: e.target.value });
                    setFieldErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  style={{ 
                    width: "100%", 
                    padding: "10px 12px", 
                    borderRadius: "8px", 
                    border: fieldErrors.email ? "1px solid #ef4444" : "1px solid #cbd5e1", 
                    fontSize: "13px", 
                    boxSizing: "border-box" 
                  }}
                />
                {fieldErrors.email && (
                  <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: 600, marginTop: "4px", display: "block" }}>
                    {fieldErrors.email}
                  </span>
                )}
              </div>

              {/* PHONE NUMBER */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>Phone Number</label>
                <input
                  type="text"
                  placeholder="Max. 12 digits (e.g. 08123456789)"
                  value={editForm.phone}
                  onChange={(e) => {
                    setEditForm({ ...editForm, phone: e.target.value });
                    setFieldErrors((prev) => ({ ...prev, phone: "" }));
                  }}
                  style={{ 
                    width: "100%", 
                    padding: "10px 12px", 
                    borderRadius: "8px", 
                    border: fieldErrors.phone ? "1px solid #ef4444" : "1px solid #cbd5e1", 
                    fontSize: "13px", 
                    boxSizing: "border-box" 
                  }}
                />
                {fieldErrors.phone && (
                  <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: 600, marginTop: "4px", display: "block" }}>
                    {fieldErrors.phone}
                  </span>
                )}
              </div>

              {/* EMPLOYMENT STATUS */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>Employment Status</label>
                <select
                  value={editForm.employmentStatus}
                  onChange={(e) => {
                    setEditForm({ ...editForm, employmentStatus: e.target.value as "Probation" | "Permanent" });
                    setFieldErrors((prev) => ({ ...prev, employmentStatus: "" }));
                  }}
                  style={{ 
                    width: "100%", 
                    padding: "10px 12px", 
                    borderRadius: "8px", 
                    border: fieldErrors.employmentStatus ? "1px solid #ef4444" : "1px solid #cbd5e1", 
                    fontSize: "13px", 
                    background: "#fff", 
                    boxSizing: "border-box" 
                  }}
                >
                  <option value="Probation">Probation</option>
                  <option value="Permanent">Permanent</option>
                </select>
                {fieldErrors.employmentStatus && (
                  <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: 600, marginTop: "4px", display: "block" }}>
                    {fieldErrors.employmentStatus}
                  </span>
                )}
              </div>

              {/* POSITION & DEPARTMENT */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", alignItems: "start" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>Department</label>
                  <select
                    value={editForm.department}
                    onChange={(e) => {
                      const newDept = e.target.value;
                      const availablePositions = POSITION_OPTIONS.filter(pos => pos === "Director" || VALID_POSITION_DEPARTMENTS[pos] === newDept);
                      const newPos = availablePositions.includes(editForm.position) ? editForm.position : "";
                      
                      setEditForm({ ...editForm, department: newDept, position: newPos });
                      setFieldErrors((prev) => ({ ...prev, department: "", position: "" }));
                    }}
                    style={{ 
                      width: "100%", 
                      padding: "10px 12px", 
                      borderRadius: "8px", 
                      border: fieldErrors.department ? "1px solid #ef4444" : "1px solid #cbd5e1", 
                      fontSize: "13px", 
                      background: "#fff", 
                      boxSizing: "border-box" 
                    }}
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENT_OPTIONS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  {fieldErrors.department && (
                    <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: 600, marginTop: "4px", display: "block" }}>
                      {fieldErrors.department}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>Position</label>
                  <select
                    value={editForm.position}
                    onChange={(e) => {
                      setEditForm({ ...editForm, position: e.target.value });
                      setFieldErrors((prev) => ({ ...prev, position: "" }));
                    }}
                    style={{ 
                      width: "100%", 
                      padding: "10px 12px", 
                      borderRadius: "8px", 
                      border: fieldErrors.position ? "1px solid #ef4444" : "1px solid #cbd5e1", 
                      fontSize: "13px", 
                      background: "#fff", 
                      boxSizing: "border-box" 
                    }}
                  >
                    <option value="">Select Position</option>
                    {POSITION_OPTIONS
                      .filter(pos => !editForm.department || pos === "Director" || VALID_POSITION_DEPARTMENTS[pos] === editForm.department)
                      .map((pos) => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                  </select>
                  {fieldErrors.position && (
                    <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: 600, marginTop: "4px", display: "block" }}>
                      {fieldErrors.position}
                    </span>
                  )}
                </div>
              </div>

              {/* RESET PASSWORD (OPTIONAL) */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>
                  Reset Password (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Min. 10 chars (letters, numbers, symbols)"
                  value={editForm.newPassword || ""}
                  onChange={(e) => {
                    setEditForm({ ...editForm, newPassword: e.target.value });
                    setFieldErrors((prev) => ({ ...prev, newPassword: "" }));
                  }}
                  style={{ 
                    width: "100%", 
                    padding: "10px 12px", 
                    borderRadius: "8px", 
                    border: fieldErrors.newPassword ? "1px solid #ef4444" : "1px solid #cbd5e1", 
                    fontSize: "13px", 
                    boxSizing: "border-box" 
                  }}
                />
                {fieldErrors.newPassword && (
                  <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: 600, marginTop: "4px", display: "block" }}>
                    {fieldErrors.newPassword}
                  </span>
                )}
              </div>

              {/* BUTTON ACTION */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setEditingEmployee(null);
                    setFieldErrors({});
                  }}
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

      {/* MODAL SUKSES EDIT DATA */}
      {successModal.isOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: "20px" }}>
          <div style={{ width: "100%", maxWidth: "380px", background: "#ffffff", borderRadius: "20px", padding: "32px 24px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", textAlign: "center", boxSizing: "border-box" }}>
            
            {/* ICON CENTANG HIJAU */}
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#dcfce7", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px auto" }}>
              <svg viewBox="0 0 24 24" style={{ width: "32px", height: "32px", fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            {/* JUDUL */}
            <h3 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: 800, color: "#0f172a" }}>
              Data Berhasil Diperbarui
            </h3>

            {/* DESKRIPSI */}
            <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5", margin: "0 0 24px 0" }}>
              Perubahan pada akun <b>{successModal.name}</b> telah berhasil disimpan ke database.
            </p>

            {/* TOMBOL OK */}
            <button
              type="button"
              onClick={() => setSuccessModal({ isOpen: false, name: "" })}
              style={{ width: "100%", padding: "12px 20px", borderRadius: "12px", border: 0, background: "#2563eb", color: "#ffffff", fontSize: "14px", fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 20px rgba(37,99,235,0.35)", transition: "all 0.2s ease" }}
            >
              Ok
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function SmkiPage() {
  return (
    <Suspense fallback={<main className="flex h-screen items-center justify-center bg-[#07111f] text-white">Loading Dashboard IT...</main>}>
      <SmkiDashboard />
    </Suspense>
  );
}
