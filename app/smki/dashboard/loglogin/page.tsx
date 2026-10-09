"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { fetchLoginLogs, recordLogout, type LoginLogRecord } from "@/query/tracklog";

const IT_DEPARTMENT_UUID = "8113ab6f-d5cc-4c94-bbf6-e08047931fab";

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

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCalendarDays(month: Date) {
  const firstOfMonth = startOfMonth(month);
  const firstVisibleDay = new Date(
    month.getFullYear(),
    month.getMonth(),
    1 - firstOfMonth.getDay()
  );

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstVisibleDay);
    date.setDate(firstVisibleDay.getDate() + index);
    return { date, key: toDateKey(date), inMonth: date.getMonth() === month.getMonth() };
  });
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
  const [selectedDate, setSelectedDate] = useState("");
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [loginLogs, setLoginLogs] = useState<LoginLogRecord[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState("");

  useEffect(() => {
    if (!isDatePickerOpen) return;

    const closeWhenOutside = (event: MouseEvent) => {
      if (!datePickerRef.current?.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsDatePickerOpen(false);
    };

    document.addEventListener("mousedown", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isDatePickerOpen]);

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
        const logs = await fetchLoginLogs(selectedDate || undefined);
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
  }, [isLoading, selectedDate]);

  const handleLogout = async () => {
    await recordLogout();
    const { error } = await supabase.auth.signOut();

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
                <button type="button" onClick={() => router.push("/smki/dashboard")} style={submenuButtonStyle(false)}>
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
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "14px" }}>
            <div ref={datePickerRef} style={{ position: "relative" }}>
              <button
                type="button"
                aria-label="Filter login history by date"
                aria-haspopup="dialog"
                aria-expanded={isDatePickerOpen}
                onClick={() => {
                  const month = selectedDate
                    ? startOfMonth(new Date(`${selectedDate}T00:00:00`))
                    : startOfMonth(new Date());
                  setVisibleMonth(month);
                  setIsDatePickerOpen((open) => !open);
                }}
                style={{
                  width: "170px",
                  height: "36px",
                  padding: "0 16px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "24px",
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
                  {selectedDate && (
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {new Date(`${selectedDate}T00:00:00`).toLocaleDateString()}
                    </span>
                  )}
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

              {isDatePickerOpen && (
                <div
                  role="dialog"
                  aria-label="Filter login history by date"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    zIndex: 20,
                    width: "292px",
                    padding: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    background: "#ffffff",
                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.18)",
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                      {visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        aria-label="Previous month"
                        onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                        style={{ width: "32px", height: "32px", border: 0, borderRadius: "6px", background: "transparent", color: "#334155", fontSize: "22px", cursor: "pointer" }}
                      >‹</button>
                      <button
                        type="button"
                        aria-label="Next month"
                        onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                        style={{ width: "32px", height: "32px", border: 0, borderRadius: "6px", background: "transparent", color: "#334155", fontSize: "22px", cursor: "pointer" }}
                      >›</button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", color: "#475569", fontSize: "12px", fontWeight: 600 }}>
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day} style={{ padding: "6px 0" }}>{day}</span>)}
                  </div>
                  <div role="grid" aria-label={visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", textAlign: "center" }}>
                    {getCalendarDays(visibleMonth).map(({ date, key, inMonth }) => {
                      const isSelected = selectedDate === key;
                      const isToday = toDateKey(new Date()) === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          role="gridcell"
                          aria-label={date.toLocaleDateString("en-US", { dateStyle: "full" })}
                          aria-pressed={isSelected}
                          onClick={() => {
                            setSelectedDate(key);
                            setIsDatePickerOpen(false);
                          }}
                          style={{
                            height: "34px",
                            border: isToday && !isSelected ? "1px solid #94a3b8" : "1px solid transparent",
                            borderRadius: "5px",
                            background: isSelected ? "#075edb" : "transparent",
                            color: isSelected ? "#ffffff" : inMonth ? "#0f172a" : "#94a3b8",
                            fontSize: "13px",
                            fontWeight: isSelected ? 700 : 400,
                            cursor: "pointer",
                          }}
                        >{date.getDate()}</button>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", padding: "4px 2px 0" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate("");
                        setIsDatePickerOpen(false);
                      }}
                      style={{ border: 0, background: "transparent", color: "#2563eb", fontSize: "13px", cursor: "pointer" }}
                    >Default</button>
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        setSelectedDate(toDateKey(today));
                        setVisibleMonth(startOfMonth(today));
                        setIsDatePickerOpen(false);
                      }}
                      style={{ border: 0, background: "transparent", color: "#2563eb", fontSize: "13px", cursor: "pointer" }}
                    >Today</button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div style={{ overflow: "auto", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#ffffff" }}>
            <div style={{ minWidth: "920px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 1.2fr 1.2fr 1fr 0.8fr 0.8fr", alignItems: "center", padding: "10px 16px", background: "#f8fafc", color: "#64748b", fontSize: "11px", fontWeight: 800, letterSpacing: "0.5px", borderBottom: "1px solid #e2e8f0" }}>
                <div>EMPLOYEE NAME</div>
                <div>E-MAIL</div>
                <div>POSITION</div>
                <div>DEPARTMENT</div>
                <div>DATE</div>
                <div>LOGIN</div>
                <div>LOGOUT</div>
              </div>
              {isLogsLoading ? (
                <div style={{ padding: "24px 16px", color: "#64748b", fontSize: "12px" }}>Loading login records...</div>
              ) : logsError ? (
                <div role="alert" style={{ padding: "24px 16px", color: "#dc2626", fontSize: "12px" }}>{logsError}</div>
              ) : loginLogs.length ? (
                loginLogs.map((log) => (
                  <div key={log.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 1.2fr 1.2fr 1fr 0.8fr 0.8fr", alignItems: "center", minHeight: "48px", padding: "8px 16px", color: "#1e293b", fontSize: "12px", borderBottom: "1px solid #e9edf5", boxSizing: "border-box" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700, minWidth: 0 }}>
                      <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#cbd5e1", color: "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, flexShrink: 0 }}>
                        {log.nama?.trim().charAt(0).toUpperCase() || "-"}
                      </span>
                      <span>{log.nama || "-"}</span>
                    </div>
                    <div style={{ overflowWrap: "anywhere", color: "#64748b" }}>{log.email || "-"}</div>
                    <div style={{ fontWeight: 600, color: "#334155" }}>{log.position || "-"}</div>
                    <div style={{ fontWeight: 600, color: "#334155" }}>{log.departement || "-"}</div>
                    <div>{new Date(`${log.tanggal}T00:00:00`).toLocaleDateString()}</div>
                    <div>{log.waktu_login || "-"}</div>
                    <div>{log.waktu_logout || "-"}</div>
                  </div>
                ))
              ) : (
                <div style={{ padding: "24px 16px", color: "#94a3b8", fontSize: "12px" }}>
                  {selectedDate ? "No login records for this date." : "No login records yet."}
                </div>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
