import unittest
import requests
import psycopg2
from datetime import datetime, timezone, timedelta
import hashlib

BASE_URL = "http://127.0.0.1:8000"
DB_CONN_STR = "postgresql://postgres:7044@localhost:5432/voyageai"

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'ignore').decode('ascii'))

class TestVoyageAIAuthSecurity(unittest.TestCase):

    def get_db_connection(self):
        return psycopg2.connect(DB_CONN_STR)

    def test_01_root_health(self):
        res = requests.get(f"{BASE_URL}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get("status"), "online")
        safe_print("[PASS] Health check")

    def test_02_login_and_cookie(self):
        email = f"test_user_{int(datetime.now().timestamp())}@example.com"
        payload = {
            "provider": "EMAIL",
            "email": email,
            "name": "Security Tester",
            "isRegister": True
        }
        headers = {"Origin": "http://localhost:5173"}
        res = requests.post(f"{BASE_URL}/api/auth/login", json=payload, headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        
        # Verify no raw token in response body
        self.assertNotIn("token", data, "Raw token must NOT be returned in body")
        self.assertIn("authUser", data)
        self.assertEqual(data["authUser"]["email"], email)

        # Verify HttpOnly cookie set
        cookies = res.cookies
        self.assertIn("voyageai_session", cookies, "HttpOnly cookie 'voyageai_session' must be set")
        raw_cookie_val = cookies["voyageai_session"]
        self.assertTrue(raw_cookie_val.startswith("token_"))

        # Verify database SessionModel state
        token_hash = hashlib.sha256(raw_cookie_val.encode('utf-8')).hexdigest()
        conn = self.get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, token_hash, user_id, expires_at, revoked_at FROM sessions WHERE token_hash = %s;", (token_hash,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        self.assertIsNotNone(row, "Session record must exist in PostgreSQL database")
        self.assertEqual(row[1], token_hash)
        self.assertIsNone(row[4], "revoked_at must be NULL for fresh session")
        safe_print("[PASS] Login & HttpOnly Cookie Verification")

        return raw_cookie_val, email

    def test_03_session_restore(self):
        raw_cookie_val, email = self.test_02_login_and_cookie()
        cookies = {"voyageai_session": raw_cookie_val}
        res = requests.get(f"{BASE_URL}/api/auth/session", cookies=cookies)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["authUser"]["email"], email)
        safe_print("[PASS] Session Restore with Cookie")

    def test_04_unauthorized_protected_route(self):
        res = requests.get(f"{BASE_URL}/api/auth/session")
        self.assertEqual(res.status_code, 401, "Requests without session cookie must return 401")
        safe_print("[PASS] Protected API 401 Verification")

    def test_05_invalid_corrupted_cookie(self):
        cookies = {"voyageai_session": "token_corrupted_invalid_hash_12345"}
        res = requests.get(f"{BASE_URL}/api/auth/session", cookies=cookies)
        self.assertEqual(res.status_code, 401, "Corrupted session cookie must return 401")
        safe_print("[PASS] Corrupted Cookie Verification")

    def test_06_revoked_session(self):
        raw_cookie_val, email = self.test_02_login_and_cookie()
        token_hash = hashlib.sha256(raw_cookie_val.encode('utf-8')).hexdigest()

        # Manually mark session revoked in DB
        conn = self.get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE sessions SET revoked_at = %s WHERE token_hash = %s;", (datetime.now(timezone.utc).isoformat(), token_hash))
        conn.commit()
        cur.close()
        conn.close()

        # Attempt session restore
        cookies = {"voyageai_session": raw_cookie_val}
        res = requests.get(f"{BASE_URL}/api/auth/session", cookies=cookies)
        self.assertEqual(res.status_code, 401, "Revoked session must reject access")
        safe_print("[PASS] Session Revocation Verification")

    def test_07_expired_session(self):
        raw_cookie_val, email = self.test_02_login_and_cookie()
        token_hash = hashlib.sha256(raw_cookie_val.encode('utf-8')).hexdigest()

        # Manually expire session in DB (past date)
        past_date = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
        conn = self.get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE sessions SET expires_at = %s WHERE token_hash = %s;", (past_date, token_hash))
        conn.commit()
        cur.close()
        conn.close()

        # Attempt session restore
        cookies = {"voyageai_session": raw_cookie_val}
        res = requests.get(f"{BASE_URL}/api/auth/session", cookies=cookies)
        self.assertEqual(res.status_code, 401, "Expired session must return 401")
        safe_print("[PASS] Session Expiration Verification")

    def test_08_logout_revocation(self):
        raw_cookie_val, email = self.test_02_login_and_cookie()
        cookies = {"voyageai_session": raw_cookie_val}
        res = requests.post(f"{BASE_URL}/api/auth/logout", cookies=cookies)
        self.assertEqual(res.status_code, 200)

        # Check DB to ensure session is revoked
        token_hash = hashlib.sha256(raw_cookie_val.encode('utf-8')).hexdigest()
        conn = self.get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT revoked_at FROM sessions WHERE token_hash = %s;", (token_hash,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        self.assertIsNotNone(row)
        self.assertIsNotNone(row[0], "Logout must mark revoked_at in DB")

        # Verify access denied after logout
        res_after = requests.get(f"{BASE_URL}/api/auth/session", cookies=cookies)
        self.assertEqual(res_after.status_code, 401)
        safe_print("[PASS] Logout & Revocation Verification")

    def test_09_unregistered_email_signin_rejected(self):
        unknown_email = f"unknown_user_{int(datetime.now().timestamp())}@example.com"
        payload = {
            "provider": "EMAIL",
            "email": unknown_email,
            "password": "somepassword",
            "isRegister": False
        }
        res = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        self.assertEqual(res.status_code, 400, "Unregistered email in Sign In mode must return 400")
        self.assertIn("No account found", res.json().get("detail", ""))
        safe_print("[PASS] Unregistered Email Sign-In Rejection")

    def test_10_invalid_email_syntax_rejected(self):
        payload = {
            "provider": "EMAIL",
            "email": "notanemail",
            "password": "somepassword",
            "isRegister": True
        }
        res = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        self.assertEqual(res.status_code, 400, "Invalid email format must return 400")
        self.assertIn("Invalid email format", res.json().get("detail", ""))
        safe_print("[PASS] Invalid Email Syntax Rejection")

if __name__ == "__main__":
    unittest.main()
