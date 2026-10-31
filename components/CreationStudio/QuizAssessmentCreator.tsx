import React, { useState } from 'react';
import { BookOpen, Check, HelpCircle, RefreshCw, Award, Copy, Download, Save, Play, ChevronRight, MessageSquare, Layers, AlertCircle, Eye } from 'lucide-react';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';
import { MediaItem } from '../../types';

interface QuizAssessmentCreatorProps {
  session?: any | null;
  onSaveArtifact?: (mediaItem: MediaItem) => void;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

interface Flashcard {
  id: number;
  front: string;
  back: string;
}

export const QuizAssessmentCreator: React.FC<QuizAssessmentCreatorProps> = ({ session, onSaveArtifact }) => {
  const [assessmentType, setAssessmentType] = useState<'quiz' | 'flashcards'>('quiz');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [questionCount, setQuestionCount] = useState(5);
  const [useSessionData, setUseSessionData] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Quiz Gameplay State
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Flashcards gameplay state
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  const handleGenerate = async () => {
    setIsProcessing(true);
    setError(null);
    setQuestions([]);
    setFlashcards([]);
    setQuizStarted(false);
    setQuizFinished(false);
    setCurrentQuestionIndex(0);
    setScore(0);
    setAnswered(false);
    setSelectedOption(null);
    setFlippedCards({});

    try {
      // Gather selected media
      const selectedItems = useSessionData 
        ? (session?.mediaItems?.filter((item: MediaItem) =>
            session?.selectedMediaIds?.includes(item.id)
          ) || [])
        : [];

      let prompt = '';
      if (assessmentType === 'quiz') {
        prompt = `Act as an expert Instructional Designer. 
Based on the ${selectedItems.length > 0 ? 'provided source materials' : 'specifications'}, create a highly accurate, structured Multiple-Choice Quiz.

USER SPECIFICATIONS:
- Difficulty Level: ${difficulty}
- Number of Questions: ${questionCount}

OUTPUT REQUIREMENTS:
You MUST output the quiz as a JSON array inside a clear codeblock wrapper. Each element in the array must be an object matching this strict typescript structure:
interface QuizQuestion {
  id: number;
  question: string;
  options: string[]; // Exactly 4 choices
  correctAnswerIndex: number; // 0-indexed index of the correct option
  explanation: string; // Explaining why the answer is correct
}

Ensure your response is valid JSON that can be parsed by JSON.parse. Wrap it inside a \`\`\`json and \`\`\` block.`;
      } else {
        prompt = `Act as an expert Instructional Designer.
Based on the ${selectedItems.length > 0 ? 'provided source materials' : 'specifications'}, create a set of highly informative Study Flashcards.

USER SPECIFICATIONS:
- Difficulty Level: ${difficulty}
- Number of Cards: ${questionCount}

OUTPUT REQUIREMENTS:
You MUST output the cards as a JSON array inside a clear codeblock wrapper. Each element in the array must be an object matching this strict typescript structure:
interface Flashcard {
  id: number;
  front: string; // Term or Question
  back: string; // Explanation, context, or answer
}

Ensure your response is valid JSON that can be parsed by JSON.parse. Wrap it inside a \`\`\`json and \`\`\` block.`;
      }

      const responseText = await generateUnifiedAIResponse(prompt, selectedItems);

      // Extract JSON from response
      const jsonMatch = responseText.match(/```json([\s\S]*?)```/) || responseText.match(/\[([\s\S]*?)\]/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
      const parsedData = JSON.parse(jsonString.trim());

      if (assessmentType === 'quiz') {
        if (Array.isArray(parsedData)) {
          setQuestions(parsedData);
        } else {
          throw new Error("Parsed data was not a valid array.");
        }
      } else {
        if (Array.isArray(parsedData)) {
          setFlashcards(parsedData);
        } else {
          throw new Error("Parsed data was not a valid array.");
        }
      }
    } catch (e) {
      console.error(e);
      setError("Failed to parse response into a structured interactive format. This can happen occasionally. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectOption = (idx: number) => {
    if (answered) return;
    setSelectedOption(idx);
  };

  const handleCheckAnswer = () => {
    if (selectedOption === null || answered) return;
    setAnswered(true);
    const correct = selectedOption === questions[currentQuestionIndex].correctAnswerIndex;
    if (correct) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    setAnswered(false);
    setSelectedOption(null);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const toggleFlashcard = (id: number) => {
    setFlippedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSaveToSession = () => {
    if (!onSaveArtifact) return;

    let htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Interactive Study Guide & Assessment</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #0b0f19; color: #e2e8f0; padding: 2rem; }
        .quiz-card { background: #111827; border: 1px solid #374151; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
        h1 { font-size: 1.75rem; color: #f59e0b; font-weight: 800; margin-bottom: 1.5rem; border-bottom: 2px solid #eab308; padding-bottom: 0.5rem; }
    </style>
</head>
<body>
    <div class="max-w-3xl mx-auto">
        <h1>🎓 Study Assessment Suite: ${difficulty}</h1>
        
        ${assessmentType === 'quiz' ? `
        <div class="space-y-6">
            ${questions.map((q, i) => `
            <div class="quiz-card">
                <p class="font-bold mb-3">${i + 1}. ${q.question}</p>
                <div class="space-y-2 mb-3">
                    ${q.options.map((opt, oIdx) => `
                    <div class="p-2 rounded text-sm ${oIdx === q.correctAnswerIndex ? 'bg-green-900/40 text-green-400 border border-green-800' : 'bg-gray-800 text-gray-400'}">
                        ${opt} ${oIdx === q.correctAnswerIndex ? '✓' : ''}
                    </div>
                    `).join('')}
                </div>
                <div class="text-xs text-amber-400 italic">Explanation: ${q.explanation}</div>
            </div>
            `).join('')}
        </div>
        ` : `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${flashcards.map(c => `
            <div class="p-4 bg-[#111827] border border-gray-700 rounded-lg">
                <div class="text-amber-400 font-bold text-xs mb-1">FRONT:</div>
                <div class="font-semibold mb-3">${c.front}</div>
                <div class="text-zinc-500 font-bold text-xs mb-1 border-t border-zinc-800 pt-2">BACK:</div>
                <div class="text-sm text-zinc-300">${c.back}</div>
            </div>
            `).join('')}
        </div>
        `}
    </div>
</body>
</html>`;

    const utf8Encode = new TextEncoder().encode(htmlContent);
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(utf8Encode)));

    const name = assessmentType === 'quiz' ? `Quiz Assessment (${difficulty})` : `Study Flashcards (${difficulty})`;
    
    const newArtifact: MediaItem = {
      id: Date.now().toString(),
      name,
      mimeType: 'text/html',
      type: 'html',
      data: base64Data
    };

    onSaveArtifact(newArtifact);
    alert("Saved interactive study resource to your session artifacts!");
  };

  const selectedItemsCount = session?.mediaItems?.filter((item: MediaItem) =>
    session?.selectedMediaIds?.includes(item.id)
  )?.length || 0;

  return (
    <div className="flex flex-col h-full bg-app-bg text-app-text">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-2 border-b border-app-border pb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-yellow-400">
            <BookOpen className="w-6 h-6" /> Quiz & Assessment Suite
          </h2>
          <p className="text-app-dim text-xs mt-1">
            Build and play interactive custom challenges based on the core knowledge in your session sources.
          </p>
        </div>
        
        <div className="flex gap-2">
          {((assessmentType === 'quiz' && questions.length > 0) || (assessmentType === 'flashcards' && flashcards.length > 0)) && (
            <button
              onClick={handleSaveToSession}
              className="px-3 py-1.5 rounded bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-600 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-3.5 h-3.5" /> Save Study Guide
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        {/* Left Side: Setup Column */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-app-card border border-app-border rounded-xl p-4 md:p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-app-dim border-b border-app-border pb-2">
              Setup Parameters
            </h3>

            {/* Context status */}
            <div className="bg-app-bg p-3 rounded border border-app-border text-xs text-app-dim">
              <strong>Source material context:</strong>
              <p className="mt-1">
                {selectedItemsCount > 0 
                  ? `Active session: grounded with ${selectedItemsCount} selected media reference(s).`
                  : '⚠️ No media selected. Go back to your session to pick reference files for the quiz.'}
              </p>
            </div>

            {/* Mode Select */}
            <div>
              <label className="block text-xs font-semibold mb-1.5">Assessment Type</label>
              <div className="grid grid-cols-2 gap-2 bg-app-bg p-1 rounded border border-app-border">
                <button
                  type="button"
                  onClick={() => setAssessmentType('quiz')}
                  className={`py-1.5 rounded text-xs font-bold transition-all ${
                    assessmentType === 'quiz'
                      ? 'bg-yellow-600 text-white shadow'
                      : 'text-app-dim hover:text-app-text'
                  }`}
                >
                  Interactive Quiz
                </button>
                <button
                  type="button"
                  onClick={() => setAssessmentType('flashcards')}
                  className={`py-1.5 rounded text-xs font-bold transition-all ${
                    assessmentType === 'flashcards'
                      ? 'bg-yellow-600 text-white shadow'
                      : 'text-app-dim hover:text-app-text'
                  }`}
                >
                  Flashcards Set
                </button>
              </div>
            </div>

            {/* Knowledge base status */}
            <div className="bg-app-bg p-3 rounded border border-app-border text-xs text-app-dim space-y-2">
              <div className="flex items-center justify-between">
                <strong className="text-app-text">Knowledge base:</strong>
                <input
                  type="checkbox"
                  checked={useSessionData}
                  onChange={(e) => setUseSessionData(e.target.checked)}
                  className="w-3.5 h-3.5 text-yellow-500 bg-app-input border-app-border rounded focus:ring-yellow-500 focus:ring-2"
                />
              </div>
              <p className="mt-1">
                {selectedItemsCount > 0 
                  ? `${useSessionData ? 'Using' : 'Ignoring'} ${selectedItemsCount} selected reference(s) from active session.`
                  : '⚠️ No reference files selected. Assessment will run on general templates.'}
              </p>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-semibold mb-1.5">Cognitive Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-yellow-500"
              >
                <option value="Beginner">🌱 Beginner (Basic Recall & Terms)</option>
                <option value="Intermediate">🧠 Intermediate (Understanding & Context)</option>
                <option value="Advanced">🔥 Advanced (Critical Analysis & Edge Cases)</option>
              </select>
            </div>

            {/* Question Count */}
            <div>
              <label className="block text-xs font-semibold mb-1.5">Number of Items</label>
              <div className="flex gap-2">
                {[3, 5, 8, 10].map(count => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setQuestionCount(count)}
                    className={`flex-1 py-1 rounded text-xs font-semibold border ${
                      questionCount === count
                        ? 'bg-yellow-600/20 text-yellow-400 border-yellow-500/50'
                        : 'bg-app-input text-app-dim border-app-border hover:text-app-text'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleGenerate}
              disabled={isProcessing}
              className="w-full py-2.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:bg-yellow-850/40 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-yellow-900/10"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating Study Guide...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Compile Assessment
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Execution & Interactive Playing Area */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-[450px]">
          
          {/* Processing Screen */}
          {isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-yellow-500/20 border-t-yellow-500 animate-spin"></div>
                <BookOpen className="w-5 h-5 text-yellow-400 absolute top-3.5 left-3.5 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-app-text">Formulating Quiz Questions & Explanations...</p>
              <p className="text-xs text-app-dim text-center max-w-sm">
                Parsing source terms, cross-referencing insights, and mapping distactor answers for an accurate learning challenge.
              </p>
            </div>
          )}

          {/* Error display */}
          {error && !isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 text-center">
              <AlertCircle className="w-12 h-12 text-red-500/40 mb-3" />
              <p className="text-sm font-bold text-red-400">Generation Failed</p>
              <p className="text-xs text-app-dim max-w-md mt-1 mb-4">{error}</p>
              <button
                onClick={handleGenerate}
                className="px-4 py-2 bg-app-bg border border-app-border rounded text-xs font-semibold hover:bg-app-input text-app-text"
              >
                Retry Compile
              </button>
            </div>
          )}

          {/* Idle screen */}
          {!isProcessing && !error && questions.length === 0 && flashcards.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 text-center text-app-dim">
              <Layers className="w-12 h-12 text-yellow-500/30 mb-3" />
              <p className="text-sm font-semibold text-app-text">Assessment Sandbox</p>
              <p className="text-xs max-w-sm mt-1">
                Generate custom multi-choice questions or vocabulary decks to test your recollection of the source documents.
              </p>
            </div>
          )}

          {/* PLAYABLE QUIZ SCREEN */}
          {!isProcessing && questions.length > 0 && (
            <div className="flex-1 flex flex-col bg-app-card border border-app-border rounded-xl p-4 md:p-6 justify-between">
              
              {!quizStarted ? (
                /* Quiz Intro Splash */
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
                  <Award className="w-12 h-12 text-yellow-500 animate-bounce" />
                  <div>
                    <h4 className="text-lg font-bold text-app-text">Quiz is Ready!</h4>
                    <p className="text-xs text-app-dim mt-1">
                      You have a {questions.length}-question challenge compiled at <strong>{difficulty}</strong> cognitive difficulty. Let's see how much you remembered.
                    </p>
                  </div>
                  <button
                    onClick={() => setQuizStarted(true)}
                    className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-xs rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-md"
                  >
                    Start Challenge <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : quizFinished ? (
                /* Quiz Complete Score Splash */
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
                  <Award className="w-16 h-16 text-yellow-500 animate-pulse" />
                  <div>
                    <h4 className="text-2xl font-black text-app-text">Challenge Complete!</h4>
                    <p className="text-lg font-bold text-yellow-400 mt-1">Your Score: {score} / {questions.length}</p>
                    <p className="text-xs text-app-dim mt-2">
                      {score === questions.length 
                        ? "🏆 Outstanding! Flawless recollection of the aggregate data."
                        : score >= questions.length / 2 
                          ? "👍 Great job! You captured the main core mechanics."
                          : "📚 Time to review. Your sources still hold secrets."}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setQuizStarted(false);
                        setQuizFinished(false);
                        setCurrentQuestionIndex(0);
                        setScore(0);
                        setAnswered(false);
                        setSelectedOption(null);
                      }}
                      className="px-4 py-2 bg-app-bg border border-app-border rounded-lg text-xs font-semibold hover:bg-app-input text-app-text transition-colors"
                    >
                      Reset Quiz
                    </button>
                    <button
                      onClick={handleGenerate}
                      className="px-4 py-2 bg-yellow-600 text-black font-bold text-xs rounded-lg hover:bg-yellow-500 transition-colors"
                    >
                      Generate New
                    </button>
                  </div>
                </div>
              ) : (
                /* Active Question Wizard */
                <div className="flex-1 flex flex-col justify-between space-y-6">
                  {/* Progress Header */}
                  <div className="flex justify-between items-center border-b border-app-border pb-3">
                    <span className="text-xs font-bold text-yellow-400 tracking-wider uppercase">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                    <span className="text-xs font-mono text-app-dim">Score: {score}</span>
                  </div>

                  {/* Question Title */}
                  <div className="space-y-4">
                    <h4 className="text-base md:text-lg font-bold text-app-text leading-snug">
                      {questions[currentQuestionIndex].question}
                    </h4>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {questions[currentQuestionIndex].options.map((opt, idx) => {
                        const isSelected = selectedOption === idx;
                        const showCorrect = answered && idx === questions[currentQuestionIndex].correctAnswerIndex;
                        const showIncorrect = answered && isSelected && idx !== questions[currentQuestionIndex].correctAnswerIndex;

                        return (
                          <button
                            key={idx}
                            onClick={() => handleSelectOption(idx)}
                            disabled={answered}
                            className={`p-3 text-left text-xs rounded-lg border transition-all flex items-center justify-between ${
                              showCorrect
                                ? 'bg-green-600/20 text-green-400 border-green-500/50 shadow shadow-green-950/25'
                                : showIncorrect
                                  ? 'bg-red-600/20 text-red-400 border-red-500/50 shadow shadow-red-950/25'
                                  : isSelected
                                    ? 'bg-yellow-600/20 text-yellow-400 border-yellow-500'
                                    : 'bg-app-bg text-app-text border-app-border hover:border-yellow-500/50 hover:bg-app-input'
                            }`}
                          >
                            <span>{opt}</span>
                            {showCorrect && <Check className="w-4 h-4 text-green-400 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Feedback explanation box */}
                  <div className="h-20 flex flex-col justify-center">
                    {answered && (
                      <div className="bg-app-bg border border-app-border rounded-lg p-3 text-xs flex gap-2 animate-fade-in">
                        <HelpCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-app-text mr-1">
                            {selectedOption === questions[currentQuestionIndex].correctAnswerIndex ? 'Correct!' : 'Incorrect.'}
                          </span>
                          <span className="text-app-dim">{questions[currentQuestionIndex].explanation}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Wizard Buttons */}
                  <div className="border-t border-app-border pt-4 flex justify-end gap-2">
                    {!answered ? (
                      <button
                        onClick={handleCheckAnswer}
                        disabled={selectedOption === null}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-yellow-800/45 text-black font-bold text-xs rounded"
                      >
                        Submit Answer
                      </button>
                    ) : (
                      <button
                        onClick={handleNextQuestion}
                        className="px-4 py-2 bg-app-bg border border-app-border hover:bg-app-input text-app-text font-bold text-xs rounded flex items-center gap-1"
                      >
                        {currentQuestionIndex === questions.length - 1 ? 'Finish Results' : 'Next Question'} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                </div>
              )}

            </div>
          )}

          {/* FLASHCARDS SCREEN */}
          {!isProcessing && flashcards.length > 0 && (
            <div className="flex-1 flex flex-col bg-app-card border border-app-border rounded-xl p-4 md:p-6 justify-between space-y-4">
              
              <div className="flex justify-between items-center border-b border-app-border pb-3">
                <span className="text-xs font-bold text-yellow-400 tracking-wider uppercase">
                  Vocab & Terms Flashcard Deck
                </span>
                <span className="text-xs text-app-dim">{flashcards.length} cards generated</span>
              </div>

              {/* Flashcards Grid with 3D Flip style */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto max-h-[380px] p-1">
                {flashcards.map(card => {
                  const isFlipped = flippedCards[card.id] || false;
                  return (
                    <div
                      key={card.id}
                      onClick={() => toggleFlashcard(card.id)}
                      className="cursor-pointer h-40 group [perspective:1000px]"
                    >
                      <div className={`relative w-full h-full text-center transition-transform duration-500 [transform-style:preserve-3d] ${
                        isFlipped ? '[transform:rotateY(180deg)]' : ''
                      }`}>
                        
                        {/* CARD FRONT */}
                        <div className="absolute w-full h-full rounded-xl bg-app-bg border border-app-border hover:border-yellow-500/50 p-4 flex flex-col justify-between [backface-visibility:hidden]">
                          <div className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest text-left">TERM / CONCEPT</div>
                          <p className="text-sm font-bold text-app-text leading-snug px-2 flex-1 flex items-center justify-center">
                            {card.front}
                          </p>
                          <div className="text-[9px] text-app-dim text-right font-mono">Click card to reveal definition</div>
                        </div>

                        {/* CARD BACK */}
                        <div className="absolute w-full h-full rounded-xl bg-yellow-600/10 border border-yellow-500/30 p-4 flex flex-col justify-between [backface-visibility:hidden] [transform:rotateY(180deg)]">
                          <div className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest text-left">DEFINITION / CONTEXT</div>
                          <p className="text-xs text-app-text leading-relaxed px-1 flex-1 flex items-center justify-center overflow-y-auto">
                            {card.back}
                          </p>
                          <div className="text-[9px] text-yellow-400/60 text-right font-mono">Click card to flip back</div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reset/New buttons */}
              <div className="border-t border-app-border pt-4 flex justify-end gap-2">
                <button
                  onClick={() => setFlippedCards({})}
                  className="px-3 py-1.5 rounded bg-app-bg border border-app-border hover:bg-app-input text-xs font-semibold text-app-text"
                >
                  Flip All Front
                </button>
                <button
                  onClick={handleGenerate}
                  className="px-3 py-1.5 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-xs"
                >
                  Generate New Deck
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
