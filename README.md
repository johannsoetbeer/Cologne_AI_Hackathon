# ExamAI 🚀

> [!NOTE]
> This is just a prototype. As a team, we developed this project during Köln AI Hackathon. We are excited to share it with you!

ExamAI is a full-stack web application that allows university students to automatically generate custom practice exams and flashcards based on lecture slides, scripts, and previous exams. It uses AI to analyze documents, extract text, generate LaTeX code for the exam, and finally compile it into a PDF. It also features a "Correction & Feedback" mode that automatically grades student attempts.

## Features

- **Knowledge Base:** Upload PDFs (transcripts, past exams). Extracted content is stored in a database.
- **Exam Generator:** Specify topics and difficulty. AI generates an original LaTeX exam and compiles it into a downloadable PDF.
- **Correction & Feedback:** Upload a completed exam (PDF or image). AI analyzes your solutions and provides detailed grading and feedback.
- **Flashcards:** Generate interactive Anki-style flashcards from your uploaded documents.

---

## Technical Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (with `pg` adapter)
- **External Services:** 
  - **OpenAI API:** For generating LaTeX exams and evaluating solutions.
  - **Cloudinary:** For storing uploaded and generated PDFs.
  - **n8n:** Workflow automation (optional/used for advanced webhook processing).

---

## Prerequisites & Dependencies

To run this project locally, you must install the following:

1. **Node.js**: v18+ is recommended (`npm` is included).
2. **PostgreSQL**: A running instance with your database created.
3. **LaTeX Compiler (Required for PDF Generation!)**:  
   The backend generates mathematical exams using LaTeX. **Without a local LaTeX distribution, exam generation will fail.**
   - **Windows:** Install [MiKTeX](https://miktex.org/download) or use Windows Package Manager:
     ```bash
     winget install -e --id MiKTeX.MiKTeX
     ```
     *Note:* Configure MiKTeX to install missing packages automatically. You can do this by running `initexmf --admin --set-config-value [MiKTeX]InstallMissingPackages=yes` or configuring it in the MiKTeX console.
   - **macOS:** Install [MacTeX](https://tug.org/mactex/).
   - **Linux (Ubuntu/Debian):** Install `texlive-latex-extra` and `texlive-fonts-recommended`:
     ```bash
     sudo apt-get update
     sudo apt-get install texlive-latex-base texlive-latex-extra texlive-fonts-recommended
     ```

---

## Environment Variables (.env)

Create a `.env` file in the root directory and add the following keys. Ask your team or refer to your cloud providers for the actual values:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name

# OpenAI API Key (For exam generation)
OPENAI_API_KEY=sk-YOUR_OPENAI_KEY

# Cloudinary Configuration (For PDF storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Optional n8n Webhooks (If used for processing feedback/knowledge)
N8N_WEBHOOK_KNOWLEDGE=https://your-n8n-instance/webhook/...
N8N_WEBHOOK_FEEDBACK=https://your-n8n-instance/webhook/...
N8N_WEBHOOK_FLASHCARDS=https://your-n8n-instance/webhook/...

# Backend Port
PORT=3001

# LaTeX Configuration (Optional: path to pdflatex executable if not in PATH)
# PDFLATEX_PATH=/path/to/pdflatex
# PDFLATEX_PATH="C:\path\to\pdflatex.exe"

> [!TIP]
> **When do I need `PDFLATEX_PATH`?**
> - **Usually NOT:** If `pdflatex` is in your system PATH, it will be found automatically.
> - **When YES:** If you have LaTeX installed in a custom location (common with MiKTeX on Windows) or if you want to force a specific version.
```

---

## How to Start the App

1. **Install Dependencies:**
   In the root folder of the project, run:
   ```bash
   npm install
   ```
   *(If you encounter permission errors on Windows, ensure no other process is blocking the files, or use `npm ci`)*

2. **Start the Development Servers:**
   The project has a unified command to start both the Node backend and the React frontend simultaneously:
   ```bash
   npm start
   ```
   
   *Alternatively, in two separate terminal windows:*
   
   **Terminal 1 (Backend):**
   ```bash
   npm run server
   ```
   *(Runs on http://localhost:3001)*

   **Terminal 2 (Frontend):**
   ```bash
   npm run dev
   ```
   *(Runs on http://localhost:5173)*

3. **Enjoy ExamAI!** Open your browser at `http://localhost:5173`.
