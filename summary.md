# Zusammenfassung: ExamAI 🚀

ExamAI ist eine hochspezialisierte Full-Stack-Plattform, die den Lern- und Prüfungsprozess an Universitäten durch den gezielten Einsatz von Künstlicher Intelligenz (GPT-4o) und professionellem Satzbau (LaTeX) automatisiert.

---

## 1. Features: Was kann ExamAI und wie funktionieren diese?

### 📁 Wissensdatenbank (Knowledge Base)
- **Funktion:** Nutzer (Dozenten oder Studierende) laden Vorlesungsskripte, Übungsblätter oder Altklausuren als PDF hoch.
- **Funktionsweise:** Das Tool extrahiert den Text aus diesen Dokumenten (via `pdf-parse`). Diese Informationen dienen als exklusiver Kontext für die KI, um sicherzustellen, dass generierte Inhalte exakt auf den Modulstoff zugeschnitten sind ("No Hallucinations"-Prinzip).

### 📝 Automatischer Klausur-Generator
- **Funktion:** Erstellung von individuellen Übungsklausuren inklusive Punkteverteilung und Notenspiegel.
- **Funktionsweise:** Basierend auf den Inhalten der Wissensdatenbank und optionalen Nutzerwünschen (Schwierigkeit, Themenfokus) generiert die KI einen professionellen LaTeX-Code. Dieser Code wird serverseitig in ein druckfertiges PDF kompiliert.
- **Besonderheit:** Es wird zeitgleich eine **vollständige Musterlösung** generiert, die ebenfalls als PDF zur Verfügung steht.

### ✍️ Korrektur & Feedback-Modus
- **Funktion:** Automatisierte Benotung und detailliertes Feedback zu studentischen Lösungsversuchen.
- **Funktionsweise:** Ein Studierender lädt seinen Lösungsversuch (PDF oder Bild) hoch. Das Tool vergleicht den Versuch mit der ursprünglichen Aufgabenstellung und der Musterlösung.
- **Output:** Der Nutzer erhält eine Punktzahl pro Aufgabe, eine Stärken-Schwächen-Analyse sowie konkrete Tipps zur Verbesserung.

### cards Flashcards (Anki-Integration)
- **Funktion:** Extraktion von Lernkarten direkt aus dem hochgeladenen Stoff.
- **Funktionsweise:** Die KI identifiziert Kernkonzepte und erstellt daraus ein CSV-Format, das direkt in Tools wie Anki importiert werden kann.

---

## 2. Technische Umsetzung & Besonderheiten

### Tech-Stack
- **Frontend:** React mit TypeScript, Vite für schnelles Development und Tailwind CSS für ein modernes Interface.
- **Backend:** Node.js (Express) als zentrale API.
- **Datenbank:** PostgreSQL zur Verwaltung von Kursen, Dokument-Metadaten und generierten Prüfungen.
- **Storage:** Cloudinary wird als persistenter Cloud-Speicher für alle generierten und hochgeladenen PDFs genutzt.

### Technische Besonderheiten & Detailtiefe

#### A. Die LaTeX-Pipeline (Zentrales Alleinstellungsmerkmal)
Im Gegensatz zu einfachen Text-Generatoren setzt ExamAI auf echte LaTeX-Kompilierung, um mathematische Formeln und Tabellen in höchster Qualität darzustellen:
1. **Prompt-Engineering:** Die System-Prompts für OpenAI enthalten strikte Regeln für die LaTeX-Präambel und erlaubte Packages (`amsmath`, `amssymb`), um Kompilierfehler zu vermeiden.
2. **Sanitization-Engine:** Ein komplexer Regex-basierter Reinigungsalgorithmus im Backend (`sanitizeLatexCode`) korrigiert typische KI-Fehler:
   - Ersetzung von Unicode-Symbolen (z.B. `≥`, `≠`) durch LaTeX-Befehle (`\geq`, `\neq`).
   - Automatisches Escaping von Sonderzeichen wie Unterstrichen (`_`) außerhalb des Mathe-Modus, die sonst den Compiler zum Absturz bringen würden.
   - Entfernung von unsicheren Paketen, die lokale Sicherheitsrisiken darstellen könnten.
3. **Local Compilation:** Der Server nutzt eine lokale LaTeX-Distribution (`pdflatex`). Jede Klausur wird in einem isolierten, temporären OS-Verzeichnis zweimal kompiliert, um Referenzen (wie Aufgabenlisten oder Tabellen) korrekt aufzulösen.

#### B. Workflow-Orchestrierung via n8n
Für komplexe, asynchrone Aufgaben nutzt das Tool **n8n-Webhooks**:
- Die Extraktion von Wissen und die Generierung von Flashcards erfolgt über dedizierte n8n-Workflows. Dies ermöglicht eine modulare Skalierbarkeit und die einfache Integration weiterer KI-Modelle oder Logiken, ohne den Core-Server Code-technisch zu überladen.

#### C. Full-Circle Feedback Loop
Die technische Besonderheit im Feedback-Modus liegt in der Verknüpfung von drei Datenquellen:
1. Der Original-Kontext (Vorlesungsstoff).
2. Die spezifische Aufgabenstellung (generierte Klausur).
3. Der individuelle studentische Upload.
Dies erlaubt eine Präzision in der Korrektur, die weit über einfache Textvergleiche hinausgeht.

---

*Zusammenfassend ist ExamAI ein präzises Werkzeug, das akademische Strenge (LaTeX) mit moderner KI-Intelligenz verbindet.*
