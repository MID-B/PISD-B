"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { fetchLoginLogs, recordLogout, type LoginLogRecord } from "@/query/tracklog";
{/* cuman nambah ini untuk ambil pagination */ }
import Pagination from "@/components/pagination";
{/* cuman ubah ini untuk ambil pagination */ }
import { logoutWithActivity } from '@/query/activity';

const IT_DEPARTMENT_UUID = "8113ab6f-d5cc-4c94-bbf6-e08047931fab";
const DEPARTMENT_OPTIONS = [
  "Human Resources",
  "Information Technology",
  "Finance, Accounting & Tax",
  "Commercial & Customer Success",
];

{/* memperbaiki filter human resource */ }
function normalizeDepartmentName(department?: string | null) {
  const name = department?.trim() ?? "";
  const key = name.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");

  if (
    key === "humanresources" ||
    (key.includes("humancapital") && key.includes("culture"))
  ) {
    return "Human Resources";
  }

  return name;
}
{/* memperbaiki filter human resource */ }

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
  return match ? `${match[3]}/${match[2]}/${match[1]}` : date;
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

  {/* cuman ubah ini untuk ambil side bar dari smki dashboard */ }
  const [isSmkiOpen, setIsSmkiOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  {/* cuman ubah ini untuk ambil side bar dari smki dashboard */ }

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

  {/* memperbaiki filter human resource */ }
  const departments = [
    ...new Set([
      ...DEPARTMENT_OPTIONS,
      ...loginLogs
        .map((log) => normalizeDepartmentName(log.departement))
        .filter(Boolean),
    ]),
  ];

  const filteredLoginLogs = loginLogs.filter((log) => {
    const matchesName = (log.nama || "")
      .toLocaleLowerCase()
      .includes(nameSearch.trim().toLocaleLowerCase());

    const matchesDepartment =
      !selectedDepartment ||
      normalizeDepartmentName(log.departement).toLocaleLowerCase() ===
      normalizeDepartmentName(selectedDepartment).toLocaleLowerCase();

    return matchesName && matchesDepartment;
  });

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredLoginLogs.length / pageSize));
  const pageLoginLogs = filteredLoginLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );


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
    try {
      // Cukup catat record logout tanpa menghapus sesi auth Supabase secara paksa
      await recordLogout();
    } catch (error) {
      console.error('Gagal mencatat log logout:', error);
    } finally {
      // Langsung arahkan secara mutlak ke Landing Page
      window.location.replace('/landing-page');
    }
  };



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


    <div
      style={{
        width: "100%",
        minWidth: 0,
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        padding: "20px 24px",
        background: "#ffffff",
        boxSizing: "border-box",
      }}
    >
      {/* menyesuaikan kotak latar belakang search dan filter */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        {/* menyesuaikan kotak latar belakang search dan filter */}

        {/* menyesuaikan desain search */}
        <label className="relative flex h-10 min-w-[240px] flex-1 items-center rounded-xl border border-transparent bg-[#f1f3fe] pl-10 pr-3 text-xs focus-within:border-purple-300 focus-within:bg-white">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3.5 h-4 w-4 fill-none stroke-slate-400"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>

          <input
            aria-label="Search by employee name"
            value={nameSearch}
            onChange={(event) => setNameSearch(event.target.value)}
            placeholder="Search by Employee's Name"
            className="h-full w-full border-0 bg-transparent text-xs font-medium text-slate-700 outline-none placeholder:text-slate-400"
          />
        </label>
        {/* cuman ubah ini untuk ambil pagination */}

        {/* menyesuaikan desain filter department */}
        <select
          aria-label="Filter by department"
          value={selectedDepartment}
          onChange={(event) => setSelectedDepartment(event.target.value)}
          className="h-10 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-purple-400 focus:outline-none sm:w-56"
        >
          <option value="">All Department</option>
          {departments.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
        {/* menyesuaikan desain filter department */}

        {/* menyesuaikan desain filter tanggal */}
        <div>
          <button
            type="button"
            aria-label="Filter login history by date"
            aria-haspopup="dialog"
            onClick={() => {
              setDraftStartDate(selectedStartDate);
              setDraftEndDate(selectedEndDate);
              dateRangeDialogRef.current?.showModal();
              setIsDateRangeOpen(true);
            }}
            className={`flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 text-xs font-medium text-slate-700 shadow-2xs cursor-pointer focus-visible:outline-2 focus-visible:outline-purple-400 sm:w-56 ${selectedStartDate || selectedEndDate
              ? "border-purple-300"
              : "border-slate-200"
              }`}
          >
            <span className="truncate">
              {selectedStartDate && selectedEndDate
                ? `${formatLogDate(selectedStartDate)} - ${formatLogDate(selectedEndDate)}`
                : selectedStartDate
                  ? `Mulai ${formatLogDate(selectedStartDate)}`
                  : selectedEndDate
                    ? `Sampai ${formatLogDate(selectedEndDate)}`
                    : "Date"}
            </span>
            <CalendarDays
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-slate-500"
            />
          </button>

          <dialog
            ref={dateRangeDialogRef}
            aria-labelledby="login-date-range-title"
            onClose={() => setIsDateRangeOpen(false)}
            className="fixed inset-0 m-auto w-[480px] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-6 text-[#555555] shadow-xl backdrop:bg-slate-900/30"
            onClick={(event) => {
              if (event.target !== event.currentTarget) return;
              const rect = event.currentTarget.getBoundingClientRect();
              if (
                event.clientX < rect.left ||
                event.clientX > rect.right ||
                event.clientY < rect.top ||
                event.clientY > rect.bottom
              ) {
                event.currentTarget.close();
              }
            }}
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (
                  draftStartDate &&
                  draftEndDate &&
                  draftStartDate > draftEndDate
                ) {
                  return;
                }

                setSelectedStartDate(draftStartDate);
                setSelectedEndDate(draftEndDate);
                setCurrentPage(1);
                dateRangeDialogRef.current?.close();
              }}
            >
              <h2
                id="login-date-range-title"
                className="text-[28px] font-bold leading-tight text-black"
              >
                Filter
              </h2>
              <p className="mt-1.5 text-sm text-[#707070]">
                Pilih rentang tanggal login.
              </p>

              <div className="mt-5">
                <div
                  role="group"
                  aria-label="Rentang tanggal"
                  className="grid grid-cols-1 gap-4 min-[440px]:grid-cols-2"
                >
                  <label className="block min-w-0">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Tanggal mulai
                    </span>
                    <input
                      type="date"
                      value={draftStartDate}
                      onChange={(event) => {
                        const start = event.target.value;
                        setDraftStartDate(start);
                        if (start && draftEndDate && start > draftEndDate) {
                          setDraftEndDate("");
                        }
                      }}
                      className="h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 [color-scheme:light]"
                    />
                  </label>

                  <label className="block min-w-0">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Tanggal akhir
                    </span>
                    <input
                      type="date"
                      value={draftEndDate}
                      min={draftStartDate || undefined}
                      onChange={(event) => setDraftEndDate(event.target.value)}
                      className="h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 [color-scheme:light]"
                    />
                  </label>
                </div>
              </div>

              {draftStartDate &&
                draftEndDate &&
                draftStartDate > draftEndDate && (
                  <p role="alert" className="mt-2 text-xs text-red-600">
                    Tanggal akhir harus sama atau setelah tanggal mulai.
                  </p>
                )}

              <div className="mt-8 grid grid-cols-[1fr_1.4fr] gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStartDate("");
                    setSelectedEndDate("");
                    setDraftStartDate("");
                    setDraftEndDate("");
                    setCurrentPage(1);
                  }}
                  className="h-12 cursor-pointer rounded-lg border border-[#B8B8B8] bg-white text-base font-semibold text-[#555555] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-500"
                >
                  Reset
                </button>

                <button
                  type="submit"
                  disabled={Boolean(
                    draftStartDate &&
                    draftEndDate &&
                    draftStartDate > draftEndDate,
                  )}
                  className="h-12 cursor-pointer rounded-lg bg-[#386BF6] text-base font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            </form>
          </dialog>
        </div>
        {/* menyesuaikan desain filter tanggal */}

        <button
          type="button"
          onClick={() => {
            setNameSearch("");
            setSelectedDepartment("");
            setSelectedStartDate("");
            setSelectedEndDate("");
            setDraftStartDate("");
            setDraftEndDate("");
            setCurrentPage(1);
          }}
          className="h-10 px-3.5 flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-purple-600 bg-transparent hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-200"
        >
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
          Reset
        </button>

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

      {/* membuat informasi data dalam satu halaman dan total data */}
      {!isLogsLoading && !logsError && (
        <p className="px-1 pt-3 text-xs text-slate-500">
          Showing{" "}
          {filteredLoginLogs.length === 0
            ? 0
            : (currentPage - 1) * pageSize + 1}
          -
          {Math.min(currentPage * pageSize, filteredLoginLogs.length)} of{" "}
          {filteredLoginLogs.length} logins
        </p>
      )}
      {/* membuat informasi data dalam satu halaman dan total data */}

      {/* cuman ubah ini untuk ambil pagination */}
      {!isLogsLoading && !logsError && filteredLoginLogs.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 4px" }}>
          <Pagination
            label="Login log pagination"
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
      {/* cuman ubah ini untuk ambil pagination */}

    </div>
  );
}