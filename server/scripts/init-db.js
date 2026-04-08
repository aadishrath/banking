const { spawn } = require('child_process');
const path = require('path');

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, scriptName)], {
      stdio: 'inherit'
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${scriptName} exited with code ${code}`));
    });

    child.on('error', reject);
  });
}

runScript('migrate-db.js')
  .then(() => runScript('seed-db.js'))
  .then(() => {
    console.log('Postgres schema is ready and demo data is seeded if the database was empty.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database initialization failed.');
    console.error(error);
    process.exit(1);
  });
