import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen,
  Folder,
  Plus,
  UploadCloud,
  FileText,
  CheckCircle,
  Download,
  BrainCircuit,
  Send,
  Loader2,
  ChevronRight,
  Library,
  FileBadge,
  AlertCircle,
  Sparkles,
  Trash2,
  Layers,
} from 'lucide-react';
import {
  fetchCourses,
  createCourse,
  fetchKnowledge,
  uploadKnowledge,
  fetchExams,
  generateExam,
  submitFeedback,
  deleteCourse,
  deleteKnowledge,
  generateFlashcards,
  type Course,
  type KnowledgeEntry,
  type GeneratedExam,
  type FeedbackResult,
} from './api';

type Tab = 'database' | 'generator' | 'feedback' | 'flashcards';

export default function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('database');
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isDeletingCourseId, setIsDeletingCourseId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Data per active subject
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [exams, setExams] = useState<GeneratedExam[]>([]);

  const activeSubject = courses.find((s) => s.id === activeSubjectId) || null;

  // Load courses on mount
  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setIsLoadingCourses(true);
    try {
      const data = await fetchCourses();
      setCourses(data);
      setError(null);
    } catch (err) {
      setError('Connection to server failed. Is the backend server running?');
      console.error(err);
    } finally {
      setIsLoadingCourses(false);
    }
  };

  // Load data when active subject changes
  const loadSubjectData = useCallback(async (courseId: number) => {
    try {
      const [knowledgeData, examsData] = await Promise.all([
        fetchKnowledge(courseId),
        fetchExams(courseId),
      ]);
      setKnowledge(knowledgeData);
      setExams(examsData);
    } catch (err) {
      console.error('Error loading subject data:', err);
    }
  }, []);

  useEffect(() => {
    if (activeSubjectId) {
      loadSubjectData(activeSubjectId);
    } else {
      setKnowledge([]);
      setExams([]);
    }
  }, [activeSubjectId, loadSubjectData]);

  const handleSelectSubject = (id: number) => {
    setActiveSubjectId(id);
    setActiveTab('database');
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    try {
      const newCourse = await createCourse(newSubjectName.trim());
      setCourses((prev) => [newCourse, ...prev]);
      setNewSubjectName('');
      setIsAddingSubject(false);
      setActiveSubjectId(newCourse.id);
      setActiveTab('database');
    } catch (err) {
      console.error('Error creating course:', err);
      setError('Could not create course');
    }
  };

  const handleDeleteSubject = async (id: number, name: string) => {
    if (!window.confirm(`Do you really want to delete course "${name}" ?`)) return;
    setIsDeletingCourseId(id);
    try {
      await deleteCourse(id);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      if (activeSubjectId === id) {
        setActiveSubjectId(null);
      }
    } catch (err) {
      console.error('Error deleting course:', err);
      setError('Could not delete course');
    } finally {
      setIsDeletingCourseId(null);
    }
  };

  const refreshKnowledge = async () => {
    if (!activeSubjectId) return;
    try {
      const data = await fetchKnowledge(activeSubjectId);
      setKnowledge(data);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshExams = async () => {
    if (!activeSubjectId) return;
    try {
      const data = await fetchExams(activeSubjectId);
      setExams(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-slate-900 font-sans overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent tracking-tight">
            University Acer
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
            My Courses
          </div>

          {isLoadingCourses ? (
            <div className="flex items-center gap-2 px-3 py-4 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading courses...</span>
            </div>
          ) : courses.length === 0 ? (
            <p className="text-sm text-slate-400 px-3 py-4 text-center">
              No courses created yet.
            </p>
          ) : (
            courses.map((subject) => (
              <div key={subject.id} className="relative group w-full flex items-center">
                <button
                  onClick={() => handleSelectSubject(subject.id)}
                  className={`flex-1 flex items-center gap-3 py-2.5 pl-3 pr-10 rounded-xl transition-all duration-200 text-left ${activeSubjectId === subject.id
                    ? 'bg-indigo-50 text-indigo-700 font-medium shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <Folder
                    className={`w-5 h-5 shrink-0 ${activeSubjectId === subject.id ? 'text-indigo-600' : 'text-slate-400'
                      }`}
                  />
                  <span className="truncate">{subject.name}</span>
                  {activeSubjectId === subject.id && (
                    <ChevronRight className="w-4 h-4 ml-auto text-indigo-400" />
                  )}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject.id, subject.name); }}
                  disabled={isDeletingCourseId === subject.id}
                  className={`absolute right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-opacity flex ${activeSubjectId === subject.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
                    }`}
                  title="Delete course"
                >
                  {isDeletingCourseId === subject.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          {isAddingSubject ? (
            <form onSubmit={handleAddSubject} className="space-y-3">
              <input
                type="text"
                autoFocus
                placeholder="Course name..."
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white text-sm font-medium py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingSubject(false)}
                  className="flex-1 bg-white text-slate-600 text-sm font-medium py-2 rounded-xl hover:bg-slate-50 border border-slate-200 transition-colors shadow-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingSubject(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm font-medium group text-sm"
            >
              <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              Create new course
            </button>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

        {/* Error Banner */}
        {error && (
          <div className="relative z-20 mx-10 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
            <button onClick={() => { setError(null); loadCourses(); }} className="ml-auto text-red-500 hover:text-red-700 font-medium">
              Try again
            </button>
          </div>
        )}

        {!activeSubject ? (
          /* DASHBOARD */
          <div className="flex-1 flex flex-col items-center justify-center p-8 z-10">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <BookOpen className="w-10 h-10 text-indigo-500" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">
              Welcome to University Acer!
            </h2>
            <p className="text-slate-500 mb-10 max-w-md text-center text-lg leading-relaxed">
              Select a course from the sidebar or create a new one to start your preparation.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
              {courses.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => handleSelectSubject(subject.id)}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 text-left group"
                >
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition-colors duration-300">
                    <Folder className="w-6 h-6 text-indigo-500 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-1">{subject.name}</h3>
                  <p className="text-sm text-slate-500">Click to open</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* SUBJECT VIEW */
          <div className="flex-1 flex flex-col z-10 overflow-hidden">
            <header className="px-10 py-8 bg-white/50 backdrop-blur-sm border-b border-slate-200/50">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500 mb-2">
                <Folder className="w-4 h-4" />
                <button onClick={() => setActiveSubjectId(null)} className="hover:text-indigo-500 transition-colors">
                  My Courses
                </button>
                <ChevronRight className="w-4 h-4" />
                <span className="text-indigo-600">{activeSubject.name}</span>
              </div>
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {activeSubject.name}
              </h2>
            </header>

            {/* Tabs */}
            <div className="px-10 border-b border-slate-200 bg-white/30 backdrop-blur-md">
              <div className="flex gap-8">
                <TabButton active={activeTab === 'database'} onClick={() => setActiveTab('database')} icon={<Library className="w-4 h-4" />}>
                  Knowledge Base
                </TabButton>
                <TabButton active={activeTab === 'generator'} onClick={() => setActiveTab('generator')} icon={<BrainCircuit className="w-4 h-4" />}>
                  Exam Generator
                </TabButton>
                <TabButton active={activeTab === 'feedback'} onClick={() => setActiveTab('feedback')} icon={<FileBadge className="w-4 h-4" />}>
                  Correction & Feedback
                </TabButton>
                <TabButton active={activeTab === 'flashcards'} onClick={() => setActiveTab('flashcards')} icon={<Layers className="w-4 h-4" />}>
                  Flashcards
                </TabButton>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-10" key={activeSubject.id}>
              <div className="max-w-4xl mx-auto">
                <div className={activeTab === 'database' ? 'block' : 'hidden'}>
                  <DatabaseTab
                    courseId={activeSubject.id}
                    knowledge={knowledge}
                    onRefresh={refreshKnowledge}
                  />
                </div>
                <div className={activeTab === 'generator' ? 'block' : 'hidden'}>
                  <GeneratorTab
                    courseId={activeSubject.id}
                    exams={exams}
                    onRefresh={refreshExams}
                  />
                </div>
                <div className={activeTab === 'feedback' ? 'block' : 'hidden'}>
                  <FeedbackTab
                    courseId={activeSubject.id}
                    exams={exams}
                  />
                </div>
                <div className={activeTab === 'flashcards' ? 'block' : 'hidden'}>
                  <FlashcardsTab
                    courseId={activeSubject.id}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ==========================================
// Tab Button
// ==========================================
function TabButton({
  children,
  active,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 py-4 px-2 text-sm font-medium transition-colors ${active ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
        }`}
    >
      {icon}
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-600 rounded-t-full shadow-[0_-2px_8px_rgba(79,70,229,0.5)]" />
      )}
    </button>
  );
}

// ==========================================
// Tab 1: Knowledge Base
// ==========================================
function DatabaseTab({
  courseId,
  knowledge,
  onRefresh,
}: {
  courseId: number;
  knowledge: KnowledgeEntry[];
  onRefresh: () => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [optimisticDocs, setOptimisticDocs] = useState<{ name: string, date: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadStatus('AI is analyzing document...');
    setOptimisticDocs(prev => [...prev, { name: file.name, date: Date.now() }]);

    try {
      await uploadKnowledge(courseId, file);
      setUploadStatus('Successfully sent to AI!');
      // Refresh multiple times to catch n8n processing updates automatically
      onRefresh();
      setTimeout(onRefresh, 2000);
      setTimeout(onRefresh, 5000);
      setTimeout(onRefresh, 10000);
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err) {
      setUploadStatus('Error: ' + (err instanceof Error ? err.message : 'Upload failed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewKnowledge = (url: string | undefined) => {
    if (!url) {
      alert('No URL for this document found in the database (Cloudinary).');
      return;
    }

    window.open(url, '_blank');
  };

  const handleDelete = async (id: number, fileName: string) => {
    if (!window.confirm(`Do you want to delete the document "${fileName}"?`)) return;
    setIsDeletingId(id);
    try {
      await deleteKnowledge(courseId, id);
      onRefresh();
    } catch (err) {
      alert('Error deleting document');
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const renderProcessedBadge = () => (
    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
      <CheckCircle className="w-3.5 h-3.5" />
      Processed
    </div>
  );

  const renderProcessingBadge = () => (
    <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold">
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
      Processing
    </div>
  );

  const pendingDocs = optimisticDocs.filter(opt => !knowledge.some(k => k.file_name === opt.name));

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Documents & Scripts</h3>
        <p className="text-slate-500">
          Upload your learning materials here. The AI processes them automatically as a basis for your exams.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group ${isDragging
          ? 'border-indigo-500 bg-indigo-100/50 scale-[1.02]'
          : isUploading
            ? 'border-amber-300 bg-amber-50/50 cursor-wait'
            : 'border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-400'
          }`}
      >
        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />

        {isUploading ? (
          <>
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 animate-pulse">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
            <h4 className="text-lg font-semibold text-slate-700 mb-1">{uploadStatus}</h4>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
              <UploadCloud className="w-8 h-8 text-indigo-500" />
            </div>
            <h4 className="text-lg font-semibold text-slate-700 mb-1">
              Drop PDFs (transcripts, past exams) here
            </h4>
            <p className="text-slate-500 text-sm">or click to select</p>
          </>
        )}
      </div>

      {uploadStatus && !isUploading && (
        <div className={`text-sm font-medium px-4 py-2 rounded-xl text-center ${uploadStatus.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
          }`}>
          {uploadStatus}
        </div>
      )}

      {/* Uploaded Files */}
      <div>
        <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          Uploaded Files
          {knowledge.length > 0 && (
            <span className="text-xs text-slate-400 font-normal">({knowledge.length})</span>
          )}
        </h4>

        {knowledge.length === 0 && pendingDocs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 shadow-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>No files uploaded yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <ul className="divide-y divide-slate-100">
              {pendingDocs.map((opt) => (
                <li key={opt.date} className="p-4 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <FileText className="w-5 h-5 text-slate-400" />
                    </div>
                    <span className="font-medium text-slate-500">{opt.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {renderProcessingBadge()}
                  </div>
                </li>
              ))}
              {knowledge.map((entry) => (
                <li key={entry.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-50 rounded-lg">
                      <FileText className="w-5 h-5 text-rose-500" />
                    </div>
                    <button
                      onClick={() => handleViewKnowledge(entry.url)}
                      className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline text-left transition-colors"
                      title="Click to open PDF"
                    >
                      {entry.file_name || 'Unknown Document'}
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    {renderProcessedBadge()}
                    <button
                      onClick={() => handleDelete(entry.id, entry.file_name)}
                      disabled={isDeletingId === entry.id}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete document"
                    >
                      {isDeletingId === entry.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// Tab 2: Exam Generator
// ==========================================
function GeneratorTab({
  courseId,
  exams,
  onRefresh,
}: {
  courseId: number;
  exams: GeneratedExam[];
  onRefresh: () => void;
}) {
  const [focusTopic, setFocusTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [fileName, setFileName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (isGenerating) return;

    const combinedPrompt = `Topic Focus: ${focusTopic || 'General'}\nDifficulty: ${difficulty}\nAdditional Notes: ${additionalNotes}`;

    setIsGenerating(true);
    setGenError(null);

    try {
      // The server handles: PDF text extraction → AI LaTeX generation → n8n webhook
      await generateExam(courseId, combinedPrompt, fileName.trim());
      setFocusTopic('');
      setAdditionalNotes('');
      setFileName('');
      onRefresh();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = (pdfUrl: string) => {
    window.open(pdfUrl, '_blank');
  };

  const getExamStatusBadge = (exam: GeneratedExam) => {
    if (exam.url) {
      return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">Ready</span>;
    }
    const s = exam.status?.toLowerCase() || '';
    if (s === 'processing' || s === 'in progress' || !exam.url) {
      return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Generating</span>;
    }
    return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">{exam.status || 'Pending'}</span>;
  };

  // Poll for updates if there are pending exams
  useEffect(() => {
    const hasPending = exams.some(e => !e.url);
    if (!hasPending) return;

    const interval = setInterval(() => {
      onRefresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [exams, onRefresh]);

  return (
    <div className="space-y-8 text-left">
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Exam Generator</h3>
        <p className="text-slate-500">
          Create a custom practice exam based on your knowledge base.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Topic Focus (optional)
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm text-slate-700"
                placeholder="e.g. Matrix Calculus"
                value={focusTopic}
                onChange={(e) => setFocusTopic(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Difficulty Level
              </label>
              <div className="flex gap-2">
                {['easy', 'medium', 'hard'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium border transition-all ${difficulty === level
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                File Name (optional)
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm text-slate-700"
                placeholder="e.g. Exam_Practice_1"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Specifics / Other
              </label>
              <textarea
                className="w-full h-[110px] p-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none shadow-sm text-slate-700"
                placeholder="e.g. Multiple Choice only, 90 min time limit..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-md ${isGenerating
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:-translate-y-0.5'
            }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating exam...
            </>
          ) : (
            <>
              <BrainCircuit className="w-5 h-5" />
              Generate Exam as PDF
            </>
          )}
        </button>

        {genError && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {genError}
          </div>
        )}
      </div>

      {/* Generated Exams List */}
      {exams.length > 0 && (
        <div>
          <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            Generated Exams
            <span className="text-xs text-slate-400 font-normal">({exams.length})</span>
          </h4>

          <div className="space-y-3">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-700 truncate">{exam.file_name || `Exam #${exam.id}`}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {exam.created_at ? new Date(exam.created_at).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }) : 'Unknown Date'}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {getExamStatusBadge(exam)}
                  {exam.url ? (
                    <button
                      onClick={() => handleDownloadPdf(exam.url!)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 hover:text-indigo-600 hover:border-indigo-300 hover:shadow-md transition-all flex items-center gap-2 text-sm"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Generating...</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// Tab 3: Correction & Feedback
// ==========================================
function FeedbackTab({
  courseId,
  exams,
}: {
  courseId: number;
  exams: GeneratedExam[];
}) {
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<FeedbackResult | null>(null);
  const [fbError, setFbError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const selectedExam = exams.find(e => e.id === selectedExamId) || null;

  const handleSubmit = async () => {
    if (!selectedExamId || !file) return;

    setIsUploading(true);
    setFbError(null);
    setFeedbackResult(null);

    try {
      const result = await submitFeedback(courseId, selectedExamId, file);
      setFeedbackResult(result.feedback);
    } catch (err) {
      setFbError(err instanceof Error ? err.message : 'Could not load feedback');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {!selectedExamId ? (
        <div className="p-6 overflow-y-auto">
          <h3 className="text-xl font-bold text-slate-800 mb-2">Correction & Feedback</h3>
          <p className="text-slate-500 mb-6">
            Select a generated exam to upload your solution and receive feedback.
          </p>

          {exams.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500">
              <AlertCircle className="w-6 h-6 mx-auto mb-3 text-slate-400" />
              No exams available. Generate one in the Exam Generator tab first.
            </div>
          ) : (
            <div className="space-y-3">
              {exams.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => {
                    setSelectedExamId(exam.id);
                    setFeedbackResult(null);
                    setFile(null);
                  }}
                  className="w-full text-left bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-50 p-3 rounded-xl group-hover:bg-indigo-100 transition-colors">
                      <FileBadge className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">{exam.file_name || `Exam #${exam.id}`}</h4>
                      <p className="text-sm text-slate-500">
                        Generated on {exam.created_at ? new Date(exam.created_at).toLocaleDateString('de-DE') : 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white z-10">
            <button
              onClick={() => setSelectedExamId(null)}
              className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back to Overview
            </button>
            <div className="font-semibold text-slate-800">
              {selectedExam?.file_name || `Exam #${selectedExamId}`}
            </div>
          </div>

          {/* Simple Interface for Upload & Result */}
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
            {!feedbackResult ? (
              <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                  <h4 className="text-2xl font-bold text-slate-800">Upload Solution</h4>
                  <p className="text-slate-500">Upload your completed exam (PDF or photo) to receive direct feedback.</p>
                </div>

                {/* Simplified Upload Zone */}
                <div
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${isUploading
                    ? 'border-amber-300 bg-amber-50/50 cursor-wait'
                    : 'border-indigo-200 bg-white hover:bg-indigo-50 hover:border-indigo-400'
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {isUploading ? (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                      </div>
                      <p className="text-lg font-semibold text-slate-700">Analyzing solution...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto text-indigo-500">
                        <UploadCloud className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-semibold text-slate-700">
                          {file ? file.name : 'Drop file here or click to select'}
                        </p>
                        <p className="text-sm text-slate-500">PDF, JPG or PNG</p>
                      </div>
                    </div>
                  )}
                </div>

                {fbError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {fbError}
                  </div>
                )}

                {!isUploading && file && (
                  <button
                    onClick={handleSubmit}
                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    Request Correction
                  </button>
                )}
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-2xl font-bold text-slate-800">Your Statistics</h4>
                  <button
                    onClick={() => { setFeedbackResult(null); setFile(null); }}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Upload new file
                  </button>
                </div>
                <FeedbackCard feedbackResult={feedbackResult} />

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// Feedback Card Component
// ==========================================
function FeedbackCard({ feedbackResult }: { feedbackResult: FeedbackResult | any }) {
  // Normalize the input: n8n might return an array of items or a single object.
  // We want the object that contains the `results` array.
  let feedbackObj = feedbackResult;
  if (Array.isArray(feedbackResult)) {
    // If it's an array, look for the first item that has 'results' or 'success'
    feedbackObj = feedbackResult.find(item => item.results) || feedbackResult[0];
  }

  // Fallback: If no structured results, try to render raw or old format
  if (!feedbackObj || !feedbackObj.results || !Array.isArray(feedbackObj.results)) {
    return (
      <div className="bg-slate-50 p-6 rounded-2xl text-sm font-mono text-slate-600 overflow-auto max-h-[500px] border border-slate-200">
        <div className="flex items-center gap-2 mb-4 text-amber-600 font-semibold font-sans">
          <AlertCircle className="w-5 h-5" />
          <span>The feedback format could not be parsed as a detailed evaluation.</span>
        </div>
        <pre>{JSON.stringify(feedbackResult, null, 2)}</pre>
      </div>
    );
  }

  const results = feedbackObj.results;
  const totalAchieved = results.reduce((acc: number, r: any) => acc + (r.achieved_points || 0), 0);
  const totalMax = results.reduce((acc: number, r: any) => acc + (r.max_points || 0), 0);
  const percentage = totalMax > 0 ? Math.round((totalAchieved / totalMax) * 100) : 0;

  // Determine Grade based on standard university thresholds
  let grade = 'Not passed';
  let gradeBg = 'bg-red-50 border-red-200';
  let gradeText = 'text-red-700';

  if (percentage >= 95) { grade = '1.0 (Excellent)'; gradeBg = 'bg-emerald-50 border-emerald-200'; gradeText = 'text-emerald-700'; }
  else if (percentage >= 90) { grade = '1.3 (Excellent)'; gradeBg = 'bg-emerald-50 border-emerald-200'; gradeText = 'text-emerald-700'; }
  else if (percentage >= 85) { grade = '1.7 (Good)'; gradeBg = 'bg-green-50 border-green-200'; gradeText = 'text-green-700'; }
  else if (percentage >= 80) { grade = '2.0 (Good)'; gradeBg = 'bg-green-50 border-green-200'; gradeText = 'text-green-700'; }
  else if (percentage >= 75) { grade = '2.3 (Good)'; gradeBg = 'bg-green-50 border-green-200'; gradeText = 'text-green-700'; }
  else if (percentage >= 70) { grade = '2.7 (Satisfactory)'; gradeBg = 'bg-blue-50 border-blue-200'; gradeText = 'text-blue-700'; }
  else if (percentage >= 65) { grade = '3.0 (Satisfactory)'; gradeBg = 'bg-blue-50 border-blue-200'; gradeText = 'text-blue-700'; }
  else if (percentage >= 60) { grade = '3.3 (Satisfactory)'; gradeBg = 'bg-blue-50 border-blue-200'; gradeText = 'text-blue-700'; }
  else if (percentage >= 55) { grade = '3.7 (Sufficient)'; gradeBg = 'bg-amber-50 border-amber-200'; gradeText = 'text-amber-700'; }
  else if (percentage >= 50) { grade = '4.0 (Sufficient)'; gradeBg = 'bg-amber-50 border-amber-200'; gradeText = 'text-amber-700'; }


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Overview Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Score / Grade Card */}
        <div className={`col-span-1 md:col-span-2 p-8 rounded-3xl border shadow-lg relative overflow-hidden ${gradeBg}`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -mr-20 -mt-20"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h4 className="text-xl font-bold mb-1 opacity-80 text-slate-800">Total Score</h4>
              <div className="flex items-baseline gap-3">
                <span className={`text-5xl font-extrabold tracking-tight ${gradeText}`}>{percentage}%</span>
                <span className={`text-xl font-medium ${gradeText} opacity-80`}>({totalAchieved} / {totalMax} Pts)</span>
              </div>
              <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-xl font-bold ${gradeText} shadow-sm border border-white/50`}>
                {percentage >= 50 ? '🎉 Passed' : '💔 Failed'} - {grade}
              </div>
            </div>

            {/* Circular Progress */}
            <div className="relative w-32 h-32 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/40" />
                <circle
                  cx="50" cy="50" r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - percentage / 100)}`}
                  className={`${gradeText} drop-shadow-md transition-all duration-1000 ease-out`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Aggregate Strengths / Weaknesses Overview */}
        <div className="col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" /> Evaluation Metrics
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Attempted Tasks</span>
                <span className="font-bold text-slate-700">{results.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Full Score</span>
                <span className="font-bold text-emerald-600">{results.filter((r: any) => r.achieved_points === r.max_points).length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Partial Score</span>
                <span className="font-bold text-amber-600">{results.filter((r: any) => r.achieved_points > 0 && r.achieved_points < r.max_points).length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Zero Score</span>
                <span className="font-bold text-red-600">{results.filter((r: any) => r.achieved_points === 0).length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Tasks Breakdown */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-800 px-2">Task Details</h3>
        {results.map((res: any, i: number) => {
          const taskPercent = res.max_points > 0 ? (res.achieved_points / res.max_points) * 100 : 0;
          const isFull = res.achieved_points === res.max_points;
          const isZero = res.achieved_points === 0;

          return (
            <div key={i} className={`bg-white p-6 md:p-8 rounded-3xl border-2 transition-all duration-300 shadow-sm hover:shadow-md ${isFull ? 'border-emerald-100 hover:border-emerald-300' : isZero ? 'border-red-100 hover:border-red-300' : 'border-amber-100 hover:border-amber-300'}`}>
              {/* Task Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-lg text-sm font-bold ${isFull ? 'bg-emerald-100 text-emerald-700' : isZero ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      Task {res.label}
                    </span>
                    <div className="h-2 flex-1 max-w-[200px] bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isFull ? 'bg-emerald-500' : isZero ? 'bg-red-500' : 'bg-amber-500'}`}
                        style={{ width: `${taskPercent}%` }}
                      />
                    </div>
                  </div>
                  <h5 className="text-lg font-bold text-slate-800 leading-snug">{res.question}</h5>
                </div>

                <div className={`shrink-0 flex flex-col items-end`}>
                  <span className={`text-2xl font-black ${isFull ? 'text-emerald-600' : isZero ? 'text-red-500' : 'text-amber-600'}`}>
                    {res.achieved_points} / {res.max_points}
                  </span>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Points</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Feedback & Explanation */}
                <div className="space-y-6">
                  <div>
                    <h6 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Feedback</h6>
                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl">{res.feedback.summary}</p>
                  </div>

                  {res.feedback.correct_solution?.explanation && (
                    <div>
                      <h6 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Correct Solution
                      </h6>
                      <p className="text-slate-600 italic leading-relaxed pl-4 border-l-4 border-indigo-200">
                        {res.feedback.correct_solution.explanation}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Column: Good/Improve & Strengths */}
                <div className="space-y-4">
                  {res.feedback.what_was_good?.length > 0 && (
                    <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl">
                      <h6 className="text-sm font-bold text-emerald-700 flex items-center gap-2 mb-3">
                        <CheckCircle className="w-4 h-4" /> What went well
                      </h6>
                      <ul className="text-sm text-slate-700 space-y-2">
                        {res.feedback.what_was_good.map((item: string, idx: number) => (
                          <li key={idx} className="flex gap-3">
                            <span className="text-emerald-500 font-bold mt-0.5">•</span>
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {res.feedback.what_to_improve?.length > 0 && (
                    <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-2xl">
                      <h6 className="text-sm font-bold text-amber-700 flex items-center gap-2 mb-3">
                        <AlertCircle className="w-4 h-4" /> Areas for improvement
                      </h6>
                      <ul className="text-sm text-slate-700 space-y-2">
                        {res.feedback.what_to_improve.map((item: string, idx: number) => (
                          <li key={idx} className="flex gap-3">
                            <span className="text-amber-500 font-bold mt-0.5">•</span>
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {res.strengths?.length > 0 && (
                    <div className="pt-2">
                      <div className="flex flex-wrap gap-2">
                        {res.strengths.map((str: string, idx: number) => (
                          <span key={idx} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold ring-1 ring-indigo-200/50 shadow-sm">
                            💪 {str}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ==========================================
// Tab 4: Flashcards
// ==========================================
function FlashcardsTab({
  courseId,
}: {
  courseId: number;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<{ question: string, answer: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [csvContent, setCsvContent] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenError(null);
    setFlashcards([]);
    setCsvContent(null);

    try {
      const csvText = await generateFlashcards(courseId);
      setCsvContent(csvText);

      const lines = csvText.split('\n');
      const parsedCards = lines
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
          // Handle semicolon separator (common in exported flashcard datasets)
          const parts = line.split(';');
          if (parts.length >= 2) {
            return { question: parts[0].trim(), answer: parts.slice(1).join(';').trim() };
          }
          // Fallback to simple colon if no semicolon found
          const colonParts = line.split(':');
          return { question: colonParts[0].trim(), answer: colonParts.slice(1).join(':').trim() };
        })
        .filter(card => card.question && card.answer);

      setFlashcards(parsedCards);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!csvContent) return;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'flashcards.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(prev => Math.min(prev + 1, flashcards.length - 1));
    }, 150);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(prev => Math.max(prev - 1, 0));
    }, 150);
  };

  return (
    <div className="space-y-8 text-left max-w-2xl mx-auto w-full">
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Flashcard Trainer</h3>
        <p className="text-slate-500">
          Train your knowledge interactively or export for Anki/RemNote.
        </p>
      </div>

      {flashcards.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm text-center">
          <Layers className="w-16 h-16 text-indigo-400 mx-auto mb-6 opacity-50" />
          <h4 className="text-2xl font-bold text-slate-800 mb-4 tracking-tight">
            Ready to generate flashcards?
          </h4>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">
            Let our AI extract the most important questions from your old exams to use in your preferred study tool.
          </p>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full max-w-sm mx-auto py-5 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all shadow-md text-lg ${isGenerating
              ? 'bg-slate-100 text-slate-500 cursor-wait shadow-none'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-xl hover:-translate-y-1'
              }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                AI is analyzing documents...
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                Generate Flashcards
              </>
            )}
          </button>

          {genError && (
            <div className="mt-6 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-center gap-2 max-w-sm mx-auto">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {genError}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* THE FLASHCARD */}
          <div className="perspective-1000 w-full h-80 focus:outline-none" onClick={() => setIsFlipped(!isFlipped)} role="button" tabIndex={0}>
            <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''} shadow-xl rounded-3xl`}>
              {/* FRONT */}
              <div className="absolute w-full h-full backface-hidden bg-white border-2 border-indigo-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                <span className="absolute top-6 left-8 text-indigo-400 font-semibold tracking-wider text-sm uppercase">Question</span>
                <p className="text-2xl font-bold text-slate-800 leading-snug">
                  {flashcards[currentIndex].question}
                </p>
                <span className="absolute bottom-6 text-slate-400 text-sm animate-pulse">Click to flip</span>
              </div>

              {/* BACK */}
              <div className="absolute w-full h-full backface-hidden bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center rotate-y-180">
                <span className="absolute top-6 left-8 text-indigo-500 font-semibold tracking-wider text-sm uppercase">Answer</span>
                <p className="text-xl font-medium text-slate-700 leading-relaxed overflow-y-auto w-full px-4 max-h-[80%] custom-scrollbar">
                  {flashcards[currentIndex].answer}
                </p>
              </div>
            </div>
          </div>

          {/* CONTROLS */}
          <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-200">
            <button
              onClick={prevCard}
              disabled={currentIndex === 0}
              className="px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 text-slate-700"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              Previous
            </button>

            <div className="font-semibold text-slate-600 tracking-wide">
              Card {currentIndex + 1} of {flashcards.length}
            </div>

            <button
              onClick={nextCard}
              disabled={currentIndex === flashcards.length - 1}
              className="px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 text-slate-700"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* EXPORT ACTION */}
          <div className="pt-4 space-y-4">
            <button
              onClick={handleDownloadCsv}
              className="w-full py-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-sm hover:shadow"
            >
              <Download className="w-6 h-6" />
              💾 Download CSV for Anki / RemNote
            </button>

            <button
              onClick={() => { setCsvContent(null); setFlashcards([]); }}
              className="w-full py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Generate New
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
