// What a learner does at each step of "Authentication and Security — Multi-user Studio"
// (ml-security), for the walkthrough test (mlProduction.desktop.test.js). The entry format is
// described in ml-software.walkthrough.js.

export const WALKTHROUGH = {
  // ── 6.1 ──────────────────────────────────────────────────────────────────
  '06-01-passwords#A new project': {
    run: ['python -m venv .venv', '.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  '06-01-passwords#Read the tests first': {
    wrong: [{ name: 'did not create the files', fails: [0, 1] }],
  },
  '06-01-passwords#Salted, slow hashing': {
    wrong: [
      { name: 'no salt', edit: [['    salt = secrets.token_bytes(16) if salt is None else salt\n', '    salt = b"same-for-everyone" if salt is None else salt\n']], fails: [0] },
      { name: 'stored the password instead of a hash', edit: [['    return f"scrypt${salt.hex()}${digest.hex()}"', '    return f"scrypt${salt.hex()}${password}"']], fails: [0] },
    ],
  },
  '06-01-passwords#Register and check a login': {
    wrong: [{ name: 'did not normalise the email', edit: [['(email.strip().lower(), passwords.hash_password(password))', '(email, passwords.hash_password(password))']], fails: [0] }],
  },
  '06-01-passwords#Register and log in over HTTP': {
    wrong: [{ name: 'no minimum password length', edit: [['    password: str = Field(min_length=12, max_length=200)', '    password: str = Field(max_length=200)']], fails: [0] }],
  },

  // ── 6.2 ──────────────────────────────────────────────────────────────────
  '06-02-sessions-and-cookies#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '06-02-sessions-and-cookies#Session tokens': {
    wrong: [
      { name: 'stored the token itself', edit: [['            (fingerprint(token), user_id, (now() + SESSION_LENGTH).isoformat()),', '            (token, user_id, (now() + SESSION_LENGTH).isoformat()),'], ['        (fingerprint(token), now().isoformat()),', '        (token, now().isoformat()),']], fails: [0] },
      { name: 'never checks the expiry', edit: [['"SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?",\n        (fingerprint(token), now().isoformat()),', '"SELECT user_id FROM sessions WHERE token_hash = ?",\n        (fingerprint(token),),']], fails: [0] },
    ],
  },
  '06-02-sessions-and-cookies#The cookie, and who\'s asking': {
    wrong: [{ name: 'cookie readable by JavaScript', edit: [['response.set_cookie("session", token, httponly=True, secure=True,', 'response.set_cookie("session", token, secure=True,']], fails: [0] }],
  },

  // ── 6.3 ──────────────────────────────────────────────────────────────────
  '06-03-authorisation#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '06-03-authorisation#Fix: ask the database the right question': {
    wrong: [{ name: 'checked the owner in Python but answered 403', edit: [['        "SELECT id, name FROM projects WHERE id = ? AND owner_id = ?", (project_id, owner_id)\n    ).fetchone()\n    return None if row is None else dict(row)', '        "SELECT id, name, owner_id FROM projects WHERE id = ?", (project_id,)\n    ).fetchone()\n    if row is not None and row["owner_id"] != owner_id:\n        return {"error": "forbidden"}\n    return None if row is None else {"id": row["id"], "name": row["name"]}']], fails: [0] }],
  },

  // ── 6.4 ──────────────────────────────────────────────────────────────────
  '06-04-injection#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '06-04-injection#Fix 1: placeholders': {
    wrong: [{ name: 'a placeholder for the owner but the search text pasted in', edit: [['        "SELECT id, name FROM projects WHERE owner_id = ? AND name LIKE ? ORDER BY id",\n        (owner_id, f"%{text}%"),', '        "SELECT id, name FROM projects WHERE owner_id = ? AND name LIKE \'%" + text + "%\' ORDER BY id",\n        (owner_id,),']], fails: [0] }],
  },
  '06-04-injection#Render the page from the template': {
    wrong: [{ name: 'marked the name as safe in the template', patch: { 'templates/project.html': [['<h1>{{ project.name }}</h1>', '<h1>{{ project.name|safe }}</h1>']] }, typeFile: true, fails: [0] }],
  },
  '06-04-injection#Fix 3: check where the path really ends up': {
    wrong: [{ name: 'only rejected names containing ..', edit: [['    path = (DATASETS / name).resolve()\n    if not path.is_relative_to(DATASETS) or not path.is_file():', '    path = DATASETS / name\n    if ".." in name or not path.is_file():']], fails: [0] }],
  },

  // ── 6.5 ──────────────────────────────────────────────────────────────────
  '06-05-defence-in-depth#Slow down guessing: rate limiting': {
    wrong: [{ name: 'checked the limit only after a wrong password', edit: [['    if too_many_failures(email):\n        raise HTTPException(status_code=429, detail="too many failed logins; try again later")\n    user_id = accounts.check_login(connection, email, credentials.password)\n    if user_id is None:\n', '    user_id = accounts.check_login(connection, email, credentials.password)\n    if user_id is None:\n        if too_many_failures(email):\n            raise HTTPException(status_code=429, detail="too many failed logins; try again later")\n']], fails: [0] }],
  },
  '06-05-defence-in-depth#Requests from other sites, and security headers': {
    wrong: [{ name: 'headers only on successful responses', edit: [['    response.headers["Content-Security-Policy"] = "default-src \'self\'"\n', '    if response.status_code < 400:\n        response.headers["Content-Security-Policy"] = "default-src \'self\'"\n']], fails: [0] }],
  },
  '06-05-defence-in-depth#Secrets stay out of the code': {
    wrong: [{ name: 'forgot the database files', edit: [['*.db\n', '']], fails: [0] }],
  },
};
