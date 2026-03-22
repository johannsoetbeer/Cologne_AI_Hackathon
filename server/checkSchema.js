import fs from 'fs';
import pool from './db.js';

async function check() {
  const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'generated_exams'");
  fs.writeFileSync('../schema.json', JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
check();
