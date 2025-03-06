// const { Level } = require('level');
// const path = require('path');
// const fs = require('fs');

// async function debugLevelDatabase() {
//   const dbPath = path.join(__dirname, 'tasks-db');
  
//   console.log("Database Debugging Information:");
  
//   // Check database directory existence
//   console.log("\n1. Database Directory Check:");
//   if (fs.existsSync(dbPath)) {
//     console.log(`   Directory exists: ${dbPath}`);
    
//     // Check directory contents
//     const files = fs.readdirSync(dbPath);
//     console.log("   Directory contents:", files);
//   } else {
//     console.log("   Database directory does not exist!");
//   }

//   const db = new Level(dbPath, { valueEncoding: 'json' });

//   try {
//     // Database size and key count
//     console.log("\n2. Database Content Analysis:");
//     let keyCount = 0;
//     const allRecords = [];

//     for await (const [key, value] of db.iterator()) {
//       keyCount++;
//       allRecords.push({ key, value });
//     }

//     console.log(`   Total Records: ${keyCount}`);
//     console.log("   All Records:", JSON.stringify(allRecords, null, 2));

//   } catch (error) {
//     console.error("Database Debug Error:", error);
//   } finally {
//     await db.close();
//   }
// }

// debugLevelDatabase();