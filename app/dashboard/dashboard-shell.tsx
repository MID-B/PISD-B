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

export default function DashboardShell({ activePage, headerActions, children }: DashboardShellProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [profile, setProfile] = useState<HeaderProfile>({ name: 'Memuat…', position: '' });
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);


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
    <main style={{ width: "100vw", height: "100vh", display: "flex", background: "#000", overflow: "hidden", margin: 0, padding: 0, boxSizing: "border-box" }}>

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
        overflow: "hidden",
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease"
      }}>
        
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
                        style={
                          activePage === 'dashboard'
                            ? { backgroundColor: "#B0C6D4", color: "#45556C" }
                            : undefined
                        }
                        className={`flex items-center gap-2.5 py-2 px-3.5 text-sm rounded-xl transition-all ${
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
                        style={
                          activePage === 'sales-performance'
                            ? { backgroundColor: "#B0C6D4", color: "#45556C" }
                            : undefined
                        }
                        className={`flex items-center gap-2.5 py-2 px-3.5 text-sm rounded-xl transition-all ${
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
                        style={
                          activePage === 'issue-board'
                            ? { backgroundColor: "#B0C6D4", color: "#45556C" }
                            : undefined
                        }
                        className={`flex items-center gap-2.5 py-2 px-3.5 text-sm rounded-xl transition-all ${
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
      <section style={{ flex: 1, height: "100vh", background: "#ffffff", display: "flex", flexDirection: "column", overflow: "hidden", boxSizing: "border-box" }}>

        {/* TOP BAR / HEADER */}
        <header style={{ width: "100%", height: "56px", padding: "0 24px", background: "#ffffff", borderBottom: "1px solid #e2e8f0", color: "#0f172a", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, boxSizing: "border-box", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>

            {/* TAMBAHAN BARU: Tombol Toggle Sidebar */}
            <button type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              aria-label={isSidebarOpen ? "Tutup Sidebar" : "Buka Sidebar"}
              title={isSidebarOpen ? "Tutup Sidebar" : "Buka Sidebar"}
              style={{width: "34px", height: "34px", borderRadius: "8px", border: "none",  background: "#3B6FF5", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "background-color 0.2s ease", }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2558DC")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#3B6FF5")}
            >
              <HamburgerIcon />
            </button>

            <span style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>ANDIMA MID</span>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", whiteSpace: "nowrap" }}>
              <Text dynamic>{activePage === 'dashboard' ? 'Main Dashboard' : activePage === 'issue-board' ? 'Issue Board' : 'Sales Performance'}</Text>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {headerActions}
            <LanguageSwitcher />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }} aria-label={`Profil: ${profile.name}, ${profile.position}`} aria-live="polite">
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#bbf7d0", color: "#166534", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800 }}>
                {initials}
              </div>
              <div style={{ lineHeight: "1.2" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#0f172a", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={profile.name}>
                  {firstName}
                </div>
                <div style={{ fontSize: "9px", color: "#64748b", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={profile.position}>
                  <Text dynamic>{profile.position}</Text>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* KONTEN HALAMAN */}
        <main style={{flex: 1, minHeight: 0, padding: activePage === 'dashboard' ? "8px" : "24px",
            overflowY: activePage === 'dashboard' ? "hidden" : "auto", boxSizing: "border-box", background: "#f1f3fc",
          }}
        >
          {children}
        </main>
      </section>
    </main>
  );
}
