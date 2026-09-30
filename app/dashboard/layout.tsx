"use client";

import Link from "next/link";
import { logoutDummyAccount } from "@/lib/dummyAuth";
import { useRouter, usePathname } from "next/navigation";
import type { ReactNode } from "react";

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

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isActivity = usePathname() === "/dashboard/log-activity";
  return (
    <main style={{ width: "100vw", height: "100vh", display: "flex", background: "#000", overflow: "hidden", fontFamily: "Arial, Helvetica, sans-serif", margin: 0, padding: 0, boxSizing: "border-box" }}>

      {/* SIDEBAR */}

      <aside style={{ width: "240px", height: "100vh", flexShrink: 0, position: "relative", padding: "25px 16px", background: "#07111f", color: "#fff", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>

        {/* PROFILE */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{ width: "45px", height: "45px", borderRadius: "50%", background: "#8057e8", flexShrink: 0 }} />
          <div>
            <div style={{ color: "#fff", fontSize: "15px", fontWeight: 800, letterSpacing: "0.2px" }}>ANDIMA</div>
            <div style={{ color: "#b9c1ca", fontSize: "11px", marginTop: "2px" }}>IT & Security Admin</div>
            <div style={{ color: "#b9c1ca", fontSize: "11px", marginTop: "1px" }}>@admin_smki</div>
          </div>
        </div>

        {/* COLLAPSE BUTTON */}
        <button style={{ position: "absolute", top: "28px", right: "-12px", width: "26px", height: "26px", borderRadius: "50%", background: "#8057e8", border: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
          <ChevronLeftIcon />
        </button>

        {/* NAVIGATION */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1, marginTop: "15px" }}>
          <Link href="/dashboard" aria-current={!isActivity ? "page" : undefined} style={{ textDecoration: "none", width: "100%", height: "42px", padding: "0 16px", border: 0, borderRadius: "10px", background: !isActivity ? "#8057e8" : "transparent", color: !isActivity ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
            <AccountIcon />
            <span>Account Maintains</span>
          </Link>

          <Link href="/dashboard/log-activity" aria-current={isActivity ? "page" : undefined} style={{ textDecoration: "none", width: "100%", height: "42px", padding: "0 16px", border: 0, borderRadius: "10px", background: isActivity ? "#8057e8" : "transparent", color: isActivity ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
            <ActivityIcon />
            <span>Log Activity</span>
          </Link>

          <button style={{ width: "100%", height: "42px", padding: "0 16px", border: 0, borderRadius: "10px", background: "transparent", color: "#94a3b8", display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
            <LoginIcon />
            <span>Log Login</span>
          </button>
        </nav>

        {/* LOGOUT */}
        <button onClick={() => { logoutDummyAccount(); router.replace("/login"); }} style={{ width: "100%", height: "40px", padding: "0 12px", border: 0, background: "transparent", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontSize: "14px", fontWeight: 600, marginTop: "auto" }}>
          <span>Logout</span>
          <LogoutIcon />
        </button>

      </aside>

      {/* MAIN CONTENT */}

      <section style={{ minWidth: 0, flex: 1, height: "100vh", background: "#f8f9fc", display: "flex", flexDirection: "column", overflow: "hidden", boxSizing: "border-box" }}>

        {/* HEADER */}
        <header style={{ width: "100%", height: "72px", minHeight: "72px", padding: "0 28px", background: "#0d1b2a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, boxSizing: "border-box" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#8057e8", letterSpacing: "1px" }}>ANDIMA MID</div>
            <div style={{ fontSize: "18px", fontWeight: 700, marginTop: "2px" }}>{isActivity ? "Log Activity" : "SMKI Employee Dashboard"}</div>
          </div>

          {!isActivity && <button style={{ padding: "8px 16px", border: "1px solid #202d3d", borderRadius: "8px", background: "#172536", color: "#fff", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
            <span>Filter Divisi: All</span>
            <ChevronDownIcon />
          </button>}
        </header>

        <div style={{ flex: 1, minHeight: 0, padding: "28px", overflow: "auto", boxSizing: "border-box" }}>
          {children}
        </div>
      </section>
    </main>
  );
}
