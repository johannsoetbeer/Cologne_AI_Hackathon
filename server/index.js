import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';
import pool from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

// ==========================================
// COURSES (Fächer)
// ==========================================

// GET all courses
app.get('/api/courses', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.courses ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/courses error:', err);
    res.status(500).json({ error: 'Fehler beim Laden der Fächer' });
  }
});

// POST create new course
app.post('/api/courses', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name ist erforderlich' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO public.courses (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/courses error:', err);
    res.status(500).json({ error: 'Fehler beim Erstellen des Fachs' });
  }
});

// DELETE course
app.delete('/api/courses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM public.knowledge WHERE course_id = $1', [id]);
    await pool.query('DELETE FROM public.generated_exams WHERE course_id = $1', [id]);
    const result = await pool.query('DELETE FROM public.courses WHERE id = $1 RETURNING *', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Fach nicht gefunden' });
    }
    res.json({ message: 'Fach erfolgreich gelöscht', deleted: result.rows[0] });
  } catch (err) {
    console.error('DELETE /api/courses error:', err);
    res.status(500).json({ error: 'Fehler beim Löschen des Fachs' });
  }
});

// ==========================================
// KNOWLEDGE (Wissensdatenbank)
// ==========================================

// GET knowledge entries for a course
app.get('/api/courses/:courseId/knowledge', async (req, res) => {
  const { courseId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM public.knowledge WHERE course_id = $1 ORDER BY id DESC',
      [courseId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/knowledge error:', err);
    res.status(500).json({ error: 'Fehler beim Laden der Wissensdatenbank' });
  }
});

// POST upload PDF to knowledge + forward to n8n
app.post('/api/courses/:courseId/knowledge/upload', upload.single('file'), async (req, res) => {
  const { courseId } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'Keine Datei hochgeladen' });
  }

  try {
    // Forward to n8n webhook
    const formData = new FormData();
    formData.append('course_id', courseId);
    formData.append('file_name', file.originalname); // Be explicit for n8n to use original filename
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const webhookUrl = process.env.N8N_WEBHOOK_KNOWLEDGE;
    console.log(`Sending file "${file.originalname}" to n8n: ${webhookUrl}`);

    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    if (!n8nResponse.ok) {
      throw new Error(`n8n Webhook Fehler: ${n8nResponse.status} ${n8nResponse.statusText}`);
    }

    const n8nData = await n8nResponse.text();
    let parsedN8n;
    try { parsedN8n = JSON.parse(n8nData); } catch { parsedN8n = { raw: n8nData }; }

    console.log('n8n response:', parsedN8n);

    // After n8n processes, reload knowledge from DB
    const result = await pool.query(
      'SELECT * FROM public.knowledge WHERE course_id = $1 ORDER BY id DESC',
      [courseId]
    );

    res.json({ 
      message: 'Datei erfolgreich hochgeladen und verarbeitet',
      n8n_response: parsedN8n,
      knowledge: result.rows 
    });
  } catch (err) {
    console.error('POST /api/knowledge/upload error:', err);
    res.status(500).json({ error: 'Fehler beim Hochladen: ' + err.message });
  }
});

// DELETE knowledge document
app.delete('/api/courses/:courseId/knowledge/:id', async (req, res) => {
  const { courseId, id } = req.params;
  try {
    const result = await pool.query('DELETE FROM public.knowledge WHERE id = $1 AND course_id = $2 RETURNING *', [id, courseId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Dokument nicht gefunden' });
    }
    res.json({ message: 'Dokument gelöscht', deleted: result.rows[0] });
  } catch (err) {
    console.error('DELETE /api/knowledge error:', err);
    res.status(500).json({ error: 'Fehler beim Löschen des Dokuments' });
  }
});

// ==========================================
// GENERATED EXAMS (Klausur-Generator)
// ==========================================

// GET generated exams for a course
app.get('/api/courses/:courseId/exams', async (req, res) => {
  const { courseId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM public.generated_exams WHERE course_id = $1 ORDER BY id DESC',
      [courseId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/exams error:', err);
    res.status(500).json({ error: 'Fehler beim Laden der Klausuren' });
  }
});

// POST generate exam via n8n
app.post('/api/courses/:courseId/exams/generate', async (req, res) => {
  const { courseId } = req.params;
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt ist erforderlich' });
  }

  try {
    const webhookUrl = process.env.N8N_WEBHOOK_GENERATOR;
    console.log(`Generating exam for course ${courseId}: "${prompt}"`);

    const payload = {
      prompt: prompt.trim(),
      course_id: parseInt(courseId)
    };

    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!n8nResponse.ok) {
      throw new Error(`n8n Webhook Fehler: ${n8nResponse.status} ${n8nResponse.statusText}`);
    }

    const n8nData = await n8nResponse.text();
    let parsedN8n;
    try { parsedN8n = JSON.parse(n8nData); } catch { parsedN8n = { raw: n8nData }; }

    console.log('n8n exam response:', parsedN8n);

    // Reload exams from DB
    const result = await pool.query(
      'SELECT * FROM public.generated_exams WHERE course_id = $1 ORDER BY id DESC',
      [courseId]
    );

    res.json({ 
      message: 'Klausur wird generiert',
      n8n_response: parsedN8n,
      exams: result.rows 
    });
  } catch (err) {
    console.error('POST /api/exams/generate error:', err);
    res.status(500).json({ error: 'Fehler beim Generieren: ' + err.message });
  }
});

// ==========================================
// FEEDBACK (Korrektur)
// ==========================================

// POST submit solved exam for feedback
app.post('/api/courses/:courseId/feedback', upload.single('file'), async (req, res) => {
  const { courseId } = req.params;
  const { exam_id } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'Keine Datei hochgeladen' });
  }
  if (!exam_id) {
    return res.status(400).json({ error: 'Keine Klausur ausgewählt' });
  }

  try {
    const formData = new FormData();
    formData.append('course_id', courseId);
    formData.append('exam_id', exam_id);
    if (req.body.original_latex) {
      formData.append('original_latex', req.body.original_latex);
    }
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const webhookUrl = process.env.N8N_WEBHOOK_FEEDBACK;
    console.log(`Submitting feedback for exam ${exam_id}, course ${courseId}`);

    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    if (!n8nResponse.ok) {
      throw new Error(`n8n Webhook Fehler: ${n8nResponse.status} ${n8nResponse.statusText}`);
    }

    const n8nData = await n8nResponse.text();
    let parsedN8n;
    try { parsedN8n = JSON.parse(n8nData); } catch { parsedN8n = { raw: n8nData }; }

    console.log('n8n feedback response:', parsedN8n);

    res.json({ 
      message: 'Feedback erhalten',
      feedback: parsedN8n 
    });
  } catch (err) {
    console.error('POST /api/feedback error:', err);
    res.status(500).json({ error: 'Fehler beim Erhalten des Feedbacks: ' + err.message });
  }
});

// ==========================================
// HEALTH
// ==========================================
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 University Acer API running on http://localhost:${PORT}`);
});
