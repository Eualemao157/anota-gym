const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path'); // Importante para achar a pasta do site
const app = express();

app.use(cors());
app.use(express.json());

// --- CONFIGURAÇÃO DO BANCO DE DADOS ---
const db = new sqlite3.Database('./gym.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS exercises (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS workouts (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER, exercise_id INTEGER, weight REAL, reps INTEGER, sets INTEGER, done BOOLEAN,
    FOREIGN KEY(workout_id) REFERENCES workouts(id), FOREIGN KEY(exercise_id) REFERENCES exercises(id)
  )`);
  
  // Cadastra exercícios básicos se vazio
  db.get("SELECT count(*) as count FROM exercises", [], (err, row) => {
    if (row && row.count === 0) {
      const basic = [
        'Supino reto com halteres', 'Supino inclinado com halteres', 'Crucifixo inclinado com halteres',
        'Desenvolvimento com halteres', 'Elevação lateral com halter', 'Tríceps polia com barra W',
        'Tríceps francês com halter', 'Cardio (Esteira/Bike)'
      ];
      const stmt = db.prepare("INSERT INTO exercises (name) VALUES (?)");
      basic.forEach(name => stmt.run(name));
      stmt.finalize();
    }
  });
});

// --- SERVIR O SITE (FRONT-END) ---
// Diz ao servidor onde está a pasta 'dist' do site
app.use(express.static(path.join(__dirname, '../client/dist')));

// --- ROTAS DA API ---
app.get('/exercises', (req, res) => { db.all("SELECT * FROM exercises", [], (err, rows) => res.json(rows)); });
app.post('/exercises', (req, res) => { db.run("INSERT INTO exercises (name) VALUES (?)", [req.body.name], function(err) { res.json({ id: this.lastID }); }); });
app.delete('/exercises/:id', (req, res) => { db.run("DELETE FROM exercises WHERE id = ?", [req.params.id], function(err) { res.json({ message: "Deletado" }); }); });

app.get('/workouts/date/:date', (req, res) => {
  const cleanDate = req.params.date.split('T')[0];
  db.get("SELECT * FROM workouts WHERE date LIKE ?", [`${cleanDate}%`], (err, workout) => {
    if (!workout) {
      db.run("INSERT INTO workouts (date) VALUES (?)", [cleanDate], function(err) { res.json({ id: this.lastID, date: cleanDate, items: [] }); });
    } else {
      db.all(`SELECT i.*, e.name as exercise_name FROM items i JOIN exercises e ON i.exercise_id = e.id WHERE i.workout_id = ?`, [workout.id], (err, items) => {
          const formatted = items.map(i => ({ ...i, done: i.done === 1, exercise: { id: i.exercise_id, name: i.exercise_name } }));
          res.json({ ...workout, items: formatted });
      });
    }
  });
});

app.post('/workouts/:id/items', (req, res) => {
  db.run(`INSERT INTO items (workout_id, exercise_id, weight, reps, sets, done) VALUES (?, ?, 0, 0, ?, 0)`, [req.params.id, req.body.exerciseId, req.body.sets || 4], function(err) { res.json({ id: this.lastID }); });
});

app.delete('/items/:id', (req, res) => {
  db.run("DELETE FROM items WHERE id = ?", [req.params.id], function(err) { res.json({ message: "Item removido" }); });
});

app.put('/items/:id', (req, res) => {
  const fields = Object.keys(req.body).map(key => `${key} = ?`).join(', ');
  db.run(`UPDATE items SET ${fields} WHERE id = ?`, [...Object.values(req.body), req.params.id], function(err) { res.json({ message: "Atualizado" }); });
});

app.get('/workouts/list', (req, res) => {
  db.all(`SELECT w.date FROM workouts w JOIN items i ON w.id = i.workout_id GROUP BY w.date`, [], (err, rows) => res.json(rows));
});

app.get('/stats', (req, res) => {
  db.all(`SELECT w.date, MAX(i.weight) as weight FROM items i JOIN workouts w ON i.workout_id = w.id WHERE i.weight > 0 GROUP BY w.date ORDER BY w.date ASC`, [], (err, rows) => res.json(rows));
});

// --- ROTA FINAL: Corrigida para funcionar no Render
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// --- PORTA DINÂMICA (Para funcionar no Render) ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT} 🚀`));