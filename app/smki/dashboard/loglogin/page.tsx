"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { fetchLoginLogs, recordLogout, type LoginLogRecord } from "@/query/tracklog";
import { logoutWithActivity } from '@/query/activity';

const IT_DEPARTMENT_UUID = "8113ab6f-d5cc-4c94-bbf6-e08047931fab";
const DEPARTMENT_OPTIONS = [
  "Human Resources",
  "Logistics & Shipment Operations",
  "Information Technology",
  "Finance, Accounting & Tax",
  "Commercial & Customer Success",
];

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

function ChevronDownIcon({ isOpen }: { isOpen: boolean }) {
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
        transition: "transform 0.2s ease",
      }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function formatLogDate(date: string | null) {
  if (!date) return "";
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : date;
}

function formatLogTime(time: string | null) {
  if (!time) return "";
  const [hour, minute] = time.split(":");
  return hour && minute ? `${hour}.${minute}` : time;
}

function LoginDateTime({ date, time }: { date: string | null; time: string | null }) {
  if (!date && !time) {
    return <span style={{ display: "block", textAlign: "center" }}>-</span>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", lineHeight: 1.35, textAlign: "center" }}>
      <span>{formatLogDate(date)}</span>
      <span>{formatLogTime(time)}</span>
    </div>
  );
}

function CompanyLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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

export default function LogLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserFullName, setCurrentUserFullName] = useState("");
  const [isSmkiOpen, setIsSmkiOpen] = useState(true);
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [nameSearch, setNameSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const dateRangeDialogRef = useRef<HTMLDialogElement>(null);
  const [loginLogs, setLoginLogs] = useState<LoginLogRecord[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState("");
  const departments = [...new Set([
    ...DEPARTMENT_OPTIONS,
    ...loginLogs.map((log) => log.departement?.trim()).filter((department): department is string => Boolean(department)),
  ])].sort((a, b) => a.localeCompare(b));
  const filteredLoginLogs = loginLogs.filter((log) => {
    const matchesName = (log.nama || "").toLocaleLowerCase().includes(nameSearch.trim().toLocaleLowerCase());
    const matchesDepartment = !selectedDepartment || log.departement?.trim().toLocaleLowerCase() === selectedDepartment.toLocaleLowerCase();
    return matchesName && matchesDepartment;
  });
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredLoginLogs.length / pageSize));
  const pageLoginLogs = filteredLoginLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [nameSearch, selectedDepartment, selectedStartDate, selectedEndDate]);

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: userData, error } = await supabase
        .from("b2_register")
        .select("departement_id, full_name")
        .ilike("email", session.user.email || "")
        .maybeSingle();

      if (error || !userData || userData.departement_id !== IT_DEPARTMENT_UUID) {
        alert("Akses ditolak. Halaman ini khusus untuk Tim IT / Security Admin.");
        router.replace("/login");
        return;
      }

      setCurrentUserFullName(userData.full_name || session.user.email || "IT User");
      setIsLoading(false);
    };

    void checkAccess();
  }, [router]);

  useEffect(() => {
    if (isLoading) return;
    let isCurrent = true;

    const loadLoginLogs = async () => {
      setIsLogsLoading(true);
      setLogsError("");
      try {
        const logs = await fetchLoginLogs(selectedStartDate || undefined, selectedEndDate || undefined);
        if (isCurrent) {
          setLoginLogs(logs);
        }
      } catch (error) {
        console.error("Gagal memuat riwayat login:", error);
        if (isCurrent) {
          setLoginLogs([]);
          setLogsError(error instanceof Error ? error.message : "Gagal memuat riwayat login.");
        }
      } finally {
        if (isCurrent) {
          setIsLogsLoading(false);
        }
      }
    };

    void loadLoginLogs();
    return () => {
      isCurrent = false;
    };
  }, [isLoading, selectedStartDate, selectedEndDate]);

  const handleLogout = async () => {
    await recordLogout();
    const { error } = await logoutWithActivity('Keluar dari aplikasi.');

    if (error) {
      alert("Gagal logout: " + error.message);
      return;
    }

    router.replace("/login");
  };

  if (isLoading) {
    return (
      <main style={{ background: "#07111f", color: "#fff", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        Loading Log Login...
      </main>
    );
  }

  const submenuButtonStyle = (active: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "10px 14px",
    border: 0,
    borderRadius: "10px",
    backgroundColor: active ? "rgba(255, 255, 255, 0.15)" : "transparent",
    color: active ? "#ffffff" : "#94a3b8",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "13px",
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s ease",
  });

  return (
    <main style={{ width: "100vw", height: "100vh", display: "flex", overflow: "hidden", fontFamily: "sans-serif" }}>
      <aside style={{ width: "250px", height: "100vh", flexShrink: 0, position: "relative", padding: "24px 16px", background: "#0f2038", color: "#fff", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
        <CompanyLogo />

        <nav style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, marginTop: "20px" }}>
          <div>
            <button
              type="button"
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
                <div style={{ position: "absolute", left: "10px", top: 0, bottom: "8px", width: "1px", backgroundColor: "rgba(255, 255, 255, 0.2)" }} />
                <button type="button" onClick={() => router.push("/smki/dashboard")} style={submenuButtonStyle(false)}>
                  <AccountIcon />
                  <span>Account Maintains</span>
                </button>
                <button type="button" onClick={() => router.push("/smki/dashboard?tab=log-activity")} style={submenuButtonStyle(false)}>
                  <ActivityIcon />
                  <span>Log Activity</span>
                </button>
                <button type="button" onClick={() => router.push("/smki/dashboard/loglogin")} style={submenuButtonStyle(true)} aria-current="page">
                  <LoginIcon />
                  <span>Log Login</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          style={{ width: "100%", height: "44px", borderRadius: "22px", border: "2px solid #f43f5e", background: "transparent", color: "#f43f5e", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "15px", fontWeight: 700, marginTop: "auto", transition: "all 0.2s ease" }}
        >
          Logout
        </button>
      </aside>

      <section style={{ flex: 1, height: "100vh", background: "#ffffff", display: "flex", flexDirection: "column", overflow: "hidden", boxSizing: "border-box" }}>
        <header style={{ width: "100%", height: "56px", padding: "0 24px", background: "#ffffff", borderBottom: "1px solid #e2e8f0", color: "#0f172a", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, boxSizing: "border-box", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>ANDIMA SMKI</span>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", whiteSpace: "nowrap" }}>Log Login</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#bbf7d0", color: "#166534", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800 }}>
                IT
              </div>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#0f172a", lineHeight: "1.2" }}>{currentUserFullName}</div>
                <div style={{ fontSize: "9px", color: "#64748b" }}>Information Technology</div>
              </div>
            </div>
          </div>
        </header>

        <section style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "20px 24px", background: "#f1f3fc", boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", padding: "8px", border: "1px solid #e7eaf2", borderRadius: "10px", background: "#ffffff", boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)" }}>
            <label style={{ flex: "1 1 220px", minWidth: "160px", height: "38px", display: "flex", alignItems: "center", gap: "8px", padding: "0 10px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc", color: "#94a3b8", boxSizing: "border-box" }}>
              <svg aria-hidden="true" viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "none", stroke: "currentColor", strokeWidth: 2, flexShrink: 0 }}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
              <input aria-label="Search by employee name" value={nameSearch} onChange={(event) => setNameSearch(event.target.value)} placeholder="Search by Employee’s Name" style={{ width: "100%", border: 0, outline: 0, background: "transparent", color: "#0f172a", fontSize: "12px" }} />
            </label>
            <select aria-label="Filter by department" value={selectedDepartment} onChange={(event) => setSelectedDepartment(event.target.value)} style={{ flex: "0 1 220px", width: "220px", minWidth: "190px", height: "38px", padding: "0 10px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#ffffff", color: "#334155", fontSize: "12px", cursor: "pointer" }}>
              <option value="">All Departments</option>
              {departments.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
            <div>
              <button
                type="button"
                aria-label="Filter login history by date"
                aria-haspopup="dialog"
                aria-expanded={isDateRangeOpen}
                onClick={() => {
                  setDraftStartDate(selectedStartDate);
                  setDraftEndDate(selectedEndDate);
                  dateRangeDialogRef.current?.showModal();
                  setIsDateRangeOpen(true);
                }}
                style={{
                  width: "180px",
                  height: "38px",
                  padding: "0 10px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  background: "#ffffff",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  fontSize: "13px",
                  fontWeight: 500,
                  boxSizing: "border-box",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                  <span>Date</span>
                </span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  style={{ width: "18px", height: "18px", flexShrink: 0, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}
                >
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M16 3v4M8 3v4M3 10h18" />
                </svg>
              </button>

              <dialog
                ref={dateRangeDialogRef}
                aria-labelledby="login-date-range-title"
                onClose={() => setIsDateRangeOpen(false)}
                className="fixed inset-0 m-auto w-[440px] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-6 text-[#555555] shadow-xl backdrop:bg-slate-900/30"
                onClick={(event) => {
                  if (event.target !== event.currentTarget) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
                }}
              >
                <form onSubmit={(event) => {
                  event.preventDefault();
                  if (draftStartDate && draftEndDate && draftStartDate > draftEndDate) return;
                  setSelectedStartDate(draftStartDate);
                  setSelectedEndDate(draftEndDate);
                  setCurrentPage(1);
                  dateRangeDialogRef.current?.close();
                }}>
                  <h2 id="login-date-range-title" className="text-[28px] font-bold leading-tight text-black">Filter</h2>
                  <p className="mt-1.5 text-sm text-[#707070]">Select date range to search</p>
                  <div className="mt-5">
                    <p id="login-date-range-label" className="mb-1.5 text-sm font-medium">Date Range</p>
                    <div role="group" aria-labelledby="login-date-range-label" className="flex min-h-14 items-center gap-2 rounded-lg border border-[#D9D9D9] px-3 py-2 focus-within:border-blue-400">
                      <label className="min-w-0 flex-1">
                        <span className="mb-1 block text-[10px] font-medium text-slate-500">Tanggal mulai</span>
                        <input type="date" value={draftStartDate} onChange={(event) => {
                          const start = event.target.value;
                          setDraftStartDate(start);
                          if (start && draftEndDate && start > draftEndDate) setDraftEndDate("");
                        }} className="w-full min-w-0 bg-transparent text-xs text-[#858585] focus-visible:outline-2 focus-visible:outline-blue-500 sm:text-sm" />
                      </label>
                      <span aria-hidden="true" className="text-[#858585]">–</span>
                      <label className="min-w-0 flex-1">
                        <span className="mb-1 block text-[10px] font-medium text-slate-500">Tanggal akhir</span>
                        <input type="date" value={draftEndDate} min={draftStartDate || undefined} onChange={(event) => setDraftEndDate(event.target.value)} className="w-full min-w-0 bg-transparent text-xs text-[#858585] focus-visible:outline-2 focus-visible:outline-blue-500 sm:text-sm" />
                      </label>
                      <button type="button" aria-label="Buka kalender tanggal mulai" onClick={(event) => {
                        const startInput = event.currentTarget.closest("form")?.querySelector<HTMLInputElement>('input[type="date"]');
                        startInput?.focus();
                        startInput?.showPicker?.();
                      }} className="ml-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded text-[#858585] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-500">
                        <CalendarDays aria-hidden="true" className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-500">Filter berdasarkan tanggal login. Kosongkan salah satu batas untuk rentang terbuka.</p>
                  </div>
                  <div className="mt-8 grid grid-cols-[1fr_1.4fr] gap-4">
                    <button type="button" onClick={() => {
                      setSelectedStartDate("");
                      setSelectedEndDate("");
                      setDraftStartDate("");
                      setDraftEndDate("");
                      setCurrentPage(1);
                      dateRangeDialogRef.current?.close();
                    }} className="h-12 cursor-pointer rounded-lg border border-[#B8B8B8] bg-white text-base font-semibold text-[#555555] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-500">Reset</button>
                    <button type="submit" disabled={Boolean(draftStartDate && draftEndDate && draftStartDate > draftEndDate)} className="h-12 cursor-pointer rounded-lg bg-[#386BF6] text-base font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-40">Apply</button>
                  </div>
                </form>
              </dialog>
            </div>
          </div>
          <div style={{ overflow: "auto", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#ffffff" }}>
            <div style={{ minWidth: "920px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 1.2fr 1.2fr 1fr 1fr", alignItems: "center", padding: "10px 16px", background: "#f8fafc", color: "#64748b", fontSize: "11px", fontWeight: 800, letterSpacing: "0.5px", borderBottom: "1px solid #e2e8f0" }}>
                <div>EMPLOYEE NAME</div>
                <div>E-MAIL</div>
                <div>POSITION</div>
                <div>DEPARTMENT</div>
                <div style={{ textAlign: "center" }}>LOGIN</div>
                <div style={{ textAlign: "center" }}>LOGOUT</div>
              </div>
              {isLogsLoading ? (
                <div style={{ padding: "24px 16px", color: "#64748b", fontSize: "12px" }}>Loading login records...</div>
              ) : logsError ? (
                <div role="alert" style={{ padding: "24px 16px", color: "#dc2626", fontSize: "12px" }}>{logsError}</div>
              ) : pageLoginLogs.length ? (
                pageLoginLogs.map((log) => (
                  <div key={log.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 1.2fr 1.2fr 1fr 1fr", alignItems: "center", minHeight: "60px", padding: "8px 16px", color: "#1e293b", fontSize: "12px", borderBottom: "1px solid #e9edf5", boxSizing: "border-box" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700, minWidth: 0 }}>
                      <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#cbd5e1", color: "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, flexShrink: 0 }}>
                        {log.nama?.trim().charAt(0).toUpperCase() || "-"}
                      </span>
                      <span>{log.nama || "-"}</span>
                    </div>
                    <div style={{ overflowWrap: "anywhere", color: "#64748b" }}>{log.email || "-"}</div>
                    <div style={{ fontWeight: 600, color: "#334155" }}>{log.position || "-"}</div>
                    <div style={{ fontWeight: 600, color: "#334155" }}>{log.departement || "-"}</div>
                    <LoginDateTime date={log.tanggal_login} time={log.waktu_login} />
                    <LoginDateTime date={log.tanggal_logout} time={log.waktu_logout} />
                  </div>
                ))
              ) : (
                <div style={{ padding: "24px 16px", color: "#94a3b8", fontSize: "12px" }}>
                  {loginLogs.length ? "No login records match these filters." : selectedStartDate || selectedEndDate ? "No login records in this date range." : "No login records yet."}
                </div>
              )}
            </div>
          </div>
          {!isLogsLoading && !logsError && filteredLoginLogs.length > 0 && (
            <nav aria-label="Login log pagination" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "14px", padding: "16px 4px", color: "#334155", fontSize: "13px" }}>
              <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} style={{ minWidth: "96px", height: "40px", padding: "0 14px", border: "1px solid #dbe2ea", borderRadius: "6px", background: "#ffffff", color: currentPage === 1 ? "#a8b1bf" : "#334155", cursor: currentPage === 1 ? "default" : "pointer" }}>Sebelumnya</button>
              <span aria-live="polite">Halaman {currentPage} dari {totalPages}</span>
              <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} style={{ minWidth: "96px", height: "40px", padding: "0 14px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#ffffff", color: currentPage >= totalPages ? "#a8b1bf" : "#334155", cursor: currentPage >= totalPages ? "default" : "pointer" }}>Berikutnya</button>
            </nav>
          )}
        </section>
      </section>
    </main>
  );
}
