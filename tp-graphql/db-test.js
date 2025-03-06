// const { Level } = require('level');
// const path = require('path');
// const fs = require('fs');

// async function debugLevelDatabase() {
//   const dbPath = path.join(__dirname, 'tasks-db');
  
//   console.log("Comprehensive Database Debugging");
  
//   // Check directory permissions
//   try {
//     fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
//     console.log("Database directory is readable and writable");
//   } catch (err) {
//     console.error("Permission issue with database directory:", err.message);
//   }

//   const db = new Level(dbPath, { 
//     valueEncoding: 'json',
//     // Additional options for debugging
//     createIfMissing: true,
//     errorIfExists: false
//   });

//   try {
//     // Explicitly open the database
//     await db.open();
//     console.log("\nDatabase opened successfully");

//     // Comprehensive database information
//     console.log("\nDatabase Diagnostic Information:");
    
//     // Check existing keys
//     console.log("\nExisting Database Entries:");
//     let entryCount = 0;
//     const entries = [];

//     for await (const [key, value] of db.iterator()) {
//       entryCount++;
//       entries.push({ key, value });
//     }

//     console.log(`Total Entries: ${entryCount}`);
//     if (entryCount > 0) {
//       console.log("Entries:", JSON.stringify(entries, null, 2));
//     }

//     // If no entries, add a test entry
//     if (entryCount === 0) {
//       console.log("\nNo entries found. Adding a test entry...");
//       await db.put('debug-test-key', {
//         message: 'Debug entry to verify database functionality',
//         timestamp: new Date().toISOString()
//       });
//       console.log("Test entry added successfully");
//     }

//   } catch (error) {
//     console.error("\nDatabase Debugging Error:", error);
//   } finally {
//     // Always close the database
//     await db.close();
//     console.log("\nDatabase closed");
//   }
// }

// // Catch any unhandled promise rejections
// process.on('unhandledRejection', (reason, promise) => {
//   console.error('Unhandled Rejection at:', promise, 'reason:', reason);
// });

// debugLevelDatabase();