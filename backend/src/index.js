require('dotenv').config();
const app  = require('./app');
const pool = require('./db/pool');

const PORT = parseInt(process.env.PORT, 10) || 5000;

async function start() {
  // Verify DB connectivity before accepting traffic
  try {
    await pool.query('SELECT 1');
    console.log('Database connection verified.');
  } catch (err) {
    console.error('Cannot connect to database:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Claims Portal API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

start();
