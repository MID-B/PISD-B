"use client";

import React from "react";
import "./dashboard.css";

type IssueStatus = "Completed" | "In Progress";

interface Issue {
  department: string;
  id: string;
  issue: string;
  date: string;
  pic: string;
  initials: string;
  status: IssueStatus;
}

const issues: Issue[] = [
  {
    department: "Maju Bersama",
    id: "MB-4019",
    issue: "Send quotation update",
    date: "16 Sep 2026",
    pic: "Yemima",
    initials: "Y",
    status: "Completed",
  },
  {
    department: "Maju Bersama",
    id: "MB-4019",
    issue: "Send quotation update",
    date: "16 Sep 2026",
    pic: "Yemima",
    initials: "Y",
    status: "Completed",
  },
  {
    department: "Sinar Logistik",
    id: "SL-1022",
    issue: "Confirm complaint resolution",
    date: "17 Sep 2026",
    pic: "Khoirul",
    initials: "K",
    status: "In Progress",
  },
  {
    department: "Trisakti Abadi",
    id: "TA-9903",
    issue: "Follow up quotation discussion",
    date: "18 Sep 2026",
    pic: "Nella",
    initials: "N",
    status: "Completed",
  },
  {
    department: "Karya Mandiri",
    id: "KM-5520",
    issue: "Confirm document completion",
    date: "19 Sep 2026",
    pic: "Natalie P",
    initials: "NP",
    status: "In Progress",
  },
];

/* =========================
   ICONS
========================= */

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="icon">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="9" y1="9" x2="21" y2="9" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="icon">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="7" y1="16" x2="7" y2="13" />
      <line x1="11" y1="16" x2="11" y2="9" />
      <line x1="15" y1="16" x2="15" y2="11" />
      <line x1="19" y1="16" x2="19" y2="7" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="icon">
      <path d="M12 3L21 20H3L12 3Z" />
      <line x1="12" y1="9" x2="12" y2="14" />
      <circle cx="12" cy="17" r="0.7" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="logout-icon">
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M21 3v18" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="arrow-icon">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

/* =========================
   PIE CHART
========================= */

function PieChart() {
  return <div className="pie-chart" />;
}

/* =========================
   SALES PERFORMANCE
========================= */

function SalesPerformanceCard() {
  return (
    <div className="sales-card">
      <h2>Sales Performance</h2>

      <div className="sales-card-content">
        <div className="sales-info">
          <div className="last-update">
            Last Update by CRM
            <br />
            September 27, 2026
            <br />
            22:14 PM
          </div>

          <div className="legend">
            <div className="legend-item">
              <span className="legend-dot ccr" />
              CCR
            </div>

            <div className="legend-item">
              <span className="legend-dot hrm" />
              HRM
            </div>

            <div className="legend-item">
              <span className="legend-dot crm" />
              CRM
            </div>

            <div className="legend-item">
              <span className="legend-dot mid" />
              MID
            </div>
          </div>
        </div>

        <div className="chart-wrapper">
          <PieChart />
        </div>
      </div>

      <div className="description">
        <h3>Description</h3>

        <p>
          Performa Departemen CRM menjadi departemen
          <br />
          dengan performa terbaik dalam 1 bulan ini
        </p>
      </div>
    </div>
  );
}

/* =========================
   STATUS
========================= */

function StatusBadge({
  status,
}: {
  status: IssueStatus;
}) {
  const completed = status === "Completed";

  return (
    <span
      className={
        completed
          ? "status-badge completed"
          : "status-badge progress"
      }
    >
      <span className="status-dot" />
      {status}
    </span>
  );
}

/* =========================
   DASHBOARD
========================= */

export default function Dashboard() {
  return (
    <div className="dashboard">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="profile">
          <div className="profile-avatar" />

          <div className="profile-info">
            <div className="brand">
              ANDIMA
            </div>

            <div className="job-title">
              Job Title
            </div>

            <div className="username">
              Username
            </div>
          </div>
        </div>

        <div className="sidebar-divider" />

        <button className="collapse-button">
          <ArrowIcon />
        </button>

        <nav className="sidebar-nav">

          <button className="nav-item active">
            <DashboardIcon />
            <span>Dashboard</span>
          </button>

          <button className="nav-item">
            <ChartIcon />
            <span>Sales Performance</span>
          </button>

          <button className="nav-item">
            <AlertIcon />
            <span>Issue Board</span>
          </button>

        </nav>

        <button className="logout">
          <span>Logout</span>
          <LogoutIcon />
        </button>

      </aside>

      {/* MAIN */}
      <main className="main-content">

        <header className="header">
          <div className="header-brand">
            ANDIMA MID
          </div>

          <div className="header-title">
            Dashboard
          </div>
        </header>

        <section className="content">

          {/* SALES */}
          <div className="performance-column">
            <SalesPerformanceCard />
            <SalesPerformanceCard />
          </div>

          {/* TABLE */}
          <div className="issue-table">

            <div className="table-header">
              <div>DEPARTEMEN</div>
              <div>ISSUE</div>
              <div>DATE</div>
              <div>PIC</div>
              <div>STATUS</div>
            </div>

            <div className="table-body">

              {issues.map((item, index) => (
                <div
                  className="table-row"
                  key={index}
                >

                  <div className="department">
                    <strong>
                      {item.department}
                    </strong>

                    <span>
                      Logistics ID: {item.id}
                    </span>
                  </div>

                  <div className="issue-name">
                    {item.issue}
                  </div>

                  <div className="issue-date">
                    <strong>
                      {item.date}
                    </strong>

                    {index === 1 && (
                      <span>
                        (Tomorrow)
                      </span>
                    )}
                  </div>

                  <div className="pic">
                    <span className="pic-avatar">
                      {item.initials}
                    </span>

                    <span>
                      {item.pic}
                    </span>
                  </div>

                  <div>
                    <StatusBadge
                      status={item.status}
                    />
                  </div>

                </div>
              ))}

            </div>
          </div>

        </section>
      </main>
    </div>
  );
}