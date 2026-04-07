const { ensureDbReady } = require('../lib/db');

ensureDbReady()
  .then(() => {
    console.log('Postgres schema is ready and demo data is seeded if the database was empty.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database initialization failed.');
    console.error(error);
    process.exit(1);
  });
