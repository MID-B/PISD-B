'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { trackActivity } from '@/query/activity';

type DashboardShellProps = {
  activePage: 'dashboard' | 'sales-performance' | 'issue-board';
  headerActions?: ReactNode;
  children: ReactNode;
};

/* SVG ICONS UNTUK SIDEBAR & HEADER */
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

export default function DashboardShell({ activePage, headerActions, children }: DashboardShellProps) {
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [profile, setProfile] = useState<HeaderProfile>({ name: 'Memuat…', position: '' });
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  
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


  useEffect(() => {
    let disposed = false;
    let revision = 0;

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
    <main style={{ width: "100vw", height: "100vh", display: "flex", background: "#000", overflow: "hidden", fontFamily: "Arial, Helvetica, sans-serif", margin: 0, padding: 0, boxSizing: "border-box" }}>

      {/* SIDEBAR */}
      <aside style={{ 
        width: isSidebarOpen ? "250px" : "0px", // Ditutup 100% rapat jadi 0px
        height: "100vh", 
        flexShrink: 0, 
        position: "relative", 
        padding: isSidebarOpen ? "24px 16px" : "0px", // Padding 0 saat ditutup
        background: "#0f2038", 
        color: "#fff", 
        display: "flex", 
        flexDirection: "column", 
        boxSizing: "border-box",
        overflow: "visible", // PENTING: Jangan 'hidden' agar tombol bulat melayang tidak terpotong!
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease" 
      }}>

        {/* 🔘 TOMBOL BULAT BIRU MELAYANG UTUH */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{
            position: "absolute",
            right: "-18px", // Tetap menggantung pas di garis tepi
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
                <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "1px" }}>Logistics Suite</div>
              </div>
            </div>

            {/* NAVIGASI MENU */}
            <nav style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, marginTop: "20px" }}>
              <div>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
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
                  <span>Menu Utama</span>
                  <ChevronDownIcon isOpen={isMenuOpen} />
                </button>

                {isMenuOpen && (
                  <div style={{ position: "relative", marginTop: "12px", paddingLeft: "16px" }}>
                    <div style={{ position: "absolute", left: "6px", top: "0", bottom: "8px", width: "1px", backgroundColor: "rgba(255, 255, 255, 0.2)" }} />
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {/* Contoh untuk Dashboard (aktif pakai kotak abu-abu) */}
                      <Link href="/dashboard" className={`flex items-center gap-3 py-2 px-3 text-sm rounded-xl transition-all ${activePage === 'dashboard' ? 'bg-[#2b3748] text-white border border-slate-600 shadow-sm font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
                        <AccountIcon /> <span>Dashboard</span>
                      </Link>

                      {/* Contoh untuk Sales Performance */}
                      <Link href="/dashboard/sales-performance" className={`flex items-center gap-3 py-2 px-3 text-sm rounded-xl transition-all ${activePage === 'sales-performance' ? 'bg-[#2b3748] text-white border border-slate-600 shadow-sm font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
                        <ActivityIcon /> <span>Sales Performance</span>
                      </Link>

                      {/* Contoh untuk Issue Board */}
                      <Link href="/dashboard/issue-board" className={`flex items-center gap-3 py-2 px-3 text-sm rounded-xl transition-all ${activePage === 'issue-board' ? 'bg-[#2b3748] text-white border border-slate-600 shadow-sm font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
                        <ClipboardIcon /> <span>Issue Board</span>
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
              {signingOut ? 'Keluar…' : 'Logout'}
            </button>
            {logoutError && <p role="alert" className="mt-2 text-[10px] text-rose-200">{logoutError}</p>}
          </div>
        )}

      </aside>

      {/* MAIN CONTENT AREA */}
      <section style={{ flex: 1, height: "100vh", background: "#ffffff", display: "flex", flexDirection: "column", overflow: "hidden", boxSizing: "border-box" }}>

        {/* TOP BAR / HEADER (TANPA LONCENG, PROFIL DI KANAN ATAS) */}
        <header style={{ width: "100%", height: "56px", padding: "0 24px", background: "#ffffff", borderBottom: "1px solid #e2e8f0", color: "#0f172a", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, boxSizing: "border-box", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>ANDIMA MID</span>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", whiteSpace: "nowrap" }}>
              {activePage === 'dashboard' ? 'Main Dashboard' : activePage === 'issue-board' ? 'Issue Board' : 'Sales Performance'}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {headerActions}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }} aria-label={`Profil: ${profile.name}, ${profile.position}`} aria-live="polite">
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#bbf7d0", color: "#166534", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800 }}>
                {initials}
              </div>
              <div style={{ lineHeight: "1.2" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#0f172a", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={profile.name}>
                  {firstName}
                </div>
                <div style={{ fontSize: "9px", color: "#64748b", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={profile.position}>
                  {profile.position}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* KONTEN HALAMAN */}
        <main style={{ flex: 1, padding: "24px", overflowY: "auto", boxSizing: "border-box", background: "#f1f3fc" }}>
          {children}
        </main>
      </section>
    </main>
  );
}