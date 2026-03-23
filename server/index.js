import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';
import pool from './db.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

dotenv.config();

// ==========================================
// CLOUDINARY CONFIGURATION
// ==========================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const PORT = process.env.PORT || 3001;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

// Helper for n8n webhooks with fallback from production to test
async function callN8nWebhook(webhookUrl, payload, isMultipart = false, headers = {}) {
  if (!webhookUrl) {
    console.error('Webhook URL is missing in environment variables');
    throw new Error('Webhook URL not configured');
  }

  const tryCall = async (url) => {
    console.log(`Calling n8n: ${url}`);
    const options = {
      method: 'POST',
      body: isMultipart ? payload : JSON.stringify(payload),
    };
    if (!isMultipart) {
      options.headers = { 'Content-Type': 'application/json', ...headers };
    } else {
      options.headers = headers;
    }

    return await fetch(url, options);
  };

  let response = await tryCall(webhookUrl);

  // Fallback to -test URL if 404
  if (response.status === 404 && !webhookUrl.includes('-test/')) {
    const testUrl = webhookUrl.replace('/webhook/', '/webhook-test/');
    console.warn(`Production webhook returned 404, trying test webhook: ${testUrl}`);
    response = await tryCall(testUrl);
  }

  if (!response.ok) {
    throw new Error(`n8n Webhook Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.text();
  try {
    return JSON.parse(data);
  } catch (e) {
    return { raw: data };
  }
}

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
    res.status(500).json({ error: 'Error loading courses' });
  }
});

// POST create new course
app.post('/api/courses', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO public.courses (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/courses error:', err);
    res.status(500).json({ error: 'Error creating course' });
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
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json({ message: 'Course successfully deleted', deleted: result.rows[0] });
  } catch (err) {
    console.error('DELETE /api/courses error:', err);
    res.status(500).json({ error: 'Error deleting course' });
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
    res.status(500).json({ error: 'Error loading knowledge base' });
  }
});

// POST upload PDF to knowledge + forward to n8n
app.post('/api/courses/:courseId/knowledge/upload', upload.single('file'), async (req, res) => {
  const { courseId } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
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
    const parsedN8n = await callN8nWebhook(webhookUrl, formData, true, formData.getHeaders());

    console.log('n8n response:', parsedN8n);

    // After n8n processes, reload knowledge from DB
    const result = await pool.query(
      'SELECT * FROM public.knowledge WHERE course_id = $1 ORDER BY id DESC',
      [courseId]
    );

    res.json({
      message: 'File successfully uploaded and processed',
      n8n_response: parsedN8n,
      knowledge: result.rows
    });
  } catch (err) {
    console.error('POST /api/knowledge/upload error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// DELETE knowledge document
app.delete('/api/courses/:courseId/knowledge/:id', async (req, res) => {
  const { courseId, id } = req.params;
  try {
    const result = await pool.query('DELETE FROM public.knowledge WHERE id = $1 AND course_id = $2 RETURNING *', [id, courseId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ message: 'Document deleted', deleted: result.rows[0] });
  } catch (err) {
    console.error('DELETE /api/knowledge error:', err);
    res.status(500).json({ error: 'Error deleting document' });
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
    res.status(500).json({ error: 'Error loading exams' });
  }
});

// ───── Helper: Compile LaTeX to PDF using local pdflatex ─────
async function compileLatexToPdf(latexCode) {
  // Create a unique temp directory for this compilation
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exam-'));
  const texFile = path.join(tmpDir, 'exam.tex');
  const pdfFile = path.join(tmpDir, 'exam.pdf');
  const logFile = path.join(tmpDir, 'exam.log');

  try {
    fs.writeFileSync(texFile, latexCode, 'utf-8');

    // Run pdflatex twice (for references, TOC, etc.)
    const pdflatexPath = process.env.PDFLATEX_PATH || (process.platform === 'win32' ? 'pdflatex' : 'pdflatex');
    // Note: If 'pdflatex' is not in PATH, users can specify the full path in .env
    for (let pass = 1; pass <= 2; pass++) {
      try {
        execSync(
          `${pdflatexPath} -interaction=nonstopmode -output-directory="${tmpDir}" "${texFile}"`,
          { timeout: 30000, stdio: 'pipe' }
        );
        console.log(`  ✅ pdflatex pass ${pass} succeeded`);
      } catch (execErr) {
        // On the second pass, if it fails, we still check for PDF output
        if (pass === 2) {
          // nonstopmode may produce a PDF even with warnings
          if (!fs.existsSync(pdfFile)) {
            // Read the log for error details
            let logContent = '';
            if (fs.existsSync(logFile)) {
              logContent = fs.readFileSync(logFile, 'utf-8');
              // Extract only error lines
              const errorLines = logContent.split('\n').filter(line =>
                line.startsWith('!') || line.includes('Error') || line.includes('Undefined control sequence')
              ).slice(0, 10).join('\n');
              console.error('📄 LaTeX compilation errors:\n', errorLines);
              throw new Error(`LaTeX compilation failed:\n${errorLines}`);
            }
            throw new Error('LaTeX compilation failed: no PDF output produced.');
          }
        }
        // On first pass failure, continue to second pass anyway
        console.warn(`  ⚠️ pdflatex pass ${pass} had issues, continuing...`);
      }
    }

    if (!fs.existsSync(pdfFile)) {
      throw new Error('pdflatex did not produce a PDF file.');
    }

    // Read the PDF into a buffer
    const pdfBuffer = fs.readFileSync(pdfFile);
    console.log(`  📦 PDF generated: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
  } finally {
    // Clean up temp directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) { /* ignore cleanup errors */ }
  }
}

// ───── Helper: Upload PDF buffer to Cloudinary ─────
async function uploadPdfToCloudinary(pdfBuffer, publicId) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        public_id: publicId,
        folder: 'generated_exams',
        format: 'pdf',
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(pdfBuffer);
  });
}

// ───── Helper: Sanitize LaTeX code from AI output ─────
function sanitizeLatexCode(rawLatex) {
  let code = rawLatex;

  // 1. Remove markdown fences
  code = code.replace(/^```(?:latex|tex)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  // 2. Extract only from \documentclass to \end{document}
  const docClassMatch = code.match(/\\documentclass[\s\S]*\\end\{document\}/);
  if (docClassMatch) {
    code = docClassMatch[0];
  }

  // 3. Remove any packages NOT in our safe list (to prevent compilation errors)
  const safePackages = [
    'inputenc', 'fontenc', 'geometry', 'amsmath', 'amssymb',
    'amsfonts', 'graphicx', 'tabularx', 'booktabs', 'verbatim'
  ];

  // Replace problematic usepackage lines with a comment
  code = code.replace(/\\usepackage(?:\[([^\]]*)\])?\{([^}]+)\}/g, (match, opts, pkgStr) => {
    // If the regex somehow doesn't capture opts (opts is undefined but string is passed as pkgStr)
    if (typeof pkgStr !== 'string') {
      pkgStr = opts || '';
      opts = undefined;
    }
    const packages = pkgStr.split(',').map(p => p.trim());
    const filtered = packages.filter(p => safePackages.includes(p));
    if (filtered.length === 0) {
      console.warn(`  ⚠️ Removed unsupported package(s): ${pkgStr}`);
      return `% Removed unsupported: ${match}`;
    }
    if (filtered.length < packages.length) {
      const removed = packages.filter(p => !safePackages.includes(p));
      console.warn(`  ⚠️ Removed unsupported package(s): ${removed.join(', ')}`);
    }
    const optStr = opts ? `[${opts}]` : '';
    return `\\usepackage${optStr}{${filtered.join(', ')}}`;
  });

  // 4. Remove \cleardoublepage (not in base packages)
  code = code.replace(/\\cleardoublepage/g, '\\newpage');

  // 5. Replace common unicode math characters with LaTeX equivalents
  code = code.replace(/≥/g, '\\geq ');
  code = code.replace(/≤/g, '\\leq ');
  code = code.replace(/≠/g, '\\neq ');
  code = code.replace(/×/g, '\\times ');
  code = code.replace(/÷/g, '\\div ');
  code = code.replace(/±/g, '\\pm ');
  code = code.replace(/∈/g, '\\in ');
  code = code.replace(/∉/g, '\\notin ');
  code = code.replace(/⊂/g, '\\subset ');
  code = code.replace(/⊃/g, '\\supset ');
  code = code.replace(/∞/g, '\\infty ');
  code = code.replace(/≈/g, '\\approx ');
  code = code.replace(/≡/g, '\\equiv ');
  code = code.replace(/→/g, '\\rightarrow ');
  code = code.replace(/←/g, '\\leftarrow ');
  code = code.replace(/⇒/g, '\\Rightarrow ');
  code = code.replace(/⇔/g, '\\Leftrightarrow ');
  code = code.replace(/∝/g, '\\propto ');
  code = code.replace(/°/g, '^\\circ ');

  // 6. Fix common issues: close document properly
  if (!code.includes('\\end{document}')) {
    code += '\n\\end{document}\n';
  }

  return code.trim();
}

// POST generate exam: extract PDF text → AI LaTeX generation → compile local PDF → upload Cloudinary
app.post('/api/courses/:courseId/exams/generate', async (req, res) => {
  const { courseId } = req.params;
  const { prompt, fileName } = req.body;

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'sk-PASTE_YOUR_KEY_HERE') {
    return res.status(500).json({ error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in .env' });
  }

  // Validate Cloudinary configuration
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return res.status(500).json({ error: 'Cloudinary not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env' });
  }

  try {
    // ───── Step 1: Fetch all knowledge PDFs and Course Name from DB ─────
    const courseResult = await pool.query(
      'SELECT name FROM public.courses WHERE id = $1',
      [courseId]
    );
    const courseName = courseResult.rows[0]?.name || `Course ${courseId}`;

    const knowledgeResult = await pool.query(
      'SELECT id, file_name, url FROM public.knowledge WHERE course_id = $1 ORDER BY id ASC',
      [courseId]
    );

    if (knowledgeResult.rows.length === 0) {
      return res.status(400).json({ error: 'No knowledge documents found for this course. Upload PDFs first.' });
    }

    console.log(`📚 Found ${knowledgeResult.rows.length} knowledge document(s) for course ${courseId}`);

    // ───── Step 2: Download PDFs from Cloudinary & extract text ─────
    const { PDFParse } = await import('pdf-parse');
    const extractedTexts = [];

    for (const doc of knowledgeResult.rows) {
      if (!doc.url) {
        console.warn(`⚠️ Skipping document "${doc.file_name}" — no URL`);
        continue;
      }

      try {
        console.log(`📄 Downloading: ${doc.file_name} from ${doc.url}`);
        const pdfResponse = await fetch(doc.url);
        if (!pdfResponse.ok) {
          console.warn(`⚠️ Failed to download ${doc.file_name}: ${pdfResponse.status}`);
          continue;
        }

        const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
        const parser = new PDFParse({ data: pdfBuffer });
        const pdfData = await parser.getText();
        await parser.destroy();

        if (pdfData.text && pdfData.text.trim().length > 0) {
          extractedTexts.push({
            fileName: doc.file_name,
            text: pdfData.text.trim()
          });
          console.log(`✅ Extracted ${pdfData.text.length} chars from ${doc.file_name}`);
        } else {
          console.warn(`⚠️ No text extracted from ${doc.file_name}`);
        }
      } catch (pdfErr) {
        console.error(`❌ Error processing ${doc.file_name}:`, pdfErr.message);
      }
    }

    if (extractedTexts.length === 0) {
      return res.status(400).json({ error: 'Could not extract text from any of the uploaded PDFs. Make sure they contain selectable text.' });
    }

    // ───── Step 3: Build the combined knowledge context ─────
    const knowledgeContext = extractedTexts
      .map((doc, i) => `--- Document ${i + 1}: "${doc.fileName}" ---\n${doc.text}`)
      .join('\n\n');

    // ───── Step 4: Call OpenAI to generate LaTeX exam ─────
    const userInstructions = prompt ? prompt.trim() : 'General exam covering all topics.';

    // IMPROVED PROMPT: Template-based approach with strict package restrictions
    const systemPrompt = `You are an expert university professor and LaTeX typesetter.
Your ONLY job: create a NEW exam from the provided course materials.

CONTENT RULES:
1. NO SOLUTIONS — only questions with blank space (\\vspace{5cm}) for answers.
2. MONOLINGUAL — match the language of the source documents exactly. If the source is German, ALL text must be German. If English, ALL English.
3. NO HALLUCINATIONS — do NOT invent professor names, dates, or course codes unless they appear in the source material.
4. Create ORIGINAL questions testing the same concepts — do NOT copy questions from the source.
5. Include a point value for each question/sub-question.
6. Include a grading table at the top.

LATEX RULES (CRITICAL — violations cause compilation failure):
7. You MUST use EXACTLY this document preamble — do NOT add ANY other \\usepackage commands:

\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\geometry{left=2.5cm,right=2.5cm,top=2cm,bottom=2cm}
\\usepackage{amsmath,amssymb}

8. DO NOT use these packages (they will cause errors): fancyhdr, enumitem, extramarks, babel, listings, tikz, pgfplots, minted, tcolorbox, mdframed, xcolor, hyperref.
9. For lists use \\begin{enumerate} or \\begin{itemize} WITHOUT any optional arguments (no [label=...], no [a)], etc.).
10. For code snippets use \\begin{verbatim}...\\end{verbatim} — do NOT use listings or minted.
11. Use \\subsection*{} for questions, NOT \\section*{}.
12. Use \\textbf{} for bold, \\textit{} for italic.
13. For the grading table, use the basic tabular environment.
14. DO NOT use \\cleardoublepage — use \\newpage instead.
15. Escape special characters: \\%, \\&, \\_, \\#, \\{ \\} outside of math/verbatim. UNESCAPED UNDERSCORES '_' OUTSIDE MATH MODE WILL FATALLY CRASH THE COMPILER.
16. STRICT: DO NOT use raw unicode math characters (like ≥, ≤, ×, ≠). ALWAYS use standard LaTeX math commands (\\geq, \\leq, \\times, \\neq).
17. Ensure strict mathematical environments: every '_' or '^' must be enclosed in '$ ... $', '\\[ ... \\]' or a math environment. Never leave them floating.

OUTPUT FORMAT:
- Return ONLY raw LaTeX.
- Start with \\documentclass, end with \\end{document}.
- No markdown fences, no JSON wrapping, no commentary.`;

    const userPrompt = `Here are the course materials for the course "${courseName}" (DO NOT copy questions from these, create new ones):

${knowledgeContext}

---

INSTRUCTIONS FOR THIS EXAM (Topic Focus, Difficulty, Specifics):
${userInstructions}

IMPORTANT: The exam must be titled for the course "${courseName}".
Generate the LaTeX exam now.`;

    console.log(`🤖 Sending ${knowledgeContext.length} chars of context to OpenAI...`);

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      const aiErr = await aiResponse.text();
      console.error('OpenAI API error:', aiErr);
      throw new Error(`AI generation failed: ${aiResponse.status} ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    let latexCode = aiData.choices?.[0]?.message?.content || '';

    // Sanitize the LaTeX code (remove unsafe packages, fix common issues)
    latexCode = sanitizeLatexCode(latexCode);

    if (!latexCode.includes('\\documentclass')) {
      throw new Error('AI did not return valid LaTeX code.');
    }

    console.log(`✅ Generated ${latexCode.length} chars of LaTeX code`);

    // ───── Step 5: Compile LaTeX → PDF locally ─────
    console.log('📐 Compiling LaTeX to PDF...');
    let pdfBuffer;
    try {
      pdfBuffer = await compileLatexToPdf(latexCode);
    } catch (compileErr) {
      console.error('❌ LaTeX compilation failed:', compileErr.message);
      // Return the LaTeX code so the user can debug, but still save it with no URL
      const dbResult = await pool.query(
        "INSERT INTO public.generated_exams (course_id, file_name, status) VALUES ($1, $2, 'failed') RETURNING *",
        [courseId, fileName ? fileName.trim() : null]
      );
      const result = await pool.query(
        'SELECT * FROM public.generated_exams WHERE course_id = $1 ORDER BY id DESC',
        [courseId]
      );
      return res.status(500).json({
        error: 'LaTeX compilation failed. The AI-generated code had errors.',
        compilation_error: compileErr.message,
        latex_code: latexCode,
        exams: result.rows,
      });
    }

    // ───── Step 6: Upload PDF to Cloudinary ─────
    console.log('☁️  Uploading PDF to Cloudinary...');
    const safeName = (fileName || `Exam_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const cloudinaryResult = await uploadPdfToCloudinary(pdfBuffer, `exam_${safeName}_${Date.now()}`);
    const pdfUrl = cloudinaryResult.secure_url;
    console.log(`✅ Uploaded to Cloudinary: ${pdfUrl}`);

    // ───── Step 7: Setup Solution variables ─────
    let solutionUrl = null;

    // ───── Step 8: Generate Sample Solution (Musterlösung) ─────
    console.log(`🤖 Generating sample solution for exam ${safeName}...`);
    try {
      const solutionSystemPrompt = `You are an expert university professor and LaTeX typesetter.
Your ONLY job: write the SAMPLE SOLUTION (Musterlösung) for the provided LaTeX exam.

CONTENT RULES:
1. YOU MUST include the EXACT task descriptions from the original exam text.
2. Directly below each task description, provide the detailed, correct solution and the allocated points.
3. MONOLINGUAL — match the language of the provided exam exactly.
4. NO HALLUCINATIONS — stick to the facts for the solutions.

LATEX RULES (CRITICAL — violations cause compilation failure):
5. You MUST use EXACTLY this document preamble — do NOT add ANY other \\usepackage commands:

\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\geometry{left=2.5cm,right=2.5cm,top=2cm,bottom=2cm}
\\usepackage{amsmath,amssymb}

6. DO NOT use fancyhdr, enumitem, extramarks, babel, listings, tikz, pgfplots, minted, tcolorbox, mdframed, hyperref, xcolor.
7. For lists use \\begin{enumerate} or \\begin{itemize} WITHOUT any optional arguments.
8. For code snippets use \\begin{verbatim}...\\end{verbatim}.
9. DO NOT use \\cleardoublepage — use \\newpage instead.
10. Escape special characters: \\%, \\&, \\_, \\#, \\{ \\} outside of math/verbatim. UNESCAPED UNDERSCORES '_' OUTSIDE MATH MODE WILL FATALLY CRASH THE COMPILER.
11. STRICT: DO NOT use raw unicode math characters (like ≥, ≤, ×, ≠). ALWAYS use standard LaTeX math commands (\\geq, \\leq, \\times, \\neq).
12. Ensure strict mathematical environments: every '_' or '^' must be enclosed in '$ ... $', '\\[ ... \\]' or a math environment. Never leave them floating.

OUTPUT FORMAT:
- Return ONLY raw LaTeX.
- Start with \\documentclass, end with \\end{document}.
- No markdown fences, no JSON wrapping, no commentary.`;

      const solutionUserPrompt = `Here is the EXACT generated exam LaTeX code:

${latexCode}

---

Write the complete Sample Solution (Musterlösung) LaTeX document now. Make sure to clearly mark solutions (e.g., using \\textbf{Lösung:...} - DO NOT USE COLORS).`;

      const solResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: solutionSystemPrompt },
            { role: 'user', content: solutionUserPrompt },
          ],
          temperature: 0.5,
          max_tokens: 8000,
        }),
      });

      if (!solResponse.ok) {
        throw new Error(`OpenAI API failed on solution: ${solResponse.status}`);
      }

      const solData = await solResponse.json();
      let solLatex = solData.choices?.[0]?.message?.content || '';
      solLatex = sanitizeLatexCode(solLatex);

      if (!solLatex.includes('\\documentclass')) {
        throw new Error('AI did not return valid LaTeX code for solution.');
      }

      console.log(`✅ Generated ${solLatex.length} chars of Solution LaTeX code`);
      console.log('📐 Compiling Solution LaTeX to PDF...');
      const solPdfBuffer = await compileLatexToPdf(solLatex);

      console.log('☁️  Uploading Solution PDF to Cloudinary...');
      const solCloudinaryResult = await uploadPdfToCloudinary(solPdfBuffer, `solution_${safeName}_${Date.now()}`);
      solutionUrl = solCloudinaryResult.secure_url;
      console.log(`✅ Uploaded Solution to Cloudinary: ${solutionUrl}`);
    } catch (solErr) {
      console.error('❌ Failed to generate/upload sample solution:', solErr.message);
      // We don't fail the whole API request, so the user at least gets the Exam.
    }

    // ───── Step 9: Insert exam record into DB with URL & Solution URL ─────
    const dbResult = await pool.query(
      "INSERT INTO public.generated_exams (course_id, file_name, url, evaluation_url, status) VALUES ($1, $2, $3, $4, 'ready') RETURNING *",
      [courseId, fileName ? fileName.trim() : safeName, pdfUrl, solutionUrl]
    );
    const newExam = dbResult.rows[0];
    console.log(`✅ Exam saved to DB: id=${newExam.id}, url=${pdfUrl}`);

    // Return result
    const result = await pool.query(
      'SELECT * FROM public.generated_exams WHERE course_id = $1 ORDER BY id DESC',
      [courseId]
    );

    res.json({
      message: 'Exam generated, compiled to PDF, and uploaded successfully!',
      exam: newExam,
      exams: result.rows,
    });
  } catch (err) {
    console.error('POST /api/exams/generate error:', err);
    res.status(500).json({ error: 'Generation failed: ' + err.message });
  }
});

// DELETE generated exam
app.delete('/api/courses/:courseId/exams/:examId', async (req, res) => {
  const { courseId, examId } = req.params;
  try {
    const result = await pool.query('DELETE FROM public.generated_exams WHERE id = $1 AND course_id = $2 RETURNING *', [examId, courseId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    res.json({ message: 'Exam deleted', deleted: result.rows[0] });
  } catch (err) {
    console.error('DELETE /api/exams error:', err);
    res.status(500).json({ error: 'Error deleting exam' });
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
    return res.status(400).json({ error: 'No file uploaded' });
  }
  if (!exam_id) {
    return res.status(400).json({ error: 'No exam selected' });
  }

  try {
    // Fetch exam URL and existing evaluation_url (e.g. sample solution) from DB
    const examResult = await pool.query('SELECT url, evaluation_url FROM public.generated_exams WHERE id = $1', [exam_id]);
    const { url, evaluation_url } = examResult.rows[0] || {};

    const formData = new FormData();
    formData.append('url', url || '');
    formData.append('evaluation_url', evaluation_url || '');

    // The ONLY binary field: the student's solution
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const webhookUrl = process.env.N8N_WEBHOOK_FEEDBACK;
    const parsedN8n = await callN8nWebhook(webhookUrl, formData, true, formData.getHeaders());

    console.log('n8n feedback response:', parsedN8n);

    res.json({
      message: 'Feedback received',
      feedback: parsedN8n
    });
  } catch (err) {
    console.error('POST /api/feedback error:', err);
    res.status(500).json({ error: 'Error receiving feedback: ' + err.message });
  }
});

// ==========================================
// FLASHCARDS
// ==========================================

app.post('/api/courses/:courseId/flashcards', async (req, res) => {
  const { courseId } = req.params;

  try {
    const webhookUrl = process.env.N8N_WEBHOOK_FLASHCARDS;
    if (!webhookUrl) {
      return res.status(500).json({ error: 'Flashcards webhook not configured' });
    }

    const payload = {
      course_id: parseInt(courseId)
    };

    const parsedN8n = await callN8nWebhook(webhookUrl, payload);
    const csvData = parsedN8n.raw || parsedN8n.data || parsedN8n.csv;

    res.json({ csvData: typeof csvData === 'string' ? csvData : JSON.stringify(parsedN8n) });
  } catch (err) {
    console.error('POST /api/flashcards error:', err);
    res.status(500).json({ error: 'Error generating flashcards: ' + err.message });
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
  console.log(`🚀 ExamAI API running on http://localhost:${PORT}`);
});
