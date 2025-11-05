from __future__ import annotations
import os, sqlite3
from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from datetime import datetime, date
from dateutil import parser as dateparser

APP_PORT = 8080
DB_DIR = os.path.join("data")
DB_PATH = os.path.join(DB_DIR, "bookings.sqlite")
ACCESS_CODE = os.environ.get("ACCESS_CODE", "")
MONTHS_AHEAD = int(os.environ.get("MONTHS_AHEAD", "12"))

app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)

os.makedirs(DB_DIR, exist_ok=True)

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

with get_db() as conn:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            start_date TEXT NOT NULL, -- YYYY-MM-DD
            end_date   TEXT NOT NULL, -- YYYY-MM-DD
            note TEXT,
            created_at TEXT NOT NULL
        );
        """
    )
    conn.commit()

def ymd(d):
    if isinstance(d, (date, datetime)):
        return d.strftime("%Y-%m-%d")
    return str(d)

def overlaps(a1: str, a2: str, b1: str, b2: str) -> bool:
    return a1 <= b2 and b1 <= a2

@app.route("/")
def index():
    return render_template("index.html", months_ahead=MONTHS_AHEAD)

@app.get("/api/bookings")
def list_bookings():
    q_from = request.args.get("from")
    q_to = request.args.get("to")
    sql = "SELECT * FROM bookings"
    params = []
    if q_from and q_to:
        sql += " WHERE start_date <= ? AND end_date >= ?"
        params = [q_to, q_from]
    sql += " ORDER BY start_date ASC"
    with get_db() as conn:
        rows = conn.execute(sql, params).fetchall()
        data = [dict(r) for r in rows]
    return jsonify(data)

@app.post("/api/bookings")
def create_booking():
    payload = request.get_json(force=True)
    name = (payload.get("name") or "").strip()
    start = ymd(dateparser.parse(payload.get("start"))).strip()
    end   = ymd(dateparser.parse(payload.get("end"))).strip()
    note  = (payload.get("note") or "").strip()
    code  = (payload.get("code") or "").strip()

    if ACCESS_CODE and code != ACCESS_CODE:
        return jsonify({"error":"invalid_code"}), 401
    if not name or not start or not end:
        return jsonify({"error":"missing_fields"}), 400
    if end < start:
        return jsonify({"error":"range"}), 400

    with get_db() as conn:
        rows = conn.execute("SELECT start_date, end_date FROM bookings").fetchall()
        for r in rows:
            if overlaps(start, end, r["start_date"], r["end_date"]):
                return jsonify({"error":"conflict"}), 409
        now = datetime.utcnow().isoformat()
        cur = conn.execute(
            "INSERT INTO bookings(name, start_date, end_date, note, created_at) VALUES(?,?,?,?,?)",
            [name, start, end, note, now]
        )
        conn.commit()
        new_id = cur.lastrowid
        item = conn.execute("SELECT * FROM bookings WHERE id=?", [new_id]).fetchone()
        return jsonify(dict(item)), 201

@app.delete("/api/bookings/<int:booking_id>")
def delete_booking(booking_id: int):
    code = (request.args.get("code") or "").strip()
    if ACCESS_CODE and code != ACCESS_CODE:
        return jsonify({"error":"invalid_code"}), 401
    with get_db() as conn:
        conn.execute("DELETE FROM bookings WHERE id=?", [booking_id])
        conn.commit()
    return ("", 204)

@app.get("/health")
def health():
    return {"ok": True}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=APP_PORT)
