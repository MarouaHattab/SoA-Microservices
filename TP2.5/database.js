const sqlite3 = require('sqlite3').verbose();

// Connect to SQLite database
const db = new sqlite3.Database('./maBaseDeDonnees.sqlite', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS personnes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      adresse TEXT
    )`, (err) => {
      if (err) {
        console.error(err.message);
      } else {
        // Insert initial data with addresses
        const personnes = [
          { nom: 'Bob', adresse: '123 Main St' },
          { nom: 'Alice', adresse: '456 Oak Ave' },
          { nom: 'Charlie', adresse: '789 Pine Blvd' }
        ];
        
        // Check if table is empty before inserting initial data
        db.get("SELECT COUNT(*) as count FROM personnes", (err, row) => {
          if (err) {
            console.error(err.message);
          } else if (row.count === 0) {
            // Only insert if the table is empty
            personnes.forEach((personne) => {
              db.run(`INSERT INTO personnes (nom, adresse) VALUES (?, ?)`, [personne.nom, personne.adresse]);
            });
            console.log('Initial data inserted.');
          }
        });
      }
    });
  }
});

module.exports = db;