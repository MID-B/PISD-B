'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Bell, Building2, ChartNoAxesCombined, ClipboardList } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { recordLogout } from '@/query/tracklog';

type DashboardShellProps = {
  activePage: 'dashboard' | 'sales-performance' | 'issue-board';
  headerActions?: ReactNode;
  children: ReactNode;
};

const navigation = [
  { href: '/dashboard', label: 'Dashboard', key: 'dashboard', icon: Building2 },
  { href: '/dashboard/sales-performance', label: 'Sales Performance', key: 'sales-performance', icon: ChartNoAxesCombined },
  { href: '/dashboard/issue-board', label: 'Issue Board', key: 'issue-board', icon: ClipboardList },
];

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

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    setLogoutError('');
    try {
      await recordLogout();
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      window.location.replace('/login');
    } catch {
      setLogoutError('Logout gagal. Silakan coba lagi.');
      setSigningOut(false);
    }
  }

  useEffect(() => {
    let disposed = false;
    let revision = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

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

        // Match the authenticated account, as the existing login flow does.
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

    function refreshProfile() {
      const request = ++revision;
      clearTimeout(timer);
      // Run Supabase calls outside the auth callback to avoid its session lock.
      timer = setTimeout(() => { void loadProfile(request); }, 0);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        ++revision;
        clearTimeout(timer);
        setProfile(guestProfile);
      } else {
        if (event === 'SIGNED_IN') setProfile({ name: 'Memuat…', position: '' });
        refreshProfile();
      }
    });
    refreshProfile();
    return () => {
      disposed = true;
      ++revision;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const initials = profile.name === 'Memuat…' ? '…' : profile.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#F4F5F9] font-sans">
      <aside className="w-[148px] flex flex-col justify-between px-3 py-3 flex-shrink-0 text-white bg-[#102748]">
        <div>
          {/* Brand: logo di kiri + nama perusahaan di kanan */}
          <div className="flex items-center gap-2 px-0.5 mb-7">
            <div className="w-9 h-9 shrink-0 flex items-center justify-center overflow-hidden">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-ANDIMA-wzx4gpZx20EFE5IYcH3jqabixELIo3.png"
                alt="Logo ANDIMA"
                width={400}
                height={246}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0 leading-none">
              <h4 className="text-[14px] font-extrabold tracking-tight text-white">ANDIMA</h4>
              <p className="mt-1.5 text-[8px] text-slate-300 whitespace-nowrap">Logistics Suite</p>
            </div>
          </div>

          <nav className="space-y-2" aria-label="Main navigation">
            {navigation.map(({ href, label, key, icon: Icon }) => (
              <Link
                key={key}
                href={href}
                aria-label={label}
                title={label}
                aria-current={activePage === key ? 'page' : undefined}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[10px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
                  activePage === key
                    ? 'bg-[#075EDB] text-white shadow-sm'
                    : 'text-slate-300 hover:bg-[#18355D] hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Logout - tombol outline merah seperti referensi */}
        <div className="pt-4">
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            aria-label="Logout"
            title="Logout"
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-full border border-[#F43F5E] text-[#FF4D6D] text-[9px] font-medium hover:bg-[#F43F5E]/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
          >
            <span>{signingOut ? 'Keluar…' : 'Logout'}</span>
          </button>
          {logoutError && <p role="alert" className="mt-2 text-[10px] text-rose-200">{logoutError}</p>}
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="min-h-12 px-3 sm:px-4 py-2 flex flex-wrap justify-between items-center gap-x-4 gap-y-2 flex-shrink-0 border-b border-slate-100 bg-white text-[#253044]">
          <div className="flex items-center gap-2">
            <h1 className="text-[13px] font-bold whitespace-nowrap">ANDIMA MID</h1>
            <span aria-hidden="true" className="h-4 w-px bg-slate-100" />
            <p className="text-[10px] font-semibold text-[#53605A]">
              {activePage === 'dashboard' ? 'Main Dashboard' : activePage === 'issue-board' ? 'Issue Board' : 'Sales Performance'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            {headerActions}
            <div role="img" aria-label="Notifikasi" className="relative flex h-7 w-11 items-center justify-center border-x border-[#E1E8F5]">
              <Bell className="h-3.5 w-3.5 text-[#8292A8]" aria-hidden="true" />
            </div>
            <div className="flex items-center gap-2" aria-label={`Profil: ${profile.name}, ${profile.position}`} aria-live="polite">
              <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#A4CFB9] bg-[#D0E9DC] text-[11px] font-medium text-[#16815B]">{initials}</span>
              <div className="leading-tight">
                <p className="max-w-36 truncate text-[10px] font-semibold sm:max-w-48" title={profile.name}>{profile.name}</p>
                <p className="mt-0.5 max-w-36 truncate text-[9px] text-[#738297] sm:max-w-48" title={profile.position}>{profile.position}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="p-4 md:p-6 space-y-6">{children}</main>
      </div>
    </div>
  );
}
