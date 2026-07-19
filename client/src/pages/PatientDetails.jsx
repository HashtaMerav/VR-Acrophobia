import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API_BASE_URL from "../api";
import "./PatientDetails.css";

function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [sessionId, setSessionId] = useState(null);
  const [patient, setPatient] = useState(null);
  const [logs, setLogs] = useState([]);
  const [recommendation, setRecommendation] = useState("");
  const [therapistRecommendation, setTherapistRecommendation] = useState("");
  const [stressLevel, setStressLevel] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [startMessage, setStartMessage] = useState("");
  const [startingSession, setStartingSession] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/patients/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setPatient(data.patient);
      })
      .catch((error) => {
        console.error("Error loading patient:", error);
      });
    fetch(`${API_BASE_URL}/patients/${id}/latest-session`)
      .then((res) => res.json())
      .then((data) => {
        setSessionId(data.session_id);
      })
      .catch((error) => {
        console.error("Error loading latest session:", error);
      });
  }, [id]);

  useEffect(() => {
    if (!sessionId) return;

    fetch(`${API_BASE_URL}/sessions/${sessionId}/combined-by-time`)
      .then((res) => res.json())
      .then((data) => {
        const formattedLogs = data.combined_data.map((item) => ({
          id: item.event_id,
          time: item.unity_time,
          action: item.unity_action,
          heartRate: item.heart_rate,
        }));

        setLogs(formattedLogs);
      })
      .catch((error) => {
        console.error("Error loading combined session:", error);
      });

    fetch(`${API_BASE_URL}/sessions/${sessionId}/analysis`)
      .then((res) => res.json())
      .then((data) => {
        setAnalysis(data);
        setRecommendation(data.system_recommendation);
        setStressLevel(data.stress_level);
      })
      .catch((error) => {
        console.error("Error loading session analysis:", error);
      });
  }, [sessionId]);

  if (!patient) {
    return (
      <div className="patient-page">
        <div className="patient-card">
          <h1>Loading patient...</h1>
        </div>
      </div>
    );
  }

  const chartLogs = logs.filter(
    (log) =>
      log.heartRate !== null &&
      log.heartRate !== undefined &&
      !Number.isNaN(Number(log.heartRate)) &&
      Number(log.heartRate) > 0
  );

  const heartRates = chartLogs.map((log) => Number(log.heartRate));

  const minHR =
    heartRates.length > 0 ? Math.min(...heartRates) - 5 : 0;

  const maxHR =
    heartRates.length > 0 ? Math.max(...heartRates) + 5 : 1;

  const heartRateRange = maxHR - minHR || 1;

  const saveTherapistRecommendation = (recommendationValue) => {
    if (!sessionId) return;

    fetch(`${API_BASE_URL}/sessions/${sessionId}/therapist-recommendation`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        therapist_recommendation: recommendationValue,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setTherapistRecommendation(data.therapist_recommendation);
      })
      .catch((error) => {
        console.error("Error saving therapist recommendation:", error);
      });
  };

  const startSession = () => {
    setStartingSession(true);
    setStartMessage("");

    fetch(`${API_BASE_URL}/patients/${id}/start-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vr_level: patient.currentLevel || 1,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.session_id) {
          setSessionId(data.session_id);
          setSessionActive(true);
          setLogs([]);
          setAnalysis(null);
          setRecommendation("");
          setStressLevel("");
          setTherapistRecommendation("");

          setStartMessage(
            `Session ${data.session_id} started successfully. You can now start the VR stage.`
          );
        } else {
          setStartMessage(data.message || "Failed to start session");
        }
      })
      .catch((error) => {
        console.error("Error starting session:", error);
        setStartMessage("Error starting session");
      })
      .finally(() => {
        setStartingSession(false);
      });
  };

  const endSession = () => {
    if (!sessionId) {
      setStartMessage("No active session to end");
      return;
    }

    fetch(`${API_BASE_URL}/sessions/${sessionId}/end-session`, {
      method: "PUT",
    })
      .then((res) => res.json())
      .then((data) => {
        setStartMessage(data.message || "Session ended");
        setSessionActive(false);
        setLogs([]);
        setAnalysis(null);
        setRecommendation("");
        setStressLevel("");
        setTherapistRecommendation("");
      })
      .catch((error) => {
        console.error("Error ending session:", error);
        setStartMessage("Error ending session");
      });
  };

  const loadSessionResults = () => {
    if (!sessionId) return;

    fetch(`${API_BASE_URL}/sessions/${sessionId}/combined-by-time`)
      .then((res) => res.json())
      .then((data) => {
        const formattedLogs = data.combined_data.map((item) => {
          const hr = Number(item.heart_rate);

          return {
            id: item.event_id,
            time: item.unity_time,
            action: item.unity_action,
            heartRate:
              item.heart_rate === null ||
              item.heart_rate === undefined ||
              Number.isNaN(hr) ||
              hr <= 0
                ? null
                : hr,
          };
        });

        setLogs(formattedLogs);
      });

    fetch(`${API_BASE_URL}/sessions/${sessionId}/analysis`)
      .then((res) => res.json())
      .then((data) => {
        setAnalysis(data);
        setRecommendation(data.system_recommendation || "");
        setStressLevel(data.stress_level || "");
      });
  };

  return (
    <div className="patient-page">
      <div className="patient-card">
        <div className="patient-header">
          <div className="patient-info">
            <p><strong>Name:</strong> {patient.fullName}</p>
            <p><strong>Email:</strong> {patient.email}</p>
            <p><strong>Current Level:</strong> {patient.currentLevel}</p>
          </div>
        </div>

        <div className="patient-history-btn-wrap">
          <button
            className="history-nav-btn"
            onClick={() => navigate(`/history/therapist/${id}`)}
          >
            📋 Session History
          </button>
        </div>

        <div className="start-session-box">
          <button
            className="start-session-button"
            onClick={startSession}
            disabled={startingSession}
          >
            {startingSession ? "Starting..." : "Start Session"}
          </button>

          {sessionId && (
            <button
              className="end-session-button"
              onClick={endSession}
            >
              End Session
            </button>
          )}

          {startMessage && (
            <p className="start-session-message">{startMessage}</p>
          )}
        </div>

        {sessionActive && logs.length === 0 && (
          <div className="vr-waiting-box">
            <div className="vr-card-icon">
              <div className="vr-headset">
                <div className="vr-screen">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="vr-strap"></div>
              </div>

              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>

            <h3>Waiting for VR session to complete</h3>
            <p>The patient is currently performing the VR stage.</p>
          </div>
        )}

        {sessionId && (
          <button
            className="view-results-button"
            onClick={loadSessionResults}
          >
            View Session Results
          </button>
        )}

        <h2>Session Activity</h2>

        <div className="session-section">
          <div className="table-wrapper">
            <table className="sessions-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Heart Rate</th>
                </tr>
              </thead>

              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="3">No session data yet</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id || log.time}>
                      <td>{log.time}</td>
                      <td>{log.action}</td>
                      <td>{log.heartRate ?? "No data"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="chart-wrapper">
            <h3>Heart Rate Over Time</h3>

            <svg width="100%" height="300" viewBox="0 0 500 300">
              <polyline
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="4"
                points={chartLogs
                  .map((log, index) => {
                    const x =
                      40 + index * (420 / (chartLogs.length - 1 || 1));

                    const y =
                      250 -
                      ((Number(log.heartRate) - minHR) / heartRateRange) * 220;

                    return `${x},${y}`;
                  })
                  .join(" ")}
              />

              {chartLogs.map((log, index) => {
                const x =
                  40 + index * (420 / (chartLogs.length - 1 || 1));

                const y =
                  250 -
                  ((Number(log.heartRate) - minHR) / heartRateRange) * 220;

                return (
                  <g key={log.id || `${log.time}-${index}`}>
                    <circle cx={x} cy={y} r="5" fill="#1d4ed8" />

                    {index % 5 === 0 && (
                      <text x={x - 10} y={y - 10} fontSize="12">
                        {log.heartRate}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="recommendation-box">
          {analysis && (
            <div>
              <p><strong>Baseline Heart Rate:</strong> {analysis.baseline_heart_rate}</p>
              <p><strong>Average Heart Rate:</strong> {analysis.average_heart_rate}</p>
              <p><strong>Max Heart Rate:</strong> {analysis.max_heart_rate}</p>
              <p><strong>Final Heart Rate:</strong> {analysis.final_heart_rate}</p>
            </div>
          )}
          <h2>System Recommendation</h2>

          <p style={{
            color:
            recommendation && recommendation.toLowerCase().includes("continue")
                ? "green"
                : "red",
          }}>
            {recommendation || "No recommendation yet"}
          </p>

          <h2>Stress Level</h2>
          <p style={{
            color:
              stressLevel === "Low" ? "green" :
              stressLevel === "Medium" ? "orange" :
              "red",
            fontWeight: "bold"
          }}>
            {stressLevel}
          </p>

          <h2>Therapist Recommendation</h2>

          <div className="recommendation-buttons">
            <button
              className="blue-btn"
              onClick={() => saveTherapistRecommendation("Continue to next level")}
            >
              Continue to next level
            </button>

            <button
              className="blue-btn"
              onClick={() => saveTherapistRecommendation("Stay in current level")}
            >
              Stay in current level
            </button>
          </div>

          {therapistRecommendation && (
            <p>Therapist Recommendation: {therapistRecommendation}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatientDetails;