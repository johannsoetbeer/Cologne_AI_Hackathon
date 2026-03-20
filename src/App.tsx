import React, { useState } from 'react';
import { 
  BookOpen, 
  Folder, 
  Plus, 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  Download, 
  BrainCircuit, 
  PieChart,
  Loader2,
  ChevronRight,
  Library,
  FileBadge
} from 'lucide-react';

type Subject = {
  id: number;
  name: string;
};

type Tab = 'database' | 'generator' | 'feedback';

const mockSubjects: Subject[] = [
  { id: 1, name: "Mathematik 1" },
  { id: 2, name: "Betriebswirtschaftslehre" }
];

const mockFiles = [
  { id: 1, name: "PDF_Skript_Vorlesung_1.pdf", status: "Verarbeitet" },
  { id: 2, name: "Altklausur_WS22.pdf", status: "Verarbeitet" },
];

export default function App() {
  const [subjects, setSubjects] = useState<Subject[]>(mockSubjects);
  const [activeSubjectId, setActiveSubjectId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('database');
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");

  const activeSubject = subjects.find(s => s.id === activeSubjectId) || null;

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    
    const newSubject: Subject = {
      id: Date.now(),
      name: newSubjectName.trim()
    };
    
    setSubjects([...subjects, newSubject]);
    setNewSubjectName("");
    setIsAddingSubject(false);
    setActiveSubjectId(newSubject.id);
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
            Exam Acer
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
            Meine Fächer
          </div>
          
          {subjects.map(subject => (
            <button
              key={subject.id}
              onClick={() => setActiveSubjectId(subject.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left ${
                activeSubjectId === subject.id 
                  ? 'bg-indigo-50 text-indigo-700 font-medium shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Folder className={`w-5 h-5 ${activeSubjectId === subject.id ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="truncate">{subject.name}</span>
              {activeSubjectId === subject.id && (
                <ChevronRight className="w-4 h-4 ml-auto text-indigo-400" />
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          {isAddingSubject ? (
            <form onSubmit={handleAddSubject} className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <input
                type="text"
                autoFocus
                placeholder="Fachname..."
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white text-sm font-medium py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Speichern
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingSubject(false)}
                  className="flex-1 bg-white text-slate-600 text-sm font-medium py-2 rounded-xl hover:bg-slate-50 border border-slate-200 transition-colors shadow-sm"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingSubject(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm font-medium group text-sm"
            >
              <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              Neues Fach anlegen
            </button>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background purely for aesthetics */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

        {!activeSubject ? (
          // DASHBOARD (No subject selected)
          <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <BookOpen className="w-10 h-10 text-indigo-500" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">Willkommen bei Exam Acer!</h2>
            <p className="text-slate-500 mb-10 max-w-md text-center text-lg leading-relaxed">
              Wähle ein Fach aus der Seitenleiste oder lege ein neues an, um mit deiner Vorbereitung zu starten.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
              {subjects.map(subject => (
                <button
                  key={subject.id}
                  onClick={() => setActiveSubjectId(subject.id)}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 text-left group"
                >
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition-colors duration-300">
                    <Folder className="w-6 h-6 text-indigo-500 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-1">{subject.name}</h3>
                  <p className="text-sm text-slate-500">Klicke zum Öffnen</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          // SUBJECT VIEW
          <div className="flex-1 flex flex-col z-10 overflow-hidden">
            <header className="px-10 py-8 bg-white/50 backdrop-blur-sm border-b border-slate-200/50">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500 mb-2">
                <Folder className="w-4 h-4" />
                <span>Meine Fächer</span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-indigo-600">{activeSubject.name}</span>
              </div>
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">{activeSubject.name}</h2>
            </header>

            {/* Tabs Navigation */}
            <div className="px-10 border-b border-slate-200 bg-white/30 backdrop-blur-md">
              <div className="flex gap-8">
                <TabButton 
                  active={activeTab === 'database'} 
                  onClick={() => setActiveTab('database')}
                  icon={<Library className="w-4 h-4" />}
                >
                  Wissensdatenbank
                </TabButton>
                <TabButton 
                  active={activeTab === 'generator'} 
                  onClick={() => setActiveTab('generator')}
                  icon={<BrainCircuit className="w-4 h-4" />}
                >
                  Klausur-Generator
                </TabButton>
                <TabButton 
                  active={activeTab === 'feedback'} 
                  onClick={() => setActiveTab('feedback')}
                  icon={<FileBadge className="w-4 h-4" />}
                >
                  Korrektur & Feedback
                </TabButton>
              </div>
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 overflow-y-auto p-10">
              <div className="max-w-4xl mx-auto">
                {activeTab === 'database' && <DatabaseTab />}
                {activeTab === 'generator' && <GeneratorTab />}
                {activeTab === 'feedback' && <FeedbackTab />}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TabButton({ children, active, onClick, icon }: { children: React.ReactNode, active: boolean, onClick: () => void, icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 py-4 px-2 text-sm font-medium transition-colors ${
        active ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      {icon}
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 height-[2px] h-[2px] bg-indigo-600 rounded-t-full shadow-[0_-2px_8px_rgba(79,70,229,0.5)]" />
      )}
    </button>
  );
}

function DatabaseTab() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Dokumente & Skripte</h3>
        <p className="text-slate-500">Lade hier deine Lernmaterialien hoch. Die KI verarbeitet diese automatisch als Grundlage für deine Klausuren.</p>
      </div>

      <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-400 transition-all duration-300 rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer group">
        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
          <UploadCloud className="w-8 h-8 text-indigo-500" />
        </div>
        <h4 className="text-lg font-semibold text-slate-700 mb-1">PDFs (Skripte, Altklausuren) hier ablegen</h4>
        <p className="text-slate-500 text-sm">oder klicken zum Auswählen</p>
      </div>

      <div>
        <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          Hochgeladene Dateien
        </h4>
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <ul className="divide-y divide-slate-100">
            {mockFiles.map(file => (
              <li key={file.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-50 rounded-lg">
                    <FileText className="w-5 h-5 text-rose-500" />
                  </div>
                  <span className="font-medium text-slate-700">{file.name}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {file.status}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function GeneratorTab() {
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleGenerate = () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setIsDone(false);
    
    // Mock API call
    setTimeout(() => {
      setIsGenerating(false);
      setIsDone(true);
    }, 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Klausur-Generator</h3>
        <p className="text-slate-500">Erstelle eine individuelle Übungsklausur basierend auf deiner Wissensdatenbank.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Worüber möchtest du eine Klausur schreiben?
          </label>
          <textarea
            className="w-full h-32 p-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none shadow-sm text-slate-700"
            placeholder="z.B. 3 Aufgaben zu Matrizen, 2 Aufgaben zu Vektorräumen..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={!topic.trim() || isGenerating}
          className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-md ${
            !topic.trim()
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:-translate-y-0.5'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generiere Klausur...
            </>
          ) : (
            <>
              <BrainCircuit className="w-5 h-5" />
              Klausur als PDF generieren
            </>
          )}
        </button>
      </div>

      {(isGenerating || isDone) && (
        <div className="animate-in fade-in zoom-in-95 duration-500">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent my-8" />
          
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            {isGenerating ? (
              <div className="p-4 bg-white rounded-full shadow-sm mb-4 animate-pulse">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            ) : (
              <div className="p-4 bg-white rounded-full shadow-sm mb-4 scale-in duration-300">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
            )}
            
            <h4 className="text-lg font-bold text-slate-800 mb-2">
              {isGenerating ? "KI analysiert Skripte..." : "Deine Klausur ist fertig!"}
            </h4>
            
            {isDone && (
              <button className="mt-4 px-6 py-3 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 hover:text-indigo-600 hover:border-indigo-300 hover:shadow-md transition-all flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download Klausur (PDF)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackTab() {
  const [isUploading, setIsUploading] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const handleUploadClick = () => {
    setIsUploading(true);
    setShowResult(false);
    
    // Mock API call
    setTimeout(() => {
      setIsUploading(false);
      setShowResult(true);
    }, 2500);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Korrektur & Feedback</h3>
        <p className="text-slate-500">Lade deine bearbeitete Klausur hoch, um eine automatische Bewertung zu erhalten.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="border border-slate-200 rounded-xl p-4 mb-6 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
              <UploadCloud className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="font-medium text-slate-700">Bild oder PDF auswählen</p>
              <p className="text-xs text-slate-500">Scans deiner Handschrift werden unterstützt</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            Durchsuchen
          </button>
        </div>

        <button
          onClick={handleUploadClick}
          disabled={isUploading}
          className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-md ${
            isUploading
              ? 'bg-slate-100 text-slate-400 shadow-none'
              : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5'
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analysiere Antworten...
            </>
          ) : (
            <>
              <PieChart className="w-5 h-5" />
              Ergebnis hochladen & KI-Feedback erhalten
            </>
          )}
        </button>
      </div>

      {showResult && (
        <div className="bg-gradient-to-br from-white to-indigo-50/30 p-8 rounded-3xl border border-slate-200 shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-200">
              A-
            </div>
            <div>
              <h4 className="text-2xl font-bold text-slate-800 tracking-tight">Klausur-Ergebnis</h4>
              <p className="text-indigo-600 font-medium">14 von 20 Punkten erreicht (70%)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm">
              <h5 className="font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Stärken
              </h5>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" /> Sehr guter Lösungsansatz bei Aufgabe 1</li>
                <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" /> Korrekte Definition von Vektorräumen</li>
              </ul>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-amber-100 shadow-sm">
              <h5 className="font-semibold text-amber-700 mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Schwächen laut Skript
              </h5>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" /> Vorzeichenfehler in der Matrizenmultiplikation (siehe Skript S. 42)</li>
                <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" /> Begründung in Aufgabe 3 war unvollständig</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
