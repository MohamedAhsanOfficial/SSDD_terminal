const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new sqlite3.Database('./users.db');

// Create table and insert sample user
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    password TEXT
  )`);

  // Insert sample users (for demo)
  db.run(`INSERT OR IGNORE INTO users (username, password) VALUES ('admin', 'password')`);
  db.run(`INSERT OR IGNORE INTO users (username, password) VALUES ('user', 'pass')`);
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Vulnerable SQL query (DO NOT USE IN PRODUCTION)
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

  db.get(query, (err, row) => {
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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});