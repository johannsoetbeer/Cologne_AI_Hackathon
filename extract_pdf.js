import fetch from 'node-fetch';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const url = 'https://res.cloudinary.com/dpuecaawb/image/upload/v1774075903/hff7ckvo8qcjuwjeut0v.pdf';

async function extractText() {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const buffer = await res.buffer();
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    const fs = await import('fs/promises');
    await fs.writeFile('/home/blacklight/Desktop/Projects/K-ln_AI_Hackathon/extracted_full_exam_text.txt', data.text);
    console.log('--- FULL PDF TEXT SAVED TO extracted_full_exam_text.txt ---');
    await parser.destroy();
  } catch (err) {
    console.error('Error extracting text:', err);
  }
}

extractText();
