# Imports
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import get_db_connection
from datetime import datetime, date
import os

# FastAPI Application Setup and CORS Configuration
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Used to verify that the API server is running
@app.get("/")
def root():
    return {"message": "VR Acrophobia API is running"}

# Request Models
class RegisterUser(BaseModel):
    fullName: str
    email: str
    password: str
    role: str

class LoginUser(BaseModel):
    email: str
    password: str

class StartSessionRequest(BaseModel):
    vr_level: int = 1

class PatientChoiceRequest(BaseModel):
    patient_choice: str

class TherapistRecommendationRequest(BaseModel):
    therapist_recommendation: str

class ActivityLogRequest(BaseModel):
    unity_session_id: str | None = None
    log_text: str

class HeartRateRequest(BaseModel):
    session_id: int
    heartRate: int
    stress_level: int | None = None
    movement_level: int | None = None

# Authentication Endpoints
# Handles user registration and login
@app.post("/register")
def register(user: RegisterUser):
    conn = get_db_connection()
    cursor = conn.cursor()

    role = user.role.strip().lower()

    cursor.execute("SELECT id FROM users WHERE email = %s", (user.email,))
    existing_user = cursor.fetchone()

    if existing_user:
        cursor.close()
        conn.close()
        return {"message": "User already exists"}

    cursor.execute(
        """
        INSERT INTO users (full_name, email, password, role)
        VALUES (%s, %s, %s, %s)
        RETURNING id, full_name, email, role
        """,
        (user.fullName, user.email, user.password, role),
    )

    new_user = cursor.fetchone()
    user_id = new_user[0]

    print("ROLE RECEIVED:", role)
    print("USER ID:", user_id)

    if role == "patient":
        print("CREATING PATIENT")
        cursor.execute(
            """
            INSERT INTO patients (user_id, current_level)
            VALUES (%s, %s)
            """,
            (user_id, 1)
        )

    elif role == "therapist":
        print("CREATING THERAPIST")
        cursor.execute(
            """
            INSERT INTO therapists (user_id)
            VALUES (%s)
            """,
            (user_id,)
        )

    conn.commit()

    cursor.close()
    conn.close()

    return {
        "message": "User registered successfully",
        "user": {
            "id": new_user[0],
            "fullName": new_user[1],
            "email": new_user[2],
            "role": new_user[3],
        },
    }



@app.post("/login")
def login(user: LoginUser):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, full_name, email, role
        FROM users
        WHERE email = %s AND password = %s
        """,
        (user.email, user.password)
    )

    db_user = cursor.fetchone()

    cursor.close()
    conn.close()

    if db_user:
        return {
            "message": "Login successful",
            "user": {
                "id": db_user[0],
                "fullName": db_user[1],
                "email": db_user[2],
                "role": db_user[3],
            }
        }

    return {
        "message": "Invalid email or password"
    }

# Patient Endpoints
# Handles patient details, assigned patients, and unassigned patients
@app.get("/patients")
def get_patients():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT
            p.id,
            u.full_name,
            u.email,
            p.current_level
        FROM patients p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.id
        """
    )

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    patients_list = []

    for row in rows:
        patients_list.append({
            "id": row[0],
            "fullName": row[1],
            "email": row[2],
            "currentLevel": row[3],
        })

    return {"patients": patients_list}

@app.get("/patients/by-user/{user_id}")
def get_patient_by_user(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT
            p.id,
            u.full_name,
            u.email,
            p.current_level
        FROM patients p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = %s
        """,
        (user_id,)
    )

    row = cursor.fetchone()

    cursor.close()
    conn.close()

    if not row:
        return {"message": "Patient not found"}

    return {
        "patient": {
            "id": row[0],
            "fullName": row[1],
            "email": row[2],
            "currentLevel": row[3],
        }
    }

@app.get("/patients/unassigned")
def get_unassigned_patients():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT
            p.id,
            u.full_name,
            u.email,
            p.current_level
        FROM patients p
        JOIN users u ON p.user_id = u.id
        WHERE p.therapist_id IS NULL
        ORDER BY p.id
        """
    )

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    patients_list = []

    for row in rows:
        patients_list.append({
            "id": row[0],
            "fullName": row[1],
            "email": row[2],
            "currentLevel": row[3],
        })

    return {"patients": patients_list}

@app.get("/patients/{patient_id}")
def get_patient(patient_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT
            p.id,
            u.full_name,
            u.email,
            p.current_level
        FROM patients p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = %s
        """,
        (patient_id,)
    )

    row = cursor.fetchone()

    cursor.close()
    conn.close()

    if not row:
        return {"message": "Patient not found"}

    return {
        "patient": {
            "id": row[0],
            "fullName": row[1],
            "email": row[2],
            "currentLevel": row[3],
        }
    }

# Therapist Endpoints
# Handles assigning and removing patients from therapists
@app.get("/therapists/by-user/{user_id}/patients")
def get_patients_by_therapist_user(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id
        FROM therapists
        WHERE user_id = %s
        """,
        (user_id,)
    )

    therapist = cursor.fetchone()

    if not therapist:
        cursor.close()
        conn.close()
        return {"patients": []}

    therapist_id = therapist[0]

    cursor.execute(
        """
        SELECT
            p.id,
            u.full_name,
            u.email,
            p.current_level
        FROM patients p
        JOIN users u ON p.user_id = u.id
        WHERE p.therapist_id = %s
        ORDER BY p.id
        """,
        (therapist_id,)
    )

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    patients_list = []

    for row in rows:
        patients_list.append({
            "id": row[0],
            "fullName": row[1],
            "email": row[2],
            "currentLevel": row[3],
        })

    return {"patients": patients_list}

@app.post("/therapists/by-user/{user_id}/assign-patient/{patient_id}")
def assign_patient_to_therapist(user_id: int, patient_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id
        FROM therapists
        WHERE user_id = %s
        """,
        (user_id,)
    )

    therapist = cursor.fetchone()

    if not therapist:
        cursor.close()
        conn.close()
        return {"message": "Therapist not found"}

    therapist_id = therapist[0]

    cursor.execute(
        """
        UPDATE patients
        SET therapist_id = %s
        WHERE id = %s
        """,
        (therapist_id, patient_id)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return {
        "message": "Patient assigned successfully",
        "therapistId": therapist_id,
        "patientId": patient_id
    }

@app.post("/therapists/by-user/{user_id}/remove-patient/{patient_id}")
def remove_patient_from_therapist(user_id: int, patient_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id
        FROM therapists
        WHERE user_id = %s
        """,
        (user_id,)
    )

    therapist = cursor.fetchone()

    if not therapist:
        cursor.close()
        conn.close()
        return {"message": "Therapist not found"}

    therapist_id = therapist[0]

    cursor.execute(
        """
        UPDATE patients
        SET therapist_id = NULL
        WHERE id = %s AND therapist_id = %s
        """,
        (patient_id, therapist_id)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return {
        "message": "Patient removed successfully",
        "patientId": patient_id
    }

# Session Endpoints
# Handles creating, starting and retrieving VR therapy sessions.
@app.post("/patients/{patient_id}/start-session")
def start_session_for_patient(patient_id: int, data: StartSessionRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if last completed session had "Continue" choice
    cursor.execute("""
        SELECT patient_choice FROM sessions
        WHERE patient_id = %s AND status = 'completed'
        ORDER BY start_time DESC LIMIT 1
    """, (patient_id,))
    last = cursor.fetchone()

    if last and last[0] == "Continue to next stage":
        cursor.execute("""
            UPDATE patients
            SET current_level = CASE
                WHEN current_level < 4 THEN current_level + 1
                ELSE 4
            END
            WHERE id = %s
        """, (patient_id,))

    # Get updated level to use as vr_level for this session
    cursor.execute("SELECT current_level FROM patients WHERE id = %s", (patient_id,))
    current_level = cursor.fetchone()[0]

    cursor.execute(
        """
        UPDATE sessions
        SET status = 'completed',
            end_time = NOW()
        WHERE patient_id = %s
        AND status = 'active'
        """,
        (patient_id,)
    )

    cursor.execute(
        """
        INSERT INTO sessions
        (patient_id, session_date, vr_level, status, start_time)
        VALUES (%s, CURRENT_DATE, %s, 'active', NOW())
        RETURNING id
        """,
        (patient_id, current_level)
    )

    session_id = cursor.fetchone()[0]

    conn.commit()
    cursor.close()
    conn.close()

    return {
        "message": "Session started successfully",
        "session_id": session_id,
        "patient_id": patient_id,
        "vr_level": current_level,
        "status": "active"
    }

@app.get("/patients/{patient_id}/sessions")
def get_patient_sessions(patient_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, session_date, vr_level, system_recommendation, therapist_recommendation, notes
        FROM sessions
        WHERE patient_id = %s
        ORDER BY session_date DESC
        """,
        (patient_id,)
    )

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    sessions_list = []

    for row in rows:
        sessions_list.append({
            "id": row[0],
            "sessionDate": row[1],
            "vrLevel": row[2],
            "systemRecommendation": row[3],
            "therapistRecommendation": row[4],
            "notes": row[5],
        })

    return {"sessions": sessions_list}

@app.get("/patients/{patient_id}/latest-session")
def get_latest_session(patient_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id
        FROM sessions
        WHERE patient_id = %s
        AND status = 'completed'
        ORDER BY start_time DESC
        LIMIT 1
        """,
        (patient_id,)
    )

    row = cursor.fetchone()

    cursor.close()
    conn.close()

    if not row:
        return {"session_id": None}

    return {"session_id": row[0]}

# Manually ends an active VR session.
@app.put("/sessions/{session_id}/end-session")
def end_session(session_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE sessions
        SET status = 'completed',
            end_time = NOW()
        WHERE id = %s
        AND status = 'active'
        RETURNING id
        """,
        (session_id,)
    )

    row = cursor.fetchone()
    conn.commit()

    cursor.close()
    conn.close()

    if not row:
        return {"message": "No active session found"}

    return {
        "message": "Session ended successfully",
        "session_id": row[0],
        "status": "completed"
    }

@app.get("/sessions/latest-active")
def get_latest_active_session():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id
        FROM sessions
        WHERE status = 'active'
        ORDER BY start_time DESC
        LIMIT 1
    """)

    row = cursor.fetchone()

    cursor.close()
    conn.close()

    if not row:
        return {"session_id": None}

    return {"session_id": row[0]}

@app.get("/patients/{patient_id}/sessions-history")
def get_sessions_history(patient_id: int):
    BASELINE_HR = 75
 
    conn = get_db_connection()
    cursor = conn.cursor()
 
    # Fetch all completed sessions for this patient
    cursor.execute(
        """
        SELECT
            s.id,
            s.session_date,
            s.vr_level,
            s.status,
            s.therapist_recommendation,
            s.patient_choice,
            s.start_time,
            s.end_time
        FROM sessions s
        WHERE s.patient_id = %s
        ORDER BY s.start_time DESC
        """,
        (patient_id,)
    )
    sessions = cursor.fetchall()
 
    result = []
    hr_cursor = conn.cursor()  # separate cursor so the session loop isn't clobbered
 
    for s in sessions:
        session_id  = s[0]
        session_date = str(s[1]) if s[1] else None
        vr_level    = s[2]
        status      = s[3]
        therapist_recommendation = s[4]
        patient_choice     = s[5]
        start_time  = str(s[6]) if s[6] else None
        end_time    = str(s[7]) if s[7] else None
 
        # Compute HR stats inline from physiological_data,
        # bounded by VR event times (mirrors the live analysis endpoint)
        hr_cursor.execute(
            """
            SELECT p.heart_rate
            FROM physiological_data p
            WHERE p.session_id = %s
                AND p.recorded_at BETWEEN
                    COALESCE(
                        (SELECT MIN(event_time) FROM vr_events WHERE session_id = %s),
                        (SELECT start_time      FROM sessions   WHERE id        = %s)
                    )
                    AND
                    COALESCE(
                        (SELECT MAX(event_time) FROM vr_events WHERE session_id = %s),
                        COALESCE(
                            (SELECT end_time FROM sessions WHERE id = %s),
                            NOW()
                        )
                    )
              AND p.heart_rate IS NOT NULL
              AND p.heart_rate > 0
            ORDER BY p.recorded_at
            """,
            (session_id, session_id, session_id, session_id, session_id)
        )
        hr_rows = hr_cursor.fetchall()
        heart_rates = [r[0] for r in hr_rows]
 
        if heart_rates:
            avg_hr   = round(sum(heart_rates) / len(heart_rates), 1)
            max_hr   = max(heart_rates)
            final_hr = heart_rates[-1]
            max_increase   = max_hr   - BASELINE_HR
            final_increase = final_hr - BASELINE_HR
 
            if max_increase <= 25 and final_increase <= 20:
                stress_level        = "Low"
                system_recommendation = "Continue to next stage"
            else:
                stress_level        = "High"
                system_recommendation = "Stay at current stage"
        else:
            avg_hr = max_hr = final_hr = None
            stress_level = system_recommendation = None
 
        result.append({
            "session_id":           session_id,
            "session_date":         session_date,
            "vr_level":             vr_level,
            "status":               status,
            "start_time":           start_time,
            "end_time":             end_time,
            "avg_hr":               avg_hr,
            "max_hr":               max_hr,
            "final_hr":             final_hr,
            "stress_level":         stress_level,
            "system_recommendation": system_recommendation,
            "therapist_recommendation":   therapist_recommendation,
            "patient_choice":       patient_choice,
        })
 
    hr_cursor.close()
    cursor.close()
    conn.close()
 
    return {"history": result}

# Unity VR Endpoints
# Handles Unity activity logs and VR events generated during a therapy session.
@app.get("/sessions/{session_id}/vr-events")
def get_session_vr_events(session_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, event_type, event_value, event_time
        FROM vr_events
        WHERE session_id = %s
        ORDER BY event_time
        """,
        (session_id,)
    )

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    events_list = []

    for row in rows:
        events_list.append({
            "id": row[0],
            "eventType": row[1],
            "eventValue": row[2],
            "eventTime": row[3],
        })

    return {"events": events_list}

@app.get("/sessions/{session_id}/combined-by-time")
def get_combined_by_time(session_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Unity events
    cursor.execute("""
        SELECT id, event_value, event_time
        FROM vr_events
        WHERE session_id = %s
        ORDER BY event_time
    """, (session_id,))
    events = cursor.fetchall()

    # Heart rate data - only valid heart rate values
    cursor.execute("""
        SELECT heart_rate, recorded_at
        FROM physiological_data
        WHERE session_id = %s
          AND heart_rate IS NOT NULL
          AND heart_rate > 0
        ORDER BY recorded_at
    """, (session_id,))
    heart_rates = cursor.fetchall()

    cursor.close()
    conn.close()

    if not events:
        return {"combined_data": []}

    result = []

    for event in events:
        event_id = event[0]
        action = event[1]
        event_time = event[2]

        chosen_hr = None

        # Take the latest valid heart rate before the Unity event
        for hr in heart_rates:
            heart_rate = hr[0]
            recorded_at = hr[1]

            if recorded_at <= event_time:
                chosen_hr = heart_rate
            else:
                break

        result.append({
            "event_id": event_id,
            "unity_action": action,
            "unity_time": str(event_time),
            "heart_rate": chosen_hr
        })

    return {"combined_data": result}

@app.post("/unity/activity-log")
def save_activity_log(data: ActivityLogRequest):
    os.makedirs("unity_logs", exist_ok=True)

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, patient_id
        FROM sessions
        WHERE status = 'active'
        ORDER BY start_time DESC
        LIMIT 1
        """
    )

    active_session = cursor.fetchone()

    if not active_session:
        cursor.close()
        conn.close()
        return {"message": "No active session found"}

    db_session_id = active_session[0]
    patient_id = active_session[1]

    file_name = f"unity_logs/activity_log_patient_{patient_id}_session_{db_session_id}.txt"

    with open(file_name, "w", encoding="utf-8") as f:
        f.write(data.log_text)

    inserted_events = 0
    first_event_time = None
    last_event_time = None

    for line in data.log_text.splitlines():
        if " | " not in line:
            continue

        time_part, action = line.split(" | ", 1)

        cursor.execute(
            """
            INSERT INTO vr_events (session_id, event_type, event_value, event_time)
            VALUES (%s, %s, %s, CURRENT_DATE + %s::time)
            RETURNING event_time
            """,
            (
                db_session_id,
                "unity_event",
                action,
                time_part
            )
        )

        event_time = cursor.fetchone()[0]

        if first_event_time is None:
            first_event_time = event_time

        last_event_time = event_time
        inserted_events += 1

    if inserted_events > 0:
        cursor.execute(
            "UPDATE sessions SET status = 'completed', end_time = COALESCE(%s, NOW()) WHERE id = %s",
            (last_event_time, db_session_id)
        )
    else:
        conn.rollback()
        cursor.close()
        conn.close()

        return {"message": "Stage not completed. Recommendation: Repeat current stage."}

    conn.commit()
    cursor.close()
    conn.close()

    return {
        "message": "Activity log saved successfully",
        "patient_id": patient_id,
        "db_session_id": db_session_id,
        "inserted_events": inserted_events,
        "file_name": file_name
    }

# Physiological Data Endpoints
# Handles heart rate data received from the Wear OS application
@app.post("/api/heart-rate")
def save_heart_rate(data: HeartRateRequest):

    conn = get_db_connection()
    cursor = conn.cursor()

    session_id = data.session_id

    cursor.execute("""
        INSERT INTO physiological_data
        (session_id, heart_rate, stress_level, movement_level, recorded_at)
        VALUES (%s, %s, %s, %s, NOW() AT TIME ZONE 'Asia/Jerusalem')
        RETURNING id
    """,
    (
        session_id,
        data.heartRate,
        data.stress_level,
        data.movement_level
    ))

    new_id = cursor.fetchone()[0]

    conn.commit()
    cursor.close()
    conn.close()

    return {
        "message": "Heart rate saved successfully",
        "id": new_id,
        "session_id": session_id,
        "heart_rate": data.heartRate
    }

@app.get("/physiological-data")
def get_physiological_data():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, session_id, heart_rate, stress_level, movement_level, recorded_at
        FROM physiological_data
        ORDER BY id DESC
        LIMIT 20
    """)

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    data = []

    for row in rows:
        data.append({
            "id": row[0],
            "session_id": row[1],
            "heart_rate": row[2],
            "stress_level": row[3],
            "movement_level": row[4],
            "recorded_at": str(row[5])
        })

    return {"data": data}


# Session Analysis Endpoints
# Calculates heart rate statistics and system recommendations
@app.get("/sessions/{session_id}/analysis")
def analyze_session(session_id: int):
    BASELINE_HR = 75

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT p.heart_rate, p.recorded_at
        FROM physiological_data p
        WHERE p.session_id = %s
          AND p.recorded_at BETWEEN
                (SELECT MIN(event_time) FROM vr_events WHERE session_id = %s)
                AND
                (SELECT MAX(event_time) FROM vr_events WHERE session_id = %s)
        ORDER BY p.recorded_at
        """,
        (session_id, session_id, session_id)
    )

    rows = cursor.fetchall()

    if not rows:
        return {
            "message": "No physiological data found for analysis"
        }

    heart_rates = [row[0] for row in rows]

    avg_hr = round(sum(heart_rates) / len(heart_rates), 2)
    max_hr = max(heart_rates)
    final_hr = heart_rates[-1]

    max_increase = max_hr - BASELINE_HR
    final_increase = final_hr - BASELINE_HR

    if max_increase <= 25 and final_increase <= 20:
        stress_level = "Low"
        system_recommendation = "Continue to next stage"
    else:
        stress_level = "High"
        system_recommendation = "Stay at current stage"

    cursor.execute(
        """
        UPDATE sessions
        SET system_recommendation = %s
        WHERE id = %s
        """,
        (system_recommendation, session_id)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return {
        "session_id": session_id,
        "baseline_heart_rate": BASELINE_HR,
        "average_heart_rate": avg_hr,
        "max_heart_rate": max_hr,
        "final_heart_rate": final_hr,
        "max_increase_from_baseline": max_increase,
        "final_increase_from_baseline": final_increase,
        "stress_level": stress_level,
        "system_recommendation": system_recommendation
    }

# Treatment Decision Endpoints
# Handles therapist recomendetions and patient choices
@app.put("/sessions/{session_id}/therapist-recommendation")
def update_therapist_recommendation(session_id: int, data: TherapistRecommendationRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE sessions
        SET therapist_recommendation = %s
        WHERE id = %s
        RETURNING id, therapist_recommendation
        """,
        (data.therapist_recommendation, session_id)
    )

    row = cursor.fetchone()
    conn.commit()

    cursor.close()
    conn.close()

    if not row:
        return {"message": "Session not found"}

    return {
        "message": "Therapist recommendation saved successfully",
        "session_id": row[0],
        "therapist_recommendation": row[1]
    }

@app.put("/sessions/{session_id}/patient-choice")
def update_patient_choice(session_id: int, data: PatientChoiceRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT patient_id
        FROM sessions
        WHERE id = %s
        """,
        (session_id,)
    )

    session = cursor.fetchone()

    if not session:
        cursor.close()
        conn.close()
        return {"message": "Session not found"}

    patient_id = session[0]

    cursor.execute(
        """
        UPDATE sessions
        SET patient_choice = %s
        WHERE id = %s
        """,
        (data.patient_choice, session_id)
    )

    cursor.execute(
        """
        SELECT current_level
        FROM patients
        WHERE id = %s
        """,
        (patient_id,)
    )

    current_level = cursor.fetchone()[0]

    conn.commit()
    cursor.close()
    conn.close()

    return {
        "message": "Patient choice saved successfully",
        "session_id": session_id,
        "patient_choice": data.patient_choice,
        "patient_id": patient_id,
        "current_level": current_level
    }
