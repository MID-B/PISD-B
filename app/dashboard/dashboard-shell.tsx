'use client';

import { Text } from '@/components/language';
import { LanguageSwitcher } from '@/components/language';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { trackActivityAndWait } from '@/query/activity';
import { useRouter } from 'next/navigation';

type DashboardShellProps = {
  activePage: 'dashboard' | 'sales-performance' | 'issue-board';
  headerActions?: ReactNode;
  children: ReactNode;
};

/* SVG ICONS UNTUK SIDEBAR & HEADER */
function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{
        width: '20px', height: '20px', flexShrink: 0, fill: 'none', stroke: 'currentColor', strokeWidth: 2.3, strokeLinecap: 'round', strokeLinejoin: 'round',}}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function GridIcon() {
  return(
    <svg viewBox="0 0 24 24" style={{
      width: '18px', height: '18px', flexShrink: 0, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
      }}
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

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

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: "20px", height: "20px", flexShrink: 0, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
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

/* PEMETAAN UUID JABATAN KE NAMA TAMPILAN */
const positionLabels: Record<string, string> = {
  '40a8e1f1-0713-4e5d-a7af-061b6e5f495c': 'Freight Forwarding Specialist',
  '96c66ea1-44b6-474f-9410-ad992dd14b93': 'HR Administrator',
  '265c9357-105c-437c-a244-6897122f17c1': 'Information Technology',
  '0ec333af-8737-413f-adab-841a3067e485': 'Director',
  '10da1bac-a6a8-472e-a171-e4984ab768d9': 'Accounting Associate',
  '58706b7f-950b-4e71-b066-792fbd91424d': 'Sales Executive',
};

type HeaderProfile = { name: string; position: string };
const guestProfile: HeaderProfile = { name: 'Guest', position: 'Belum login' };

// 1. TARUH FUNGSI INI DI LUAR KOMPONEN (DI ATAS DashboardShell)
function getJakartaDateString(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const breadcrumbLabels: Record<DashboardShellProps['activePage'], string> = {
  dashboard: 'Dashboard',
  'sales-performance': 'Sales Performance',
  'issue-board': 'Issue Board',
};

export default function DashboardShell({ activePage, headerActions, children }: DashboardShellProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [profile, setProfile] = useState<HeaderProfile>({ name: 'Memuat…', position: '' });
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      setIsSidebarOpen(true);
    }
  }, []);


  async function handleLogout() {
    if (signingOut) return;

    setSigningOut(true);
    setLogoutError('');

    //mencatat waktu logout untuk MID usahakan tolong jangan diganggu
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Gagal mengambil sesi untuk mencatat waktu logout.');
      } else if (session) {
        const response = await fetch('/api/login-log/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(4000),
        });

        const result = (await response.json().catch(() => null)) as {
          logged?: boolean;
        } | null;

        if (!response.ok || result?.logged !== true) {
          console.error('Waktu logout gagal dicatat di Log Login.');
        }
      }
    } catch (error) {
      console.error('Gagal mencatat waktu logout di Log Login:', error);
    }
    //mencatat waktu logout untuk MID usahakan tolong jangan diganggu

    try {
      // Catat aktivitas tanpa mengakhiri sesi login
      await trackActivityAndWait(
        'Register',
        'Kembali ke Landing Page dari dashboard MID.'
      );

      // Kembali ke Landing Page
      router.push('/landing-page');
    } catch (error) {
      console.error('Gagal kembali ke Landing Page:', error);
      setLogoutError('Gagal kembali ke Landing Page. Silakan coba lagi.');
      setSigningOut(false);
    }
  }

  useEffect(() => {
    let disposed = false;
    let revision = 0;

    if (typeof window !== 'undefined') {
      const today = getJakartaDateString();
      const lastLoginDate = localStorage.getItem('last_login_date');

      if (lastLoginDate && lastLoginDate !== today) {
        console.warn('Hari telah berganti. Sesi otomatis diakhiri.');
        localStorage.removeItem('last_login_date');
        sessionStorage.removeItem('tab-auth');
        void supabase.auth.signOut().finally(() => {
          window.location.replace('/login?reason=day_changed');
        });
        return;
      }

      if (!lastLoginDate) {
        localStorage.setItem('last_login_date', today);
      }
    }

    async function loadProfile(request: number) {
      const isCurrent = () => !disposed && request === revision;
      let fallback = guestProfile;
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!isCurrent()) return;
        if (error || !user) {
          setProfile(guestProfile);
          return;
        }

        const metadataName = user.user_metadata?.full_name;
        fallback = {
          name: typeof metadataName === 'string' && metadataName.trim() ? metadataName.trim() : user.email || 'Pengguna',
          position: positionLabels[user.user_metadata?.position_id] || 'Pengguna',
        };
        setProfile(fallback);

        const query = supabase.from('b2_register').select('full_name, position_id');
        const { data, error: profileError } = await (user.email
          ? query.eq('email', user.email)
          : query.eq('id', user.id)).maybeSingle();
        if (!isCurrent()) return;
        if (!profileError && data) {
          setProfile({
            name: data.full_name?.trim() || fallback.name,
            position: positionLabels[data.position_id] || fallback.position,
          });
        }
      } catch {
        if (isCurrent()) setProfile(fallback);
      }
    }

    const request = ++revision;
    void loadProfile(request);

    return () => {
      disposed = true;
      ++revision;
    };
  }, []);

  // Mengambil kata pertama dari nama lengkap (misal: "Louisa Wedaring" menjadi "Louisa")
  const firstName = profile.name === 'Memuat…' ? '…' : profile.name.trim().split(/\s+/)[0];

  // Inisial untuk bulatan avatar tetap menggunakan huruf pertama dari nama tersebut
  const initials = firstName.charAt(0).toUpperCase();

  return (
    <main className="relative flex h-dvh w-screen overflow-hidden bg-black m-0 p-0 box-border">

      {/* BACKDROP BLUR SAAT SIDEBAR DIBUKA DI HP */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-slate-900/45 backdrop-blur-[2px] md:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-dvh shrink-0 flex-col bg-[#0f2038] text-white overflow-hidden box-border md:relative ${
          isSidebarOpen ? "w-[250px] px-4 py-6" : "w-0 p-0"
        }`}
      >
        
        {/* HANYA TAMPILKAN KONTEN JIKA SIDEBAR DIBUKA */}
        {isSidebarOpen && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" }}>

            {/* LOGO & TITLE */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.1)", whiteSpace: "nowrap" }}>
              <div style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-ANDIMA-wzx4gpZx20EFE5IYcH3jqabixELIo3.png"
                  alt="Logo ANDIMA"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </div>
              <div>
                <div style={{ color: "#ffffff", fontSize: "16px", fontWeight: 800, letterSpacing: "0.5px" }}>ANDIMA</div>
                <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "1px" }}><Text>Logistics Suite</Text></div>
              </div>
            </div>

            {/* NAVIGASI MENU */}
            <nav style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, marginTop: "20px" }}>
              <div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  style={{
                    width: "100%",
                    height: "42px",
                    padding: "0 14px",
                    border: 0,
                    borderRadius: "10px",
                    background: "#0550D7",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <GridIcon />
                    <span>MID</span>
                  </div>
                  <ChevronDownIcon isOpen={isMenuOpen} />
                </button>

                {isMenuOpen && (
                  <div style={{ position: "relative", marginTop: "12px", paddingLeft: "16px" }}>
                    {/* Garis vertikal di sebelah kiri submenu */}
                    <div
                      style={{
                        position: "absolute",
                        left: "6px",
                        top: "4px",
                        bottom: "4px",
                        width: "1px",
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                      }}
                    />

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <Link
                        href="/dashboard"
                        onClick={() => {
                          if (typeof window !== "undefined" && window.innerWidth < 768) {
                            setIsSidebarOpen(false);
                          }
                        }}
                        style={
                          activePage === 'dashboard'
                            ? { backgroundColor: "#B0C6D4", color: "#45556C" }
                            : undefined
                        }
                        className={`flex items-center gap-2.5 py-2 px-3.5 text-sm rounded-xl ${
                          activePage === 'dashboard'
                            ? 'font-semibold'
                            : 'text-white hover:bg-white/5 pl-7'
                        }`}
                      >
                        {activePage === 'dashboard' && (
                          <span
                            style={{ backgroundColor: "#0D9488" }}
                            className="w-2 h-2 rounded-full shrink-0"
                          />
                        )}
                        <span><Text>Dashboard</Text></span>
                      </Link>

                      <Link
                        href="/dashboard/sales-performance"
                        onClick={() => {
                          if (typeof window !== "undefined" && window.innerWidth < 768) {
                            setIsSidebarOpen(false);
                          }
                        }}
                        style={
                          activePage === 'sales-performance'
                            ? { backgroundColor: "#B0C6D4", color: "#45556C" }
                            : undefined
                        }
                        className={`flex items-center gap-2.5 py-2 px-3.5 text-sm rounded-xl ${
                          activePage === 'sales-performance'
                            ? 'font-semibold'
                            : 'text-white hover:bg-white/5 pl-7'
                        }`}
                      >
                        {activePage === 'sales-performance' && (
                          <span
                            style={{ backgroundColor: "#0D9488" }}
                            className="w-2 h-2 rounded-full shrink-0"
                          />
                        )}
                        <span><Text>Sales Performance</Text></span>
                      </Link>

                      <Link
                        href="/dashboard/issue-board"
                        onClick={() => {
                          if (typeof window !== "undefined" && window.innerWidth < 768) {
                            setIsSidebarOpen(false);
                          }
                        }}
                        style={
                          activePage === 'issue-board'
                            ? { backgroundColor: "#B0C6D4", color: "#45556C" }
                            : undefined
                        }
                        className={`flex items-center gap-2.5 py-2 px-3.5 text-sm rounded-xl ${
                          activePage === 'issue-board'
                            ? 'font-semibold'
                            : 'text-white hover:bg-white/5 pl-7'
                        }`}
                      >
                        {activePage === 'issue-board' && (
                          <span
                            style={{ backgroundColor: "#0D9488" }}
                            className="w-2 h-2 rounded-full shrink-0"
                          />
                        )}
                        <span><Text>Issue Board</Text></span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* TOMBOL LOGOUT (Hanya muncul jika sidebar dibuka) */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              style={{
                width: "100%", height: "44px", borderRadius: "22px", border: "2px solid #f43f5e", background: "transparent",
                color: "#f43f5e", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                fontSize: "15px", fontWeight: 700, marginTop: "auto", transition: "all 0.2s ease"
              }}
            >
              <Text dynamic>{signingOut ? 'Keluar…' : 'Logout'}</Text>
            </button>
            {logoutError && <p role="alert" className="mt-2 text-[10px] text-rose-200"><Text dynamic>{logoutError}</Text></p>}
          </div>
        )}

      </aside>

      {/* MAIN CONTENT AREA */}
      <section className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-white box-border">

        {/* TOP BAR / HEADER */}
        <header className="flex h-14 w-full shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 sm:px-6 text-slate-900 box-border">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">

            {/* Tombol Toggle Sidebar */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              aria-label={isSidebarOpen ? "Tutup Sidebar" : "Buka Sidebar"}
              title={isSidebarOpen ? "Tutup Sidebar" : "Buka Sidebar"}
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border-0 bg-[#3B6FF5] text-white cursor-pointer transition-colors hover:bg-[#2558DC]"
            >
              <HamburgerIcon />
            </button>

            <span className="hidden sm:inline text-[13px] font-extrabold text-slate-900 whitespace-nowrap">
              ANDIMA MID
            </span>
            <span className="hidden sm:inline text-base font-light text-slate-200">|</span>
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-xs whitespace-nowrap">
              <Link
                href="/dashboard"
                className="font-semibold text-slate-700 no-underline hover:text-slate-900 transition-colors"
              >
                MID
              </Link>
              <span className="font-semibold text-slate-400">/</span>
              <span className="truncate font-semibold text-slate-700">
                <Text dynamic>{breadcrumbLabels[activePage]}</Text>
              </span>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            {headerActions}
            <LanguageSwitcher />
            <div className="flex items-center gap-2" aria-label={`Profil: ${profile.name}, ${profile.position}`} aria-live="polite">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-200 text-xs font-extrabold text-green-800">
                {initials}
              </div>
              <div className="hidden md:block leading-[1.2]">
                <div className="max-w-[160px] truncate text-[11px] font-bold text-slate-900" title={profile.name}>
                  {firstName}
                </div>
                <div className="max-w-[160px] truncate text-[9px] text-slate-500" title={profile.position}>
                  <Text dynamic>{profile.position}</Text>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* KONTEN HALAMAN */}
        <main
          className={`min-h-0 flex-1 bg-[#f1f3fc] box-border ${
            activePage === "dashboard"
              ? "overflow-y-auto lg:overflow-hidden p-2"
              : "overflow-y-auto p-3 sm:p-6"
          }`}
        >
          {children}
        </main>
      </section>
    </main>
  );
}
