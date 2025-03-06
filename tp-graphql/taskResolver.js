let tasks = [
    {
      id: '1',
      title: 'Développement Front-end pour Site E-commerce',
      description: 'Créer une interface utilisateur réactive en utilisant React et Redux pour un site e-commerce.',
      completed: false,
      duration: 40, 
    },
    {
      id: '2',
      title: 'Développement Back-end pour Authentification Utilisateur',
      description: "Implémenter un système d'authentification et d'autorisation pour une application web en utilisant Node.js, Express, et Passport.js",
      completed: false,
      duration: 35,
    },
    {
      id: '3',
      title: 'Tests et Assurance Qualité pour Application Web',
      description: 'Développer et exécuter des plans de test et des cas de test complets.',
      completed: false,
      duration: 20,
    },
  ];
  
  const taskResolver = {
    Query: {
      task: (_, { id }) => tasks.find(task => task.id === id),
      tasks: () => tasks,
    },
    
    Mutation: {
      addTask: (_, { title, description, completed, duration }) => {
        const task = {
          id: String(tasks.length + 1),
          title,
          description,
          completed,
          duration, 
        };
        tasks.push(task);
        return task;
      },
      completeTask: (_, { id }) => {
        const taskIndex = tasks.findIndex(task => task.id === id);
        if (taskIndex !== -1) {
          tasks[taskIndex].completed = true;
          return tasks[taskIndex];
        }
        return null;
      },
      changeDescription: (_, { id, description }) => {
        const taskIndex = tasks.findIndex(task => task.id === id);
        if (taskIndex !== -1) {
          tasks[taskIndex].description = description;
          return tasks[taskIndex];
        }
        return null;
      },
      deleteTask: (_, { id }) => {
        const taskIndex = tasks.findIndex(task => task.id === id);
        if (taskIndex !== -1) {
          const deletedTask = tasks.splice(taskIndex, 1)[0];
          return deletedTask;
        }
        return null;
      },
    },
  };
  
  module.exports = taskResolver;
  

// taskResolver.js
// const { Level } = require('level');
// const path = require('path');

// // Initialize Level database
// const db = new Level(path.join(__dirname, 'tasks-db'), { valueEncoding: 'json' });

// const taskResolver = {
//   Query: {
//     task: async (_, { id }) => {
//       try {
//         return await db.get(id);
//       } catch (err) {
//         if (err.notFound) {
//           return null;
//         }
//         throw err;
//       }
//     },
//     tasks: async () => {
//       const tasks = [];
//       for await (const [key, value] of db.iterator()) {
//         tasks.push({ id: key, ...value });
//       }
//       return tasks;
//     }
//   },
//   Mutation: {
//     addTask: async (_, { title, description, completed, duration }) => {
//       const id = String(Date.now()); // Use timestamp as unique ID
//       const task = { title, description, completed, duration };
//       await db.put(id, task);
//       return { id, ...task };
//     },
//     completeTask: async (_, { id }) => {
//       try {
//         const task = await db.get(id);
//         task.completed = true;
//         await db.put(id, task);
//         return { id, ...task };
//       } catch (err) {
//         return null;
//       }
//     },
//     changeDescription: async (_, { id, newDescription }) => {
//       try {
//         const task = await db.get(id);
//         task.description = newDescription;
//         await db.put(id, task);
//         return { id, ...task };
//       } catch (err) {
//         return null;
//       }
//     },
//     deleteTask: async (_, { id }) => {
//       try {
//         const task = await db.get(id);
//         await db.del(id);
//         return { id, ...task };
//       } catch (err) {
//         return null;
//       }
//     }
//   }
// };

// // Alternative method to check if database is empty
// async function initializeDatabase() {
//   const initialTasks = [
//     {
//       title: 'Développement Front-end pour Site E-commerce',
//       description: 'Créer une interface utilisateur réactive en utilisant React et Redux pour un site e-commerce.',
//       completed: false,
//       duration: 30
//     },
//     {
//       title: 'Développement Back-end pour Authentification Utilisateur',
//       description: "Implémenter un système d'authentification et d'autorisation pour une application web en utilisant Node.js, Express, et Passport.js",
//       completed: false,
//       duration: 25
//     }
//   ];

//   try {
//     // Use iterator to check if database is empty
//     let isEmpty = true;
//     for await (const [key] of db.iterator({ limit: 1 })) {
//       isEmpty = false;
//       break;
//     }

//     // If database is empty, add initial tasks
//     if (isEmpty) {
//       for (const task of initialTasks) {
//         const id = String(Date.now() + Math.random());
//         await db.put(id, task);
//         console.log(`Added initial task: ${task.title}`);
//       }
//     }
//   } catch (err) {
//     console.error('Error initializing database:', err);
//   }
// }

// // Initialize database when resolver is first loaded
// initializeDatabase();

// module.exports = taskResolver;