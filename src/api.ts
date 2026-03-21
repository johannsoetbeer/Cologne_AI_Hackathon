const API_BASE = 'http://localhost:3001/api';

// ==========================================
// Types
// ==========================================
export type Course = {
  id: number;
  name: string;
  created_at: string;
};

export type KnowledgeEntry = {
  id: number;
  course_id: number;
  file_name: string;
  created_at: string;
  url: string;
};

export type GeneratedExam = {
  id: number;
  course_id: number;
  prompt?: string;
  url: string | null;
  evaluation_url?: string | null;
  status?: string;
  created_at: string;
};

export type FeedbackResult = {
  grade?: string;
  total_score?: string;
  score?: number;
  max_score?: number;
  feedback?: string;
  tasks?: Array<{
    task: string;
    score: string;
    feedback: string;
  }>;
  strengths?: string[];
  weaknesses?: string[];
  [key: string]: unknown;
};

// ==========================================
// Courses
// ==========================================
export async function fetchCourses(): Promise<Course[]> {
  const res = await fetch(`${API_BASE}/courses`);
  if (!res.ok) throw new Error('Fehler beim Laden der Fächer');
  return res.json();
}

export async function createCourse(name: string): Promise<Course> {
  const res = await fetch(`${API_BASE}/courses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Fehler beim Erstellen des Fachs');
  return res.json();
}

export async function deleteCourse(id: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/courses/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Fehler beim Löschen des Fachs');
  return res.json();
}

// ==========================================
// Knowledge
// ==========================================
export async function fetchKnowledge(courseId: number): Promise<KnowledgeEntry[]> {
  const res = await fetch(`${API_BASE}/courses/${courseId}/knowledge`);
  if (!res.ok) throw new Error('Fehler beim Laden der Wissensdatenbank');
  return res.json();
}

export async function uploadKnowledge(courseId: number, file: File): Promise<{ message: string; knowledge: KnowledgeEntry[] }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/courses/${courseId}/knowledge/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload fehlgeschlagen' }));
    throw new Error(err.error || 'Upload fehlgeschlagen');
  }
  return res.json();
}

export async function deleteKnowledge(courseId: number, id: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/courses/${courseId}/knowledge/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Fehler beim Löschen des Dokuments');
  return res.json();
}

// ==========================================
// Generated Exams
// ==========================================
export async function fetchExams(courseId: number): Promise<GeneratedExam[]> {
  const res = await fetch(`${API_BASE}/courses/${courseId}/exams`);
  if (!res.ok) throw new Error('Fehler beim Laden der Klausuren');
  return res.json();
}

export async function generateExam(courseId: number, prompt: string): Promise<{ message: string; exams: GeneratedExam[] }> {
  const res = await fetch(`${API_BASE}/courses/${courseId}/exams/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Generierung fehlgeschlagen' }));
    throw new Error(err.error || 'Generierung fehlgeschlagen');
  }
  return res.json();
}

// ==========================================
// Feedback
// ==========================================
export async function submitFeedback(courseId: number, examId: number, file: File): Promise<{ message: string; feedback: FeedbackResult }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('exam_id', examId.toString());

  const res = await fetch(`${API_BASE}/courses/${courseId}/feedback`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Feedback fehlgeschlagen' }));
    throw new Error(err.error || 'Feedback fehlgeschlagen');
  }
  return res.json();
}
