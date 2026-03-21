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
  url: string | null;
  file_name?: string | null;
  evaluation_url?: string | null;
  status?: string;
  created_at: string;
};

export type FeedbackTaskResult = {
  label: string;
  question: string;
  achieved_points: number;
  max_points: number;
  confidence: string;
  used_fallback: boolean;
  feedback: {
    summary: string;
    correct_solution: {
      type: string;
      explanation: string;
    };
    what_was_good: string[];
    what_to_improve: string[];
    tips: string[];
    note_on_missing_data: string;
  };
  missing_points: string[];
  strengths: string[];
};

export type FeedbackResponse = {
  success: boolean;
  results: FeedbackTaskResult[];
};

export type FeedbackResult = FeedbackResponse[];


// ==========================================
// Courses
// ==========================================
export async function fetchCourses(): Promise<Course[]> {
  const res = await fetch(`${API_BASE}/courses`);
  if (!res.ok) throw new Error('Error loading courses');
  return res.json();
}

export async function createCourse(name: string): Promise<Course> {
  const res = await fetch(`${API_BASE}/courses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Error creating course');
  return res.json();
}

export async function deleteCourse(id: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/courses/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Error deleting course');
  return res.json();
}

// ==========================================
// Knowledge
// ==========================================
export async function fetchKnowledge(courseId: number): Promise<KnowledgeEntry[]> {
  const res = await fetch(`${API_BASE}/courses/${courseId}/knowledge`);
  if (!res.ok) throw new Error('Error loading knowledge base');
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
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

export async function deleteKnowledge(courseId: number, id: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/courses/${courseId}/knowledge/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Error deleting document');
  return res.json();
}

// ==========================================
// Generated Exams
// ==========================================
export async function fetchExams(courseId: number): Promise<GeneratedExam[]> {
  const res = await fetch(`${API_BASE}/courses/${courseId}/exams`);
  if (!res.ok) throw new Error('Error loading exams');
  return res.json();
}

export async function generateExam(courseId: number, prompt: string, fileName: string): Promise<{ message: string; exams: GeneratedExam[] }> {
  const res = await fetch(`${API_BASE}/courses/${courseId}/exams/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, fileName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Generation failed' }));
    throw new Error(err.error || 'Generation failed');
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
    const err = await res.json().catch(() => ({ error: 'Feedback submission failed' }));
    throw new Error(err.error || 'Feedback submission failed');
  }
  return res.json();
}
// ==========================================
// Flashcards
// ==========================================
export async function generateFlashcards(courseId: number): Promise<string> {
  const res = await fetch(`${API_BASE}/courses/${courseId}/flashcards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Flashcards generation failed' }));
    throw new Error(err.error || 'Flashcards generation failed');
  }
  const data = await res.json();
  return data.csvData;
}
