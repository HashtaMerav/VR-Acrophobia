import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../api";
import "./PatientDashboard.css";

function PatientDashboard() {
  const [patient, setPatient] = useState(null);
  const [systemDecision, setSystemDecision] = useState("");
  const [therapistRecommendation, setTherapistRecommendation] = useState("");
  const [stressLevel, setStressLevel] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [patientChoice, setPatientChoice] = useState("");
  const [serverMessage, setServerMessage] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const loadPatientData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) return;

        const patientRes = await fetch(`${API_BASE_URL}/patients/by-user/${user.id}`);
        const patientData = await patientRes.json();

        if (!patientRes.ok || !patientData.patient) return;

        const currentPatient = patientData.patient;
        setPatient(currentPatient);

        const latestSessionRes = await fetch(
          `${API_BASE_URL}/patients/${currentPatient.id}/latest-session`
        );

        const latestSessionData = await latestSessionRes.json();

        if (!latestSessionData.session_id) {
          setSystemDecision("No recommendation yet");
          setStressLevel("Unknown");
          setTherapistRecommendation("");
          return;
        }

        const newSessionId = latestSessionData.session_id;
        setSessionId(newSessionId);

        const analysisRes = await fetch(
          `${API_BASE_URL}/sessions/${newSessionId}/analysis`
        );

        const analysisData = await analysisRes.json();

        setAnalysis(analysisData);
        setSystemDecision(analysisData.system_recommendation || "No recommendation yet");
        setStressLevel(analysisData.stress_level || "Unknown");

        const sessionsRes = await fetch(
          `${API_BASE_URL}/patients/${currentPatient.id}/sessions`
        );

        const sessionsData = await sessionsRes.json();

        const currentSession = sessionsData.sessions?.find(
          (session) => session.id === newSessionId
        );

        setTherapistRecommendation(
          currentSession?.therapistRecommendation ||
          currentSession?.therapist_recommendation ||
          ""
        );
      } catch (error) {
        console.error("Error loading patient dashboard:", error);
      }
    };

    loadPatientData();
  }, []);

  const savePatientChoice = async (choice) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sessions/${sessionId}/patient-choice`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patient_choice: choice }),
        }
      );
  
      const data = await response.json();
      setPatientChoice(choice);
      setServerMessage(
        "✓ Choice recorded: " + choice + ". Waiting for your therapist to start your next session."
      );
    } catch (error) {
      console.error("Error saving patient choice:", error);
      setServerMessage("Something went wrong. Please try again.");
    }
  };

  const getStressClass = () => {
    const value = (stressLevel || "").toLowerCase();

    if (value.includes("low")) return "status-success";
    if (value.includes("medium")) return "status-warning";
    if (value.includes("high")) return "status-danger";

    return "status-warning";
  };

  const getRecommendationClass = () => {
    const value = (systemDecision || "").toLowerCase();

    if (value.includes("continue")) return "status-success";
    if (value.includes("stay")) return "status-warning";

    return "status-warning";
  };

  return (
    <div className="patient-dashboard-page">
      <div className="patient-dashboard-container">
      <div className="patient-dashboard-header">
        <div>
          <h1>Patient Dashboard</h1>
          <p>
            Welcome back, {patient?.fullName || "patient"}.
            Latest VR therapy session summary.
          </p>
        </div>

        <div className="header-actions">
          <div className="patient-avatar-wrapper">
            <button className="patient-avatar" type="button">
              👤
            </button>

            <div className="patient-popup">
              <h3>Patient Details</h3>

              <p>
                <span>Name</span>
                <strong>{patient?.fullName || "Loading..."}</strong>
              </p>

              <p>
                <span>Email</span>
                <strong>{patient?.email || "Loading..."}</strong>
              </p>

              <p>
                <span>Current Level</span>
                <strong>{patient?.currentLevel ?? "Loading..."}</strong>
              </p>
            </div>
          </div>


          {patient?.id && (
              <button
                className="history-nav-btn"
                onClick={() => navigate(`/history/patient/${patient.id}`)}
              >
                📋 Session History
              </button>
            )}

          <div className="session-pill">Session #{sessionId || "—"}</div>
        </div>
      </div>

        <div className="dashboard-stats-grid">
          <div className="dashboard-stat-card">
            <span>Current Level</span>
            <strong>{patient?.currentLevel ?? "—"}</strong>
          </div>

          <div className="dashboard-stat-card">
            <span>Stress Level</span>
            <strong className={getStressClass()}>{stressLevel || "Unknown"}</strong>
          </div>

          <div className="dashboard-stat-card">
            <span>Average HR</span>
            <strong>
              {analysis?.average_heart_rate ?? "—"} <small>BPM</small>
            </strong>
          </div>

          <div className="dashboard-stat-card">
            <span>Max HR</span>
            <strong>
              {analysis?.max_heart_rate ?? "—"} <small>BPM</small>
            </strong>
          </div>

          <div className="dashboard-stat-card">
            <span>Final HR</span>
            <strong>
              {analysis?.final_heart_rate ?? "—"} <small>BPM</small>
            </strong>
          </div>
        </div>

        <div className="dashboard-main-grid">

          <div className="dashboard-panel decision-panel">
            <h2>Decision Support</h2>

            <div className="recommendation-item">
              <span>System Recommendation</span>
              <strong className={`status-badge ${getRecommendationClass()}`}>
                {systemDecision || "No recommendation yet"}
              </strong>
            </div>

            <div className="recommendation-item">
              <span>Therapist Recommendation</span>
              <strong className="status-badge status-warning">
                {therapistRecommendation || "Not set yet"}
              </strong>
            </div>

            <div className="next-step-inside">
              <h3>Your Next Step</h3>

              <div className="patient-choice-buttons">
                {patient?.currentLevel < 4 ? (
                  <button
                    className={
                      systemDecision.toLowerCase().includes("continue")
                        ? "recommended-btn"
                        : "secondary-btn"
                    }
                    onClick={() => savePatientChoice("Continue to next stage")}
                    disabled={!!patientChoice}

                  >
                    Continue
                  </button>
                ) : systemDecision.toLowerCase().includes("continue") ? (
                  <button className="secondary-btn" disabled>
                    All stages completed
                  </button>
                ) : (
                  <button className="secondary-btn" disabled>
                    Stay at final stage
                  </button>
                )}

                <button
                  className={
                    systemDecision.toLowerCase().includes("stay")
                      ? "recommended-btn"
                      : "secondary-btn"
                  }
                  onClick={() => savePatientChoice("Repeat current stage")}
                  disabled={!!patientChoice}
                >
                  Repeat Stage
                </button>
              </div>
              {patient?.currentLevel >= 4 &&
                systemDecision.toLowerCase().includes("continue") && (
                  <p className="completion-message">
                     Congratulations! You have successfully completed all four VR exposure stages.
                  </p>
              )}
            </div>
          </div>
        </div>

        {serverMessage ? (
          <p className="patient-choice-message">{serverMessage}</p>
        ) : patientChoice ? (
          <p className="patient-choice-message">Your choice: {patientChoice}</p>
        ) : null}
      </div>
    </div>
  );
}

export default PatientDashboard;