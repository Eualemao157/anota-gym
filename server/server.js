const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./gym.db');

db.serialize(() => {
  // Cria tabelas se não existirem
  db.run(`CREATE TABLE IF NOT EXISTS exercises (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS workouts (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER, exercise_id INTEGER, weight REAL, reps INTEGER, sets INTEGER, done BOOLEAN,
    FOREIGN KEY(workout_id) REFERENCES workouts(id), FOREIGN KEY(exercise_id) REFERENCES exercises(id)
  )`);
  
  // Seus exercícios básicos
  db.get("SELECT count(*) as count FROM exercises", [], (err, row) => {
    if (row.count === 0) {
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

// --- ROTAS ---

app.get('/exercises', (req, res) => {
  db.all("SELECT * FROM exercises", [], (err, rows) => { if (err) return res.status(400).json(err); res.json(rows); });
});

app.post('/exercises', (req, res) => {
  const { name } = req.body;
  db.run("INSERT INTO exercises (name) VALUES (?)", [name], function(err) { if (err) return res.status(400).json(err); res.json({ id: this.lastID, name }); });
});

// Deletar Definição de Exercício (da lista geral)
app.delete('/exercises/:id', (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM exercises WHERE id = ?", [id], function(err) { if (err) return res.status(400).json(err); res.json({ message: "Deletado" }); });
});

// NOVO: Deletar Item de Treino (do dia específico)
app.delete('/items/:id', (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM items WHERE id = ?", [id], function(err) {
    if (err) return res.status(400).json(err);
    res.json({ message: "Item removido do treino" });
  });
});

app.get('/workouts/date/:date', (req, res) => {
  const { date } = req.params;
  const cleanDate = date.split('T')[0];
  db.get("SELECT * FROM workouts WHERE date LIKE ?", [`${cleanDate}%`], (err, workout) => {
    if (!workout) {
      db.run("INSERT INTO workouts (date) VALUES (?)", [cleanDate], function(err) { res.json({ id: this.lastID, date: cleanDate, items: [] }); });
    } else {
      db.all(`SELECT i.*, e.name as exercise_name FROM items i JOIN exercises e ON i.exercise_id = e.id WHERE i.workout_id = ?`, [workout.id], (err, items) => {
          const formattedItems = items.map(i => ({ 
            id: i.id, weight: i.weight, reps: i.reps, sets: i.sets || 4, done: i.done === 1, 
            exercise: { id: i.exercise_id, name: i.exercise_name } 
          }));
          res.json({ ...workout, items: formattedItems });
      });
    }
  });
});

app.post('/workouts/:id/items', (req, res) => {
  const { exerciseId, sets } = req.body;
  db.run(`INSERT INTO items (workout_id, exercise_id, weight, reps, sets, done) VALUES (?, ?, 0, 0, ?, 0)`, 
    [req.params.id, exerciseId, sets || 4], function(err) { res.json({ id: this.lastID }); });
});

app.put('/items/:id', (req, res) => {
  const { id } = req.params;
  const fields = Object.keys(req.body).map(key => `${key} = ?`).join(', ');
  const values = Object.values(req.body);
  db.run(`UPDATE items SET ${fields} WHERE id = ?`, [...values, id], function(err) { if (err) return res.status(400).json(err); res.json({ message: "Atualizado" }); });
});

app.get('/workouts/list', (req, res) => {
  db.all(`SELECT w.date FROM workouts w JOIN items i ON w.id = i.workout_id GROUP BY w.date`, [], (err, rows) => {
    if (err) return res.status(400).json(err);
    res.json(rows);
  });
});

app.get('/stats', (req, res) => {
  db.all(`SELECT w.date, MAX(i.weight) as weight FROM items i JOIN workouts w ON i.workout_id = w.id WHERE i.weight > 0 GROUP BY w.date ORDER BY w.date ASC`, [], (err, rows) => { 
    if (err) return res.status(400).json(err); res.json(rows); 
  });
});

// Usa a porta que o Render mandar OU a 3001 se for local
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT} 🚀`));