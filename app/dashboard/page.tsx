"use client";

type Employee = {
  id: number;
  initial: string;
  name: string;
  email: string;
  role: string;
};

const employees: Employee[] = [
  { id: 1, initial: "J", name: "Jovan Juan", email: "JovanJJ@gmail.com", role: "HRMS" },
  { id: 2, initial: "H", name: "Hendro Saputra", email: "HendroSapt67@gmail.com", role: "HRMS" },
  { id: 3, initial: "A", name: "Ahmad Syahreza", email: "RezaAhmad@gmail.com", role: "HRMS" },
  { id: 4, initial: "K", name: "Kresna Made", email: "Made12Kresna@gmail.com", role: "HRMS" },
  { id: 5, initial: "G", name: "Genaro Arya", email: "Genaro16@gmail.com", role: "HRMS" },
  { id: 6, initial: "D", name: "Dimas Wibowo", email: "DimasWibo45@gmail.com", role: "HRMS" },
];

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: "18px", height: "18px", display: "block", color: "#475569", fill: "currentColor" }}>
      <path d="M4.5 16.9V20h3.1L18.7 8.9l-3.1-3.1L4.5 16.9Z" fill="currentColor" />
      <path d="M14.5 7.7l3.1 3.1" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function DisableIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: "18px", height: "18px", display: "block", color: "#475569", fill: "currentColor" }}>
      <path d="M8.2 8.3a3.2 3.2 0 1 1 6.4 0 3.2 3.2 0 0 1-6.4 0Z" fill="currentColor" />
      <path d="M5.7 19.2c.4-3.1 2.3-5 5.7-5s5.3 1.9 5.7 5" fill="currentColor" />
      <path d="M5 5l14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function SmkiPage() {
  return (
          <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)", overflow: "hidden", width: "100%" }}>

            {/* TABLE HEADER */}
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr 0.8fr", alignItems: "center", padding: "14px 20px", background: "#f1f5f9", color: "#475569", fontSize: "11px", fontWeight: 800, letterSpacing: "0.5px", boxSizing: "border-box" }}>
              <div>EMPLOYEE&apos;S NAME</div>
              <div>E-MAIL</div>
              <div>ROLE / DIVISI</div>
              <div style={{ textAlign: "center" }}>ACTION</div>
            </div>

            {/* TABLE ROWS */}
            {employees.map((employee) => (
              <div
                key={employee.id}
                style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr 0.8fr", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #f1f5f9", fontSize: "13px", color: "#1e293b", boxSizing: "border-box" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", fontWeight: 700 }}>
                  <span style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#e2e8f0", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0 }}>
                    {employee.initial}
                  </span>
                  <span>{employee.name}</span>
                </div>

                <div style={{ color: "#64748b" }}>
                  {employee.email}
                </div>

                <div style={{ fontWeight: 600, color: "#334155" }}>
                  {employee.role}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }}>
                  <button style={{ border: 0, background: "transparent", cursor: "pointer", padding: 0 }}>
                    <EditIcon />
                  </button>

                  <button style={{ border: 0, background: "transparent", cursor: "pointer", padding: 0 }}>
                    <DisableIcon />
                  </button>
                </div>
              </div>
            ))}

          </div>
  );
}
