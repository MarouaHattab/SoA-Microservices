// const axios = require('axios');

// async function testGraphQLDatabaseIntegration() {
//   const baseURL = 'http://localhost:5000/graphql';

//   try {
//     console.log("1. Adding a Test Task via GraphQL");
//     const addTaskResponse = await axios.post(baseURL, {
//       query: `
//         mutation {
//           addTask(
//             title: "Database Integration Test"
//             description: "Verifying database through GraphQL"
//             completed: false
//             duration: 10
//           ) {
//             id
//             title
//             description
//             completed
//           }
//         }
//       `
//     });

//     const newTask = addTaskResponse.data.data.addTask;
//     console.log("   New Task Created:", newTask);

//     // Retrieve all tasks to confirm persistence
//     console.log("\n2. Retrieving All Tasks");
//     const tasksResponse = await axios.post(baseURL, {
//       query: `{
//         tasks {
//           id
//           title
//           description
//           completed
//         }
//       }`
//     });

//     console.log("   Total Tasks:", tasksResponse.data.data.tasks.length);
//     console.log("   Tasks:", JSON.stringify(tasksResponse.data.data.tasks, null, 2));

//     // Complete the task
//     console.log("\n3. Completing the Test Task");
//     const completeTaskResponse = await axios.post(baseURL, {
//       query: `
//         mutation {
//           completeTask(id: "${newTask.id}") {
//             id
//             completed
//           }
//         }
//       `
//     });

//     console.log("   Completed Task:", completeTaskResponse.data.data.completeTask);

//   } catch (error) {
//     console.error("GraphQL Database Test Failed:", 
//       error.response ? error.response.data : error.message
//     );
//   }
// }

// testGraphQLDatabaseIntegration();