import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API_BASE_URL from "../api";
import "./SessionHistory.css";

function stressColor(level) {
  if (!level) return "#94a3b8";
  const l = level.toLowerCase();
  if (l === "low")    return "#22c55e";
  if (l === "medium") return "#f59e0b";
  if (l === "high")   return "#ef4444";
  return "#94a3b8";
}

function recommendationColor(rec) {
  if (!rec) return "#94a3b8";
  return rec.toLowerCase().includes("continue") ? "#22c55e" : "#f59e0b";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function HRSparkline({ sessions }) {
  const points = sessions
    .filter((s) => s.avg_hr != null)
    .map((s, i) => ({ x: i, y: s.avg_hr }));

  if (points.length < 2) return <span className="sh-no-data">Not enough data</span>;

  const ys   = points.map((p) => p.y);
  const minY = Math.min(...ys) - 5;
  const maxY = Math.max(...ys) + 5;
  const W = 260, H = 60, PAD = 8;

  const toSVG = (x, y) => [
    PAD + (x / (points.length - 1)) * (W - PAD * 2),
    H - PAD - ((y - minY) / (maxY - minY)) * (H - PAD * 2),
  ];

  const polyPts = points.map((p) => toSVG(p.x, p.y).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="sh-sparkline">
      <polyline
        points={polyPts}
        fill="none"
        stroke="#1d4ed8"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => {
        const [cx, cy] = toSVG(p.x, p.y);
        return <circle key={i} cx={cx} cy={cy} r="3.5" fill="#1d4ed8" />;
      })}
    </svg>
  );
}

export default function SessionHistory() {
  // Read patientId and role directly from the URL - no props needed
  const { patientId, role } = useParams();
  const navigate = useNavigate();

  const viewerRole = role === "patient" ? "patient" : "therapist";

  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [filter,   setFilter]   = useState("all");

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE_URL}/patients/${patientId}/sessions-history`)
      .then((r) => r.json())
      .then((data) => {
        setHistory(data.history || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load session history.");
        setLoading(false);
      });
  }, [patientId]);

  const filtered = history.filter((s) =>
    filter === "all" ? true : (s.stress_level || "").toLowerCase() === filter
  );

  return (
    <div className="sh-page">
      <div className="sh-page-card">

        <div className="sh-page-header">
          <button className="sh-back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1 className="sh-page-title">Session History</h1>
        </div>

        {loading && <div className="sh-loading">Loading history…</div>}
        {error   && <div className="sh-error">{error}</div>}
        {!loading && !error && !history.length && (
          <div className="sh-empty">No past sessions yet. Sessions will appear here after completion.</div>
        )}

        {!loading && !error && history.length > 0 && (
          <div className="sh-container">
            <div className="sh-header">
              {history.filter((s) => s.avg_hr != null).length >= 2 && (
                <div className="sh-trend">
                  <span className="sh-trend-label">Avg HR trend</span>
                  <HRSparkline sessions={[...history].reverse()} />
                </div>
              )}

              <div className="sh-filters">
                {["all", "low", "high"].map((f) => (
                  <button
                    key={f}
                    className={`sh-filter-btn ${filter === f ? "sh-filter-active" : ""}`}
                    onClick={() => setFilter(f)}
                  >
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1) + " stress"}
                  </button>
                ))}
              </div>
            </div>

            <div className="sh-table-wrap">
              <table className="sh-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>VR Level</th>
                    <th>Stress</th>
                    <th>Avg HR</th>
                    <th>System Rec.</th>
                    {viewerRole === "therapist" && <th>Therapist</th>}
                    <th>Patient</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, idx) => (
                    <>
                      <tr
                        key={s.session_id}
                        className={`sh-row ${expanded === s.session_id ? "sh-row-open" : ""}`}
                        onClick={() =>
                          setExpanded(expanded === s.session_id ? null : s.session_id)
                        }
                      >
                        <td className="sh-index">{filtered.length - idx}</td>
                        <td>{formatDate(s.session_date)}</td>
                        <td>
                          <span className="sh-level-badge">Level {s.vr_level ?? "—"}</span>
                        </td>
                        <td>
                          {s.stress_level ? (
                            <span className="sh-stress-dot" style={{ color: stressColor(s.stress_level) }}>
                              ● {s.stress_level}
                            </span>
                          ) : (
                            <span className="sh-no-data">—</span>
                          )}
                        </td>
                        <td>
                          {s.avg_hr != null
                            ? `${s.avg_hr} bpm`
                            : <span className="sh-no-data">—</span>}
                        </td>
                        <td>
                          {s.system_recommendation ? (
                            <span className="sh-rec-badge" style={{ color: recommendationColor(s.system_recommendation) }}>
                              {s.system_recommendation}
                            </span>
                          ) : (
                            <span className="sh-no-data">—</span>
                          )}
                        </td>
                        {viewerRole === "therapist" && (
                          <td>
                            {s.therapist_decision
                              ? <span className="sh-decision">{s.therapist_decision}</span>
                              : <span className="sh-no-data">Not set</span>}
                          </td>
                        )}
                        <td>
                          {s.patient_choice
                            ? <span className="sh-decision">{s.patient_choice}</span>
                            : <span className="sh-no-data">—</span>}
                        </td>
                        <td className="sh-expand-col">
                          <span className="sh-expand-icon">
                            {expanded === s.session_id ? "▲" : "▼"}
                          </span>
                        </td>
                      </tr>

                      {expanded === s.session_id && (
                        <tr className="sh-detail-row" key={`detail-${s.session_id}`}>
                          <td colSpan={viewerRole === "therapist" ? 9 : 8}>
                            <div className="sh-detail">
                              <div className="sh-detail-grid">
                                <div className="sh-detail-item">
                                  <span>Session ID</span>
                                  <strong>#{s.session_id}</strong>
                                </div>
                                <div className="sh-detail-item">
                                  <span>Status</span>
                                  <strong className={`sh-status-${s.status}`}>{s.status ?? "—"}</strong>
                                </div>
                                <div className="sh-detail-item">
                                  <span>Max HR</span>
                                  <strong>{s.max_hr != null ? `${s.max_hr} bpm` : "—"}</strong>
                                </div>
                                <div className="sh-detail-item">
                                  <span>Final HR</span>
                                  <strong>{s.final_hr != null ? `${s.final_hr} bpm` : "—"}</strong>
                                </div>
                                <div className="sh-detail-item">
                                  <span>Start</span>
                                  <strong>{s.start_time ? new Date(s.start_time).toLocaleTimeString() : "—"}</strong>
                                </div>
                                <div className="sh-detail-item">
                                  <span>End</span>
                                  <strong>{s.end_time ? new Date(s.end_time).toLocaleTimeString() : "—"}</strong>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="sh-count">{filtered.length} session{filtered.length !== 1 ? "s" : ""} shown</p>
          </div>
        )}

      </div>
    </div>
  );
}