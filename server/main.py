from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import get_db_connection
from datetime import datetime, date
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RegisterUser(BaseModel):
    fullName: str
    email: str
    password: str
    role: str


class LoginUser(BaseModel):
    email: str
    password: str

class Patient(BaseModel):
    fullName: str
    email: str
    age: int
    currentLevel: int

@app.get("/")
def root():
    return {"message": "VR Acrophobia API is running"}

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
            p.age,
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
            "age": row[3],
            "currentLevel": row[4],
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
            p.age,
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
            "age": row[3],
            "currentLevel": row[4],
        }
    }

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
            p.age,
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
            "age": row[3],
            "currentLevel": row[4],
        })

    return {"patients": patients_list}

@app.post("/patients")
def add_patient(patient: Patient):
    new_patient = {
        "id": len(patients) + 1,
        "fullName": patient.fullName,
        "email": patient.email,
        "age": patient.age,
        "currentLevel": patient.currentLevel,
    }

    patients.append(new_patient)

    return {
        "message": "Patient added successfully",
        "patient": new_patient,
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
            p.age,
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
            "age": row[3],
            "currentLevel": row[4],
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
            p.age,
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
            "age": row[3],
            "currentLevel": row[4],
        }
    }

@app.get("/patients/{patient_id}/sessions")
def get_patient_sessions(patient_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, session_date, vr_level, system_recommendation, therapist_decision, notes
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
            "therapistDecision": row[4],
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
        ORDER BY session_date DESC
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

    cursor.execute(
        """
        SELECT
            v.id,
            v.event_value,
            v.event_time,
            p.heart_rate,
            p.recorded_at
        FROM vr_events v
        LEFT JOIN LATERAL (
            SELECT heart_rate, recorded_at
            FROM physiological_data p
            ORDER BY ABS(EXTRACT(EPOCH FROM (p.recorded_at - v.event_time)))
            LIMIT 1
        ) p ON true
        WHERE v.session_id = %s
        ORDER BY v.event_time
        """,
        (session_id,)
    )

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    data = []

    for row in rows:
        data.append({
            "event_id": row[0],
            "unity_action": row[1],
            "unity_time": str(row[2]),
            "heart_rate": row[3],
            "heart_rate_time": str(row[4]) if row[4] else None
        })

    return {"combined_data": data}

@app.get("/sessions/{session_id}/analysis")
def analyze_session(session_id: int):
    BASELINE_HR = 75

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
          """
         SELECT p.heart_rate, p.recorded_at
         FROM physiological_data p
         WHERE p.recorded_at BETWEEN
                 (SELECT MIN(event_time) FROM vr_events WHERE session_id = %s)
                 AND
                (SELECT MAX(event_time) FROM vr_events WHERE session_id = %s)
         ORDER BY p.recorded_at
         """,
         (session_id, session_id)
     )

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

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

class TherapistDecisionRequest(BaseModel):
    therapist_decision: str


@app.put("/sessions/{session_id}/therapist-decision")
def update_therapist_decision(session_id: int, data: TherapistDecisionRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE sessions
        SET therapist_decision = %s
        WHERE id = %s
        RETURNING id, therapist_decision
        """,
        (data.therapist_decision, session_id)
    )

    row = cursor.fetchone()
    conn.commit()

    cursor.close()
    conn.close()

    if not row:
        return {"message": "Session not found"}

    return {
        "message": "Therapist decision saved successfully",
        "session_id": row[0],
        "therapist_decision": row[1]
    }

class ActivityLogRequest(BaseModel):
    patient_id: int
    session_id: str
    log_text: str

@app.post("/unity/activity-log")
def save_activity_log(data: ActivityLogRequest):
    os.makedirs("unity_logs", exist_ok=True)

    file_name = f"unity_logs/activity_log_patient_{data.patient_id}_{data.session_id}.txt"

    with open(file_name, "w", encoding="utf-8") as f:
        f.write(data.log_text)

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO sessions (patient_id, vr_level, notes)
        VALUES (%s, %s, %s)
        RETURNING id
        """,
        (data.patient_id, 1, f"Unity session: {data.session_id}")
    )

    db_session_id = cursor.fetchone()[0]

    inserted_events = 0

    for line in data.log_text.splitlines():
        if " | " not in line:
            continue

        time_part, action = line.split(" | ", 1)

        cursor.execute(
            """
            INSERT INTO vr_events (session_id, event_type, event_value, event_time)
            VALUES (%s, %s, %s, CURRENT_DATE + %s::time)
            """,
            (
                db_session_id,
                "unity_event",
                action,
                time_part
            )
        )

        inserted_events += 1

    conn.commit()
    cursor.close()
    conn.close()

    return {
        "message": "Activity log saved successfully",
        "patient_id": data.patient_id,
        "unity_session_id": data.session_id,
        "db_session_id": db_session_id,
        "inserted_events": inserted_events,
        "file_name": file_name
    }

class HeartRateRequest(BaseModel):
    session_id: int
    heartRate: int
    stress_level: int | None = None
    movement_level: int | None = None


@app.post("/api/heart-rate")
def save_heart_rate(data: HeartRateRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO physiological_data
        (session_id, heart_rate, stress_level, movement_level, recorded_at)
        VALUES (%s, %s, %s, %s, NOW())
        RETURNING id
        """,
        (
            data.session_id,
            data.heartRate,
            data.stress_level,
            data.movement_level
        )
    )

    new_id = cursor.fetchone()[0]

    conn.commit()
    cursor.close()
    conn.close()

    return {
        "message": "Heart rate saved successfully",
        "id": new_id,
        "session_id": data.session_id,
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