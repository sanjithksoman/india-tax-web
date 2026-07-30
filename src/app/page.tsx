"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";

/* ─── Types ─────────────────────────────────────────────── */
interface Trip {
  id: number;
  arrivalDate: string;
  departureDate: string;
  daysInIndia: number;
  financialYear: string;
  notes?: string;
  member: { name: string };
}

interface DashboardData {
  currentFY: string;
  lastFY: string;
  preceding4FYs: string[];
  currentFYDays: Record<string, number>;
  lastFYDays: Record<string, number>;
  preceding4Total: Record<string, number>;
  allFYs: string[];
  fullAgg: Record<string, Record<string, number>>;
}

const MEMBERS = ["SANJITH", "NISHA", "NEHA", "NETRA"];
const MEMBER_COLORS: Record<string, string> = {
  SANJITH: "gold",
  NISHA: "blue",
  NEHA: "green",
  NETRA: "purple",
};

/* ─── Toast Helper ──────────────────────────────────────── */
function useToast() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: string }[]>([]);

  const addToast = useCallback((msg: string, type = "success") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3500);
  }, []);

  return { toasts, addToast };
}

/* ─── Utility ───────────────────────────────────────────── */
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fyShort(fy: string) {
  const [a, b] = fy.split("-");
  return `${a.slice(2)}-${b.slice(2)}`;
}

/* ─── Main Page ─────────────────────────────────────────── */
export default function Dashboard() {
  const { data: session } = useSession();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [summaryText, setSummaryText] = useState("");
  const [loadingDash, setLoadingDash] = useState(true);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toasts, addToast } = useToast();

  // Form state
  const [form, setForm] = useState({
    memberName: "SANJITH",
    arrivalDate: "",
    departureDate: "",
    notes: "",
  });

  /* ─── Fetch Dashboard ─── */
  const fetchDashboard = useCallback(async () => {
    try {
      setLoadingDash(true);
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setDashboard(data);
    } catch {
      addToast("Failed to load dashboard", "error");
    } finally {
      setLoadingDash(false);
    }
  }, [addToast]);

  /* ─── Fetch Trips ─── */
  const fetchTrips = useCallback(async () => {
    try {
      setLoadingTrips(true);
      const res = await fetch("/api/trips");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setTrips(data.trips);
    } catch {
      addToast("Failed to load trips", "error");
    } finally {
      setLoadingTrips(false);
    }
  }, [addToast]);

  /* ─── Fetch Summary ─── */
  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/summary");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setSummaryText(data.text);
    } catch {
      addToast("Failed to load summary", "error");
    }
  }, [addToast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (activeSection === "trips") fetchTrips();
    if (activeSection === "summary") fetchSummary();
  }, [activeSection, fetchTrips, fetchSummary]);

  /* ─── Add Trip ─── */
  const handleAddTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.arrivalDate || !form.departureDate) {
      addToast("Please fill in all dates", "error");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      const data = await res.json();
      const tripCount = data.trips.length;
      addToast(
        tripCount > 1
          ? `✓ Trip added (split across ${tripCount} financial years)`
          : `✓ Trip added for ${form.memberName}`,
        "success"
      );
      setForm((f) => ({ ...f, arrivalDate: "", departureDate: "", notes: "" }));
      fetchDashboard();
      if (activeSection === "trips") fetchTrips();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Failed to add trip", "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Delete Trip ─── */
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this trip?")) return;
    try {
      const res = await fetch(`/api/trips/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setTrips((t) => t.filter((x) => x.id !== id));
      addToast("Trip deleted", "info");
      fetchDashboard();
    } catch {
      addToast("Failed to delete trip", "error");
    }
  };

  /* ─── Export Excel ─── */
  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `India_Travel_Dates_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      addToast("✓ Excel file downloaded", "success");
    } catch {
      addToast("Failed to export", "error");
    } finally {
      setExporting(false);
    }
  };

  /* ─── Copy Summary ─── */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      addToast("✓ Summary copied to clipboard", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast("Failed to copy", "error");
    }
  };

  const navItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "add-trip", icon: "✈️", label: "Add Trip" },
    { id: "trips", icon: "🗓️", label: "Trip History" },
    { id: "summary", icon: "📋", label: "Tax Summary" },
  ];

  /* ─── Render ─────────────────────────────────────────── */
  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">🇮🇳</span>
          <h1>India Travel</h1>
          <p>Tax Tracker</p>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeSection === item.id ? "active" : ""}`}
              onClick={() => setActiveSection(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Signed in as</div>
            <div style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600 }}>{session?.user?.email || "Authorised User"}</div>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
            Indian Financial Year<br />
            April 1 – March 31
          </div>
          <button
            className="btn btn-danger"
            style={{ width: "100%", justifyContent: "center", border: "1px solid rgba(239,83,80,0.3)" }}
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        <header className="page-header">
          <h2>
            {navItems.find((n) => n.id === activeSection)?.icon}{" "}
            {navItems.find((n) => n.id === activeSection)?.label}
          </h2>
          {dashboard && (
            <div className="header-fy-badge">
              🗓 Current FY: {fyShort(dashboard.currentFY)}
            </div>
          )}
        </header>

        <div className="page-body">

          {/* ══════════════════════════════════════════
               SECTION: Dashboard
          ══════════════════════════════════════════ */}
          <div className={`section ${activeSection === "dashboard" ? "active" : ""}`}>
            {loadingDash ? (
              <div className="empty-state">
                <span className="loader" style={{ width: 32, height: 32 }} />
                <p style={{ marginTop: 16 }}>Loading dashboard…</p>
              </div>
            ) : dashboard ? (
              <>
                {/* Current FY */}
                <div className="glass-panel">
                  <h3><span className="panel-icon">🟡</span> Current Financial Year — {dashboard.currentFY}</h3>
                  <div className="metrics-grid">
                    {MEMBERS.map((m) => (
                      <div key={m} className={`metric-card ${MEMBER_COLORS[m]}`}>
                        <div className="card-label">{m}</div>
                        <div className="member-days-list">
                          <div className="member-day-row">
                            <span className="member-name">Days in India</span>
                            <span className="days-value">{dashboard.currentFYDays[m] ?? 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Last FY */}
                <div className="glass-panel">
                  <h3><span className="panel-icon">📅</span> Last Financial Year — {dashboard.lastFY}</h3>
                  <div className="metrics-grid">
                    {MEMBERS.map((m) => (
                      <div key={m} className={`metric-card ${MEMBER_COLORS[m]}`}>
                        <div className="card-label">{m}</div>
                        <div className="member-days-list">
                          <div className="member-day-row">
                            <span className="member-name">Days in India</span>
                            <span className="days-value">{dashboard.lastFYDays[m] ?? 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preceding 4 FYs */}
                <div className="glass-panel">
                  <h3>
                    <span className="panel-icon">📈</span>
                    Preceding 4 Financial Years Total
                    <span className="text-muted text-sm" style={{ fontWeight: 400 }}>
                      &nbsp;({dashboard.preceding4FYs.map(fyShort).join(", ")})
                    </span>
                  </h3>
                  <div className="metrics-grid">
                    {MEMBERS.map((m) => (
                      <div key={m} className={`metric-card ${MEMBER_COLORS[m]}`}>
                        <div className="card-label">{m}</div>
                        <div className="member-days-list">
                          <div className="member-day-row">
                            <span className="member-name">Total Days</span>
                            <span className="days-value">{dashboard.preceding4Total[m] ?? 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="glass-panel">
                  <h3><span className="panel-icon">⚡</span> Quick Actions</h3>
                  <div className="btn-actions">
                    <button className="btn btn-primary" onClick={() => setActiveSection("add-trip")}>
                      ✈️ Add New Trip
                    </button>
                    <button className="btn btn-secondary" onClick={handleExport} disabled={exporting}>
                      {exporting ? <span className="loader" /> : "📥"} Download Excel
                    </button>
                    <button
                      className="btn btn-green"
                      onClick={() => {
                        setActiveSection("summary");
                        setTimeout(fetchSummary, 100);
                      }}
                    >
                      📋 View Tax Summary
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">⚠️</span>
                <p>Could not load dashboard. Check database connection.</p>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════
               SECTION: Add Trip
          ══════════════════════════════════════════ */}
          <div className={`section ${activeSection === "add-trip" ? "active" : ""}`}>
            <div className="glass-panel">
              <h3><span className="panel-icon">✈️</span> Add New Trip</h3>
              <form onSubmit={handleAddTrip}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="memberName">Family Member</label>
                    <select
                      id="memberName"
                      value={form.memberName}
                      onChange={(e) => setForm((f) => ({ ...f, memberName: e.target.value }))}
                      required
                    >
                      {MEMBERS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="arrivalDate">Arrival Date</label>
                    <input
                      id="arrivalDate"
                      type="date"
                      value={form.arrivalDate}
                      onChange={(e) => setForm((f) => ({ ...f, arrivalDate: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="departureDate">Departure Date</label>
                    <input
                      id="departureDate"
                      type="date"
                      value={form.departureDate}
                      onChange={(e) => setForm((f) => ({ ...f, departureDate: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="notes">Notes (optional)</label>
                    <input
                      id="notes"
                      type="text"
                      placeholder="e.g. Summer vacation"
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <button className="btn btn-primary" type="submit" disabled={submitting}>
                    {submitting ? <><span className="loader" /> Adding…</> : "✈️ Add Trip"}
                  </button>
                </div>
              </form>

              <div className="text-muted" style={{ marginTop: 16, fontSize: 12 }}>
                💡 Trips that span April 1st will be automatically split between financial years.
                The day count uses <strong>arrival inclusive, departure exclusive</strong> (e.g., Aug 11 – Aug 27 = 16 days).
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════
               SECTION: Trip History
          ══════════════════════════════════════════ */}
          <div className={`section ${activeSection === "trips" ? "active" : ""}`}>
            <div className="glass-panel">
              <div className="flex justify-between items-center mb-4">
                <h3 style={{ marginBottom: 0 }}><span className="panel-icon">🗓️</span> Trip History</h3>
                <button className="btn btn-secondary" onClick={fetchTrips} disabled={loadingTrips}>
                  {loadingTrips ? <span className="loader" /> : "↻"} Refresh
                </button>
              </div>

              {loadingTrips ? (
                <div className="empty-state"><span className="loader" style={{ width: 28, height: 28 }} /></div>
              ) : trips.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">✈️</span>
                  <p>No trips recorded yet. Add your first trip!</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Arrival</th>
                        <th>Departure</th>
                        <th>Days</th>
                        <th>Financial Year</th>
                        <th>Notes</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {trips.map((trip) => (
                        <tr key={trip.id}>
                          <td>
                            <span className={`member-badge badge-${trip.member.name.toLowerCase()}`}>
                              {trip.member.name}
                            </span>
                          </td>
                          <td>{formatDate(trip.arrivalDate)}</td>
                          <td>{formatDate(trip.departureDate)}</td>
                          <td><span className="days-pill">{trip.daysInIndia}</span></td>
                          <td><span className="fy-tag">{fyShort(trip.financialYear)}</span></td>
                          <td className="text-muted">{trip.notes || "—"}</td>
                          <td>
                            <button
                              className="btn btn-danger"
                              onClick={() => handleDelete(trip.id)}
                            >
                              🗑 Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════
               SECTION: Tax Summary
          ══════════════════════════════════════════ */}
          <div className={`section ${activeSection === "summary" ? "active" : ""}`}>
            {/* Copy-paste text block */}
            <div className="glass-panel">
              <div className="flex justify-between items-center mb-4">
                <h3 style={{ marginBottom: 0 }}>
                  <span className="panel-icon">📋</span> SANJITH &amp; NISHA — Tax Summary
                </h3>
                <div className="btn-actions">
                  <button className="btn btn-secondary" onClick={fetchSummary}>
                    ↻ Refresh
                  </button>
                  <button className="btn btn-primary" onClick={handleCopy} disabled={!summaryText}>
                    {copied ? "✓ Copied!" : "📋 Copy to Clipboard"}
                  </button>
                  <button className="btn btn-green" onClick={handleExport} disabled={exporting}>
                    {exporting ? <span className="loader" /> : "📥"} Export Excel
                  </button>
                </div>
              </div>
              <div className="summary-box">
                {summaryText || "Loading summary…"}
              </div>
            </div>

            {/* Full breakdown by member */}
            {dashboard && (
              <div className="glass-panel">
                <h3><span className="panel-icon">📈</span> All-Time Breakdown by Member</h3>
                <div className="summary-members-grid">
                  {MEMBERS.map((m) => {
                    const fyMap = dashboard.fullAgg?.[m] ?? {};
                    const fys = dashboard.allFYs ?? [];
                    return (
                      <div key={m} className={`summary-member-card ${MEMBER_COLORS[m]}`}>
                        <h4>{m}</h4>
                        {fys.length === 0 ? (
                          <p className="text-muted text-sm">No data</p>
                        ) : (
                          fys.map((fy) => (
                            <div key={fy} className="fy-day-row">
                              <span className="fy-label">{fyShort(fy)}</span>
                              <span className="fy-days">{fyMap[fy] ?? 0}</span>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* ── Toast Container ── */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
