const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');

const app = express();
const port = process.env.PORT || 3001;

/* =========================================================
   SECURITY HEADERS & HARDENING (OWASP A05: Security Misconfig)
========================================================= */

// Removes X-Powered-By header to prevent technology disclosure
app.disable('x-powered-by');

// Helmet enables multiple HTTP security headers
app.use(helmet());

// Explicitly hides X-Powered-By header
app.use(helmet.hidePoweredBy());

// Prevents MIME-type sniffing attacks
app.use(helmet.noSniff());

// Prevents clickjacking using X-Frame-Options: DENY
app.use(helmet.frameguard({ action: 'deny' }));

// Prevents referrer leakage
app.use(helmet.referrerPolicy({ policy: 'no-referrer' }));

// Content Security Policy (Prevents XSS, data injection)
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
    },
  })
);

// Parses application/x-www-form-urlencoded data
app.use(bodyParser.urlencoded({ extended: true }));

// Parses cookies from HTTP requests
app.use(cookieParser());

/* =========================================================
   CSRF PROTECTION (OWASP A01: Broken Access Control)
========================================================= */

// CSRF protection using synchronizer token pattern
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,          // Prevents JS access to CSRF cookie
    sameSite: 'Strict',      // Prevents cross-site requests
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
});

/* =========================================================
   FETCH METADATA PROTECTION (Cross-site Request Blocking)
========================================================= */

// Blocks unsafe cross-site requests using Fetch Metadata headers
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
app.use((req, res, next) => {
  const site = req.get('Sec-Fetch-Site');
  if (site && site !== 'same-origin' && site !== 'none') {
    if (!SAFE_METHODS.has(req.method)) {
      return res.status(403).send('Blocked cross-site request');
    }
  }
  return next();
});

/* =========================================================
   DATABASE SETUP (SQL Injection Mitigation via Prepared Queries)
========================================================= */

const db = new sqlite3.Database('./users.db');

// Create users table
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    password TEXT
  )`);

  // Demo users (for academic purposes)
  db.run(`INSERT OR IGNORE INTO users (username, password) VALUES ('admin', 'password')`);
  db.run(`INSERT OR IGNORE INTO users (username, password) VALUES ('user', 'pass')`);
});

/* =========================================================
   ROUTES
========================================================= */

// Login page protected with CSRF token
app.get('/', csrfProtection, (req, res) => {
  const token = req.csrfToken();
  res.send(
  `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secure Login - MyApp</title>
    <link rel="stylesheet" href="/css/styles.css">
  </head>
  <body>
    <div class="login-container">
      <div class="logo">MyApp</div>
      <div class="subtitle">Secure Login Portal</div>
      <form id="login-form" action="/login" method="POST">
        <!-- CSRF token prevents cross-site request forgery -->
        <input type="hidden" name="_csrf" value="${token}">
        <div class="input-group">
          <label for="username">Username</label>
          <input type="text" id="username" name="username" required>
        </div>
        <div class="input-group">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required>
        </div>
        <button type="submit">Sign In</button>
      </form>
      <div class="footer">
        &copy; 2025 MyApp. All rights reserved.
      </div>
    </div>
  </body>
  </html>`
  );
});

// Endpoint to fetch CSRF token (used by client-side forms)
app.get('/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Dashboard page
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Login handler with CSRF + SQL Injection protection
app.post('/login', csrfProtection, (req, res) => {
  const { username, password } = req.body;

  // Parameterized query prevents SQL Injection
  const query = `SELECT * FROM users WHERE username = ? AND password = ?`;

  db.get(query, [username, password], (err, row) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    if (row) {
      res.redirect('/dashboard?user=' + encodeURIComponent(row.username));
    } else {
      res.sendFile(path.join(__dirname, 'public', 'error.html'));
    }
  });
});

/* =========================================================
   STATIC FILES
========================================================= */

// Serves static assets (CSS, images)
app.use(express.static(path.join(__dirname, 'public')));

/* =========================================================
   ERROR HANDLING
========================================================= */

// CSRF error handler prevents stack trace leakage
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).send('Invalid CSRF token');
  }
  return next(err);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
