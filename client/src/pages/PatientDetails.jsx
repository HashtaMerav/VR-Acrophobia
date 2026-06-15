import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API_BASE_URL from "../api";
import "./PatientDetails.css";

function PatientDetails() {
  const { id } = useParams();
  const [sessionId, setSessionId] = useState(null);
  const [patient, setPatient] = useState(null);
  const [logs, setLogs] = useState([]);
  const [decision, setDecision] = useState("");
  const [therapistDecision, setTherapistDecision] = useState("");
  const [stressLevel, setStressLevel] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [startMessage, setStartMessage] = useState("");
  const [startingSession, setStartingSession] = useState(false);

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
        setDecision(data.system_recommendation);
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

  const saveTherapistDecision = (decisionValue) => {
    if (!sessionId) return;
  
    fetch(`${API_BASE_URL}/sessions/${sessionId}/therapist-decision`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        therapist_decision: decisionValue,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setTherapistDecision(data.therapist_decision);
      })
      .catch((error) => {
        console.error("Error saving therapist decision:", error);
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
          setLogs([]);
          setAnalysis(null);
          setDecision("");
          setStressLevel("");
          setTherapistDecision("");
  
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

  const loadSessionResults = () => {
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
      });
  
    fetch(`${API_BASE_URL}/sessions/${sessionId}/analysis`)
      .then((res) => res.json())
      .then((data) => {
        setAnalysis(data);
        setDecision(data.system_recommendation || "");
        setStressLevel(data.stress_level || "");
      });
  };

  return (
    <div className="patient-page">
      <div className="patient-card">
        <h1>Patient Details</h1>
        <div className="start-session-box">
            <button
              className="start-session-button"
              onClick={startSession}
              disabled={startingSession}
            >
              {startingSession ? "Starting..." : "Start Session"}
            </button>

            {startMessage && (
              <p className="start-session-message">{startMessage}</p>
            )}
        </div>
        {sessionId && logs.length === 0 && (
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

        <div className="patient-header">
          <div className="patient-info">
            <p><strong>Name:</strong> {patient.fullName}</p>
            <p><strong>Email:</strong> {patient.email}</p>
            <p><strong>Current Level:</strong> {patient.currentLevel}</p>
          </div>
        </div>

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
                      <td>{log.heartRate}</td>
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
                stroke="#6c63ff"
                strokeWidth="4"
                points={logs
                  .map((log, index) => {
                    const x = 40 + index * (420 / (logs.length - 1 || 1));
                    const y = 250 - ((log.heartRate - 80) * 3);
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />

              {logs.map((log, index) => {
                const x = 40 + index * (420 / (logs.length - 1 || 1));
                const y = 250 - ((log.heartRate - 80) * 3);

                return (
                  <g key={index}>
                    <circle cx={x} cy={y} r="5" fill="#6c63ff" />
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

        <div className="decision-box">
          {analysis && (
            <div>
              <p><strong>Baseline Heart Rate:</strong> {analysis.baseline_heart_rate}</p>
              <p><strong>Average Heart Rate:</strong> {analysis.average_heart_rate}</p>
              <p><strong>Max Heart Rate:</strong> {analysis.max_heart_rate}</p>
              <p><strong>Final Heart Rate:</strong> {analysis.final_heart_rate}</p>
            </div>
          )}
          <h2>System Decision</h2>
        
          <p style={{
            color:
            decision && decision.toLowerCase().includes("continue")
              ? "green"
              : "red",
          }}>
            {decision || "No recommendation yet"}
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

          <h2>Therapist Decision</h2>

          <div className="decision-buttons">
            <button onClick={() => saveTherapistDecision("Continue to next stage")}>
              Approve Continue
            </button>

            <button onClick={() => saveTherapistDecision("Stay at current stage")}>
              Change to Stay
            </button>
          </div>

          {therapistDecision && (
            <p>Final therapist decision: {therapistDecision}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatientDetails;