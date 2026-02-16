require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const sqlPath = path.resolve(__dirname, '..', 'schema.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('schema.sql not found at', sqlPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    multipleStatements: true,
    // Don't set database here because schema.sql creates the database
  };

  console.log('Connecting to MySQL with', { host: config.host, user: config.user, port: config.port });
  try {
    const conn = await mysql.createConnection(config);
    console.log('Connected — running schema.sql (this may take a few seconds)');
    await conn.query(sql);
    console.log('Schema import complete.');
    await conn.end();
  } catch (err) {
    console.error('Failed to import schema:', err.message);
    process.exit(2);
  }
}

run();
