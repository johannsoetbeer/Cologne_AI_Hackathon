const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'server', 'index.js');
const original = fs.readFileSync(targetFile, 'utf-8');

const startMarker = '// POST generate exam: extract PDF text';
const endMarker = '// ==========================================\n// FEEDBACK (Korrektur)';

const startIndex = original.indexOf(startMarker);
const endIndex = original.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error('Markers not found');
    process.exit(1);
}

const before = original.substring(0, startIndex);
const after = original.substring(endIndex);

const newEndpoint = `// ───── Helper: Compile LaTeX to PDF using local pdflatex ─────
async function compileLatexToPdf(latexCode) {
  // Create a unique temp directory for this compilation
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exam-'));
  const texFile = path.join(tmpDir, 'exam.tex');
  const pdfFile = path.join(tmpDir, 'exam.pdf');
  const logFile = path.join(tmpDir, 'exam.log');

  try {
    fs.writeFileSync(texFile, latexCode, 'utf-8');

    // Run pdflatex twice (for references, TOC, etc.)
    for (let pass = 1; pass <= 2; pass++) {
      try {
        execSync(
          \`pdflatex -interaction=nonstopmode -halt-on-error -output-directory="\${tmpDir}" "\${texFile}"\`,
          { timeout: 30000, stdio: 'pipe' }
        );
        console.log(\`  ✅ pdflatex pass \${pass} succeeded\`);
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
              const errorLines = logContent.split('\\n').filter(line =>
                line.startsWith('!') || line.includes('Error') || line.includes('Undefined control sequence')
              ).slice(0, 10).join('\\n');
              console.error('📄 LaTeX compilation errors:\\n', errorLines);
              throw new Error(\`LaTeX compilation failed:\\n\${errorLines}\`);
            }
            throw new Error('LaTeX compilation failed: no PDF output produced.');
          }
        }
        // On first pass failure, continue to second pass anyway
        console.warn(\`  ⚠️ pdflatex pass \${pass} had issues, continuing...\`);
      }
    }

    if (!fs.existsSync(pdfFile)) {
      throw new Error('pdflatex did not produce a PDF file.');
    }

    // Read the PDF into a buffer
    const pdfBuffer = fs.readFileSync(pdfFile);
    console.log(\`  📦 PDF generated: \${pdfBuffer.length} bytes\`);
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
  code = code.replace(/^\`\`\`(?:latex|tex)?\\s*\\n?/i, '').replace(/\\n?\`\`\`\\s*$/i, '');

  // 2. Extract only from \\documentclass to \\end{document}
  const docClassMatch = code.match(/\\\\documentclass[\\s\\S]*\\\\end\\{document\\}/);
  if (docClassMatch) {
    code = docClassMatch[0];
  }

  // 3. Remove any packages NOT in our safe list (to prevent compilation errors)
  const safePackages = [
    'inputenc', 'fontenc', 'geometry', 'amsmath', 'amssymb',
    'amsfonts', 'graphicx', 'tabularx', 'booktabs', 'verbatim',
    'listings', 'xcolor', 'hyperref', 'url', 'mathtools',
  ];

  // Replace problematic usepackage lines with a comment
  code = code.replace(/\\\\usepackage(?:\\([^\\\\]*\\))?\\{([^}]+)\\}/g, (match, opts, pkgStr) => {
    const packages = pkgStr.split(',').map(p => p.trim());
    const filtered = packages.filter(p => safePackages.includes(p));
    if (filtered.length === 0) {
      console.warn(\`  ⚠️ Removed unsupported package(s): \${pkgStr}\`);
      return \`% Removed unsupported: \${match}\`;
    }
    if (filtered.length < packages.length) {
      const removed = packages.filter(p => !safePackages.includes(p));
      console.warn(\`  ⚠️ Removed unsupported package(s): \${removed.join(', ')}\`);
    }
    const optStr = opts ? \`[\${opts}]\` : '';
    return \`\\\\usepackage\${optStr}{\${filtered.join(', ')}}\`;
  });

  // 4. Remove \\cleardoublepage (not in base packages)
  code = code.replace(/\\\\cleardoublepage/g, '\\\\newpage');

  // 5. Fix common issues: close document properly
  if (!code.includes('\\\\end{document}')) {
    code += '\\n\\\\end{document}\\n';
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
    // ───── Step 1: Fetch all knowledge PDFs for this course from DB ─────
    const knowledgeResult = await pool.query(
      'SELECT id, file_name, url FROM public.knowledge WHERE course_id = $1 ORDER BY id ASC',
      [courseId]
    );

    if (knowledgeResult.rows.length === 0) {
      return res.status(400).json({ error: 'No knowledge documents found for this course. Upload PDFs first.' });
    }

    console.log(\`📚 Found \${knowledgeResult.rows.length} knowledge document(s) for course \${courseId}\`);

    // ───── Step 2: Download PDFs from Cloudinary & extract text ─────
    const { PDFParse } = await import('pdf-parse');
    const extractedTexts = [];

    for (const doc of knowledgeResult.rows) {
      if (!doc.url) {
        console.warn(\`⚠️ Skipping document "\${doc.file_name}" — no URL\`);
        continue;
      }

      try {
        console.log(\`📄 Downloading: \${doc.file_name} from \${doc.url}\`);
        const pdfResponse = await fetch(doc.url);
        if (!pdfResponse.ok) {
          console.warn(\`⚠️ Failed to download \${doc.file_name}: \${pdfResponse.status}\`);
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
          console.log(\`✅ Extracted \${pdfData.text.length} chars from \${doc.file_name}\`);
        } else {
          console.warn(\`⚠️ No text extracted from \${doc.file_name}\`);
        }
      } catch (pdfErr) {
        console.error(\`❌ Error processing \${doc.file_name}:\`, pdfErr.message);
      }
    }

    if (extractedTexts.length === 0) {
      return res.status(400).json({ error: 'Could not extract text from any of the uploaded PDFs. Make sure they contain selectable text.' });
    }

    // ───── Step 3: Build the combined knowledge context ─────
    const knowledgeContext = extractedTexts
      .map((doc, i) => \`--- Document \${i + 1}: "\${doc.fileName}" ---\\n\${doc.text}\`)
      .join('\\n\\n');

    // ───── Step 4: Call OpenAI to generate LaTeX exam ─────
    const userInstructions = prompt ? prompt.trim() : 'General exam covering all topics.';

    // IMPROVED PROMPT: Template-based approach with strict package restrictions
    const systemPrompt = \`You are an expert university professor and LaTeX typesetter.
Your ONLY job: create a NEW exam from the provided course materials.

CONTENT RULES:
1. NO SOLUTIONS — only questions with blank space (\\\\vspace{5cm}) for answers.
2. MONOLINGUAL — match the language of the source documents exactly. If the source is German, ALL text must be German. If English, ALL English.
3. NO HALLUCINATIONS — do NOT invent professor names, dates, or course codes unless they appear in the source material.
4. Create ORIGINAL questions testing the same concepts — do NOT copy questions from the source.
5. Include a point value for each question/sub-question.
6. Include a grading table at the top.

LATEX RULES (CRITICAL — violations cause compilation failure):
7. You MUST use EXACTLY this document preamble — do NOT add ANY other \\\\usepackage commands:

\\\\documentclass[12pt,a4paper]{article}
\\\\usepackage[utf8]{inputenc}
\\\\usepackage[T1]{fontenc}
\\\\usepackage{geometry}
\\\\geometry{left=2.5cm,right=2.5cm,top=2cm,bottom=2cm}
\\\\usepackage{amsmath,amssymb}

8. DO NOT use these packages (they will cause errors): fancyhdr, enumitem, extramarks, babel, listings, tikz, pgfplots, minted, tcolorbox, mdframed, xcolor, hyperref.
9. For lists use \\\\begin{enumerate} or \\\\begin{itemize} WITHOUT any optional arguments (no [label=...], no [a)], etc.).
10. For code snippets use \\\\begin{verbatim}...\\\\end{verbatim} — do NOT use listings or minted.
11. Use \\\\subsection*{} for questions, NOT \\\\section*{}.
12. Use \\\\textbf{} for bold, \\\\textit{} for italic.
13. For the grading table, use the basic tabular environment.
14. DO NOT use \\\\cleardoublepage — use \\\\newpage instead.
15. Escape special characters: \\\\%, \\\\&, \\\\_, \\\\#, \\\\{ \\\\} outside of math/verbatim.

OUTPUT FORMAT:
- Return ONLY raw LaTeX.
- Start with \\\\documentclass, end with \\\\end{document}.
- No markdown fences, no JSON wrapping, no commentary.\`;

    const userPrompt = \`Here are the course materials (DO NOT copy questions from these, create new ones):

\${knowledgeContext}

---

INSTRUCTIONS FOR THIS EXAM:
\${userInstructions}

Generate the LaTeX exam now.\`;

    console.log(\`🤖 Sending \${knowledgeContext.length} chars of context to OpenAI...\`);

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${OPENAI_API_KEY}\`,
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
      throw new Error(\`AI generation failed: \${aiResponse.status} \${aiResponse.statusText}\`);
    }

    const aiData = await aiResponse.json();
    let latexCode = aiData.choices?.[0]?.message?.content || '';

    // Sanitize the LaTeX code (remove unsafe packages, fix common issues)
    latexCode = sanitizeLatexCode(latexCode);

    if (!latexCode.includes('\\\\documentclass')) {
      throw new Error('AI did not return valid LaTeX code.');
    }

    console.log(\`✅ Generated \${latexCode.length} chars of LaTeX code\`);

    // ───── Step 5: Compile LaTeX → PDF locally ─────
    console.log('📐 Compiling LaTeX to PDF...');
    let pdfBuffer;
    try {
      pdfBuffer = await compileLatexToPdf(latexCode);
    } catch (compileErr) {
      console.error('❌ LaTeX compilation failed:', compileErr.message);
      // Return the LaTeX code so the user can debug, but still save it with no URL
      const dbResult = await pool.query(
        'INSERT INTO public.generated_exams (course_id, file_name) VALUES ($1, $2) RETURNING *',
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
    const safeName = (fileName || \`Exam_\${Date.now()}\`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const cloudinaryResult = await uploadPdfToCloudinary(pdfBuffer, \`exam_\${safeName}_\${Date.now()}\`);
    const pdfUrl = cloudinaryResult.secure_url;
    console.log(\`✅ Uploaded to Cloudinary: \${pdfUrl}\`);

    // ───── Step 7: Insert exam record into DB with URL ─────
    const dbResult = await pool.query(
      'INSERT INTO public.generated_exams (course_id, file_name, url) VALUES ($1, $2, $3) RETURNING *',
      [courseId, fileName ? fileName.trim() : safeName, pdfUrl]
    );
    const newExam = dbResult.rows[0];

    console.log(\`✅ Exam saved to DB: id=\${newExam.id}, url=\${pdfUrl}\`);

    // ───── Step 8: Return result ─────
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

`;

fs.writeFileSync(targetFile, before + newEndpoint + after, 'utf-8');
console.log('Done replacement!');
