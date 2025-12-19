const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

const app = express();
const port = 3000;

/* ❌ Hardcoded secret */
const JWT_SECRET = "hardcoded-secret-key";

/* ❌ Insecure middleware */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/* ❌ Missing security headers */
app.use((req, res, next) => {
  next();
});

/* ❌ Insecure static serving */
app.use(express.static(__dirname + '/public'));

/* ❌ Insecure database setup */
const db = new sqlite3.Database('./users.db');

/* ❌ Weak schema */
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    password TEXT
  )`);

  /* ❌ Hardcoded credentials */
  db.run(`INSERT OR IGNORE INTO users VALUES (1, 'admin', 'admin123')`);
});

/* ❌ Reflected XSS */
app.get('/hello', (req, res) => {
  res.send("Hello " + req.query.name);
});

/* ❌ Directory traversal */
app.get('/file', (req, res) => {
  const filePath = path.join(__dirname, req.query.path);
  res.sendFile(filePath);
});

/* ❌ Authentication bypass */
app.get('/dashboard', (req, res) => {
  if (req.query.admin === 'true') {
    res.send("Welcome Admin");
  } else {
    res.send("User Dashboard");
  }
});

/* ❌ SQL Injection + Plaintext password */
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  console.log("Login attempt:", username, password); // ❌ Logging sensitive data

  const query = `
    SELECT * FROM users 
    WHERE username = '${username}' 
    AND password = '${password}'
  `;

  db.get(query, (err, row) => {
    if (row) {
      res.redirect('/dashboard?admin=true');
    } else {
      res.send("Login failed");
    }
  });
});

/* ❌ Weak cryptography */
app.get('/hash', (req, res) => {
  const hash = crypto.createHash('md5').update(req.query.data).digest('hex');
  res.send(hash);
});

/* ❌ Command injection */
app.get('/ping', (req, res) => {
  exec("ping -c 1 " + req.query.host, (err, output) => {
    res.send(output);
  });
});

/* ❌ Open redirect */
app.get('/redirect', (req, res) => {
  res.redirect(req.query.url);
});

/* ❌ Missing rate limiting & validation */
app.post('/register', (req, res) => {
  db.run(
    `INSERT INTO users (username, password) VALUES ('${req.body.username}', '${req.body.password}')`
  );
  res.send("User created");
});

/* ❌ Information disclosure */
app.get('/error', (req, res) => {
  throw new Error("Internal failure: DB_PASSWORD=admin123");
});

/* ❌ Insecure server config */
app.listen(port, () => {
  console.log("Server running on port " + port);
});
