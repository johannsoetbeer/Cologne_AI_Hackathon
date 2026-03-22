import pool from './db.js';

async function migrate() {
  try {
    await pool.query("ALTER TABLE generated_exams ADD COLUMN status TEXT DEFAULT 'pending'");
    console.log("Column added");
  } catch (err) {
    if (err.code === '42701') console.log("Column already exists");
    else console.error(err);
  }
  process.exit(0);
}
migrate();
