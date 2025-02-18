const express = require('express');
const db = require('./database');
const app = express();
app.use(express.json());
const PORT = 3000;

app.get('/', (req, res) => {
  res.json("Registre de personnes! Choisissez le bon routage!")
})

// Get all persons
app.get('/personnes', (req, res) => {
  db.all("SELECT * FROM personnes", [], (err, rows) => {
    if (err) {
      res.status(400).json({
        "error": err.message
      });
      return;
    }
    res.json({
      "message": "success",
      "data": rows
    });
  });
});

// Get person by ID
app.get('/personnes/:id', (req, res) => {
  const id = req.params.id;
  db.get("SELECT * FROM personnes WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(400).json({
        "error": err.message
      });
      return; 
    }
    if (!row) {
      res.status(404).json({
        "message": "Person not found"
      });
      return;
    }
    res.json({
      "message": "success",
      "data": row 
    });
  });
});

// Create a new person
app.post('/personnes', (req, res) => {
  const { nom, adresse } = req.body;
  if (!nom) {
    res.status(400).json({
      "error": "Name is required"
    });
    return;
  }
  
  db.run(`INSERT INTO personnes (nom, adresse) VALUES (?, ?)`, [nom, adresse || null], function(err) {
    if (err) {
      res.status(400).json({
        "error": err.message
      });
      return; 
    }
    res.status(201).json({
      "message": "success",
      "data": {
        id: this.lastID 
      }
    });
  });
});

// Update a person
app.put('/personnes/:id', (req, res) => {
  const id = req.params.id;
  const { nom, adresse } = req.body;
  
  // First check if the person exists
  db.get("SELECT * FROM personnes WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(400).json({
        "error": err.message
      });
      return;
    }
    if (!row) {
      res.status(404).json({
        "message": "Person not found"
      });
      return;
    }
    
    // If the person exists, update their information
    const nomToUpdate = nom || row.nom;
    const adresseToUpdate = adresse !== undefined ? adresse : row.adresse;
    
    db.run(`UPDATE personnes SET nom = ?, adresse = ? WHERE id = ?`, 
           [nomToUpdate, adresseToUpdate, id], function(err) {
      if (err) {
        res.status(400).json({
          "error": err.message
        });
        return; 
      }
      
      if (this.changes === 0) {
        res.status(404).json({
          "message": "No person found with that ID"
        });
        return;
      }
      
      res.json({
        "message": "success",
        "changes": this.changes
      });
    });
  });
});

// Delete a person
app.delete('/personnes/:id', (req, res) => {
  const id = req.params.id;
  
  db.run(`DELETE FROM personnes WHERE id = ?`, id, function(err) {
    if (err) {
      res.status(400).json({
        "error": err.message
      });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({
        "message": "No person found with that ID"
      });
      return;
    }
    
    res.json({
      "message": "success",
      "changes": this.changes
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


// const express = require('express');
// const session = require('express-session');
// const Keycloak = require('keycloak-connect');
// const db = require('./database');
// const app = express();
// app.use(express.json());
// const PORT = 3000;

// // Session configuration for Keycloak
// const memoryStore = new session.MemoryStore();
// app.use(session({
//   secret: 'api-secret',
//   resave: false,
//   saveUninitialized: true,
//   store: memoryStore
// }));

// // Keycloak configuration
// const keycloak = new Keycloak({ store: memoryStore }, './keycloak-config.json');
// app.use(keycloak.middleware());

// // Root endpoint
// app.get('/', (req, res) => {
//   res.json("Registre de personnes! Choisissez le bon routage!")
// });

// // Secure endpoint example
// app.get('/secure', keycloak.protect(), (req, res) => {
//   res.json({ message: 'Vous êtes authentifié !' });
// });

// // Get all persons - protected by Keycloak
// app.get('/personnes', keycloak.protect(), (req, res) => {
//   db.all("SELECT * FROM personnes", [], (err, rows) => {
//     if (err) {
//       res.status(400).json({
//         "error": err.message
//       });
//       return;
//     }
//     res.json({
//       "message": "success",
//       "data": rows
//     });
//   });
// });

// // Get person by ID - protected by Keycloak
// app.get('/personnes/:id', keycloak.protect(), (req, res) => {
//   const id = req.params.id;
//   db.get("SELECT * FROM personnes WHERE id = ?", [id], (err, row) => {
//     if (err) {
//       res.status(400).json({
//         "error": err.message
//       });
//       return; 
//     }
//     if (!row) {
//       res.status(404).json({
//         "message": "Person not found"
//       });
//       return;
//     }
//     res.json({
//       "message": "success",
//       "data": row 
//     });
//   });
// });

// // Create a new person - protected by Keycloak
// app.post('/personnes', keycloak.protect(), (req, res) => {
//   const { nom, adresse } = req.body;
//   if (!nom) {
//     res.status(400).json({
//       "error": "Name is required"
//     });
//     return;
//   }
  
//   db.run(`INSERT INTO personnes (nom, adresse) VALUES (?, ?)`, [nom, adresse || null], function(err) {
//     if (err) {
//       res.status(400).json({
//         "error": err.message
//       });
//       return; 
//     }
//     res.status(201).json({
//       "message": "success",
//       "data": {
//         id: this.lastID 
//       }
//     });
//   });
// });

// // Update a person - protected by Keycloak
// app.put('/personnes/:id', keycloak.protect(), (req, res) => {
//   const id = req.params.id;
//   const { nom, adresse } = req.body;
  
//   // First check if the person exists
//   db.get("SELECT * FROM personnes WHERE id = ?", [id], (err, row) => {
//     if (err) {
//       res.status(400).json({
//         "error": err.message
//       });
//       return;
//     }
//     if (!row) {
//       res.status(404).json({
//         "message": "Person not found"
//       });
//       return;
//     }
    
//     // If the person exists, update their information
//     const nomToUpdate = nom || row.nom;
//     const adresseToUpdate = adresse !== undefined ? adresse : row.adresse;
    
//     db.run(`UPDATE personnes SET nom = ?, adresse = ? WHERE id = ?`, 
//            [nomToUpdate, adresseToUpdate, id], function(err) {
//       if (err) {
//         res.status(400).json({
//           "error": err.message
//         });
//         return; 
//       }
      
//       if (this.changes === 0) {
//         res.status(404).json({
//           "message": "No person found with that ID"
//         });
//         return;
//       }
      
//       res.json({
//         "message": "success",
//         "changes": this.changes
//       });
//     });
//   });
// });

// // Delete a person - protected by Keycloak
// app.delete('/personnes/:id', keycloak.protect(), (req, res) => {
//   const id = req.params.id;
  
//   db.run(`DELETE FROM personnes WHERE id = ?`, id, function(err) {
//     if (err) {
//       res.status(400).json({
//         "error": err.message
//       });
//       return;
//     }
    
//     if (this.changes === 0) {
//       res.status(404).json({
//         "message": "No person found with that ID"
//       });
//       return;
//     }
    
//     res.json({
//       "message": "success",
//       "changes": this.changes
//     });
//   });
// });

// // Start the server
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });