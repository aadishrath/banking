const fs = require('fs');
const path = require('path');
const { readDb, writeDb } = require('../lib/db');

const seedPath = path.join(__dirname, '..', 'data', 'db.json');

async function seedDb() {
  const existing = await readDb();

  if (existing.users.length > 0) {
    console.log('Database already contains users. Seed skipped.');
    return;
  }

  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  await writeDb(seed);
  console.log('Demo seed data inserted into Postgres.');
}

seedDb()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Database seed failed.');
    console.error(error);
    process.exit(1);
  });
