"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

const activities = [
  { id: 1, email: "Praba@gmail.com", person: "Praba", feature: "Issue board ccr/payment", date: "Sep 29, 2026 16:00 Pm", timestamp: "2026-09-29T16:00:00+07:00" },
  { id: 2, email: "Agussanjaya@gmail.com", person: "Agus", feature: "Transaksi", date: "Sep 30, 2026 19:00 Pm", timestamp: "2026-09-30T19:00:00+07:00" },
];

const cellStyle: CSSProperties = { padding: "14px 20px", textAlign: "left", borderBottom: "1px solid #f1f5f9" };

export default function LogActivityPage() {
  const [ascending, setAscending] = useState(true);
  const sortedActivities = [...activities].sort((a, b) =>
    (Date.parse(a.timestamp) - Date.parse(b.timestamp)) * (ascending ? 1 : -1)
  );

  return (
    <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)", overflowX: "auto", width: "100%" }}>
      <table aria-label="Log Activity" style={{ width: "100%", minWidth: "680px", borderCollapse: "collapse", fontSize: "13px", color: "#1e293b" }}>
        <thead style={{ background: "#f1f5f9", color: "#475569", fontSize: "11px", fontWeight: 800, letterSpacing: "0.5px" }}>
          <tr>
            <th scope="col" style={cellStyle}>EMAIL</th>
            <th scope="col" style={cellStyle}>PEOPLE</th>
            <th scope="col" style={cellStyle}>FEATURE</th>
            <th scope="col" style={cellStyle} aria-sort={ascending ? "ascending" : "descending"}>
              <button type="button" onClick={() => setAscending(!ascending)} aria-label={ascending ? "Sort date newest first" : "Sort date oldest first"} style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "transparent", border: 0, padding: 0, color: "inherit", font: "inherit", letterSpacing: "inherit", cursor: "pointer" }}>
                DATE
                <svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ transform: ascending ? undefined : "rotate(180deg)" }}>
                  <path d="M6 4v12m-3-3 3 3 3-3M11 5h6m-6 4h4m-4 4h2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedActivities.map((activity) => (
            <tr key={activity.id}>
              <td style={{ ...cellStyle, color: "#64748b" }}>{activity.email}</td>
              <td style={{ ...cellStyle, fontWeight: 700 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                    <circle cx="10" cy="6" r="3" />
                    <path d="M3 17a7 7 0 0 1 14 0H3Z" />
                  </svg>
                  {activity.person}
                </span>
              </td>
              <td style={{ ...cellStyle, fontWeight: 600, color: "#334155" }}>
                {activity.id === 1 ? <>Issue board<br />ccr/payment</> : activity.feature}
              </td>
              <td style={{ ...cellStyle, whiteSpace: "nowrap" }}><time dateTime={activity.timestamp}>{activity.date}</time></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
