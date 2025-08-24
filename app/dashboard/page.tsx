'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Course, Exam, Quiz } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'exams' | 'courses' | 'quizzes'>('exams');

  // State for ExamForge
  const [exams, setExams] = useState<Exam[]>([]);
  const [examTitle, setExamTitle] = useState('');
  const [examSourceText, setExamSourceText] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  // State for EduCraft
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseSourceTopic, setCourseSourceTopic] = useState('');
  const [numModules, setNumModules] = useState(5);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // State for Quiz Lab
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizSourceTopic, setQuizSourceTopic] = useState('');
  const [quizLevel, setQuizLevel] = useState<'beginner' | 'intermediate' | 'expert'>('beginner');
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);

  // State for Quiz Player
  const [quizPlayerState, setQuizPlayerState] = useState({
    currentQuestionIndex: 0,
    score: 0,
    selectedAnswer: '',
    answerStatus: 'unanswered' as 'unanswered' | 'correct' | 'incorrect',
    isFinished: false,
  });
  const [userAnswers, setUserAnswers] = useState<any[]>([]);

  // Shared State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState('');
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);

  useEffect(() => {
    const checkSessionAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // Fetch initial data for both exams and courses
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false });

      if (examsError) setError('Could not fetch exams.');
      else setExams(examsData || []);

      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (coursesError) setError('Could not fetch courses.');
      else setCourses(coursesData || []);

      const { data: quizzesData, error: quizzesError } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });

      if (quizzesError) setError('Could not fetch quizzes.');
      else setQuizzes(quizzesData || []);
    };

    checkSessionAndFetchData();

    // Set up real-time subscriptions
    const examChannel = supabase
      .channel('exams-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exams' },
        (payload) => {
          // A bit more efficient: update or insert into the existing state
          const newRecord = payload.new as Exam;
          setExams(currentExams => {
            const examExists = currentExams.find(e => e.id === newRecord.id);
            if (examExists) {
              return currentExams.map(e => e.id === newRecord.id ? newRecord : e);
            }
            // Add new exams to the top of the list
            return [newRecord, ...currentExams].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          });
        }
      )
      .subscribe();

    const courseChannel = supabase
      .channel('courses-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'courses' },
        (payload) => {
          const newRecord = payload.new as Course;
          setCourses(currentCourses => {
            const courseExists = currentCourses.find(c => c.id === newRecord.id);
            if (courseExists) {
              return currentCourses.map(c => c.id === newRecord.id ? newRecord : c);
            }
            return [newRecord, ...currentCourses].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          });
        }
      )
      .subscribe();

    const quizChannel = supabase
      .channel('quizzes-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quizzes' },
        (payload) => {
          const newRecord = payload.new as Quiz;
          setQuizzes(currentQuizzes => {
            const quizExists = currentQuizzes.find(q => q.id === newRecord.id);
            if (quizExists) return currentQuizzes.map(q => q.id === newRecord.id ? newRecord : q);
            return [newRecord, ...currentQuizzes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(examChannel);
      supabase.removeChannel(courseChannel);
      supabase.removeChannel(quizChannel);
    };

  }, [supabase, router]);

  // --- Handlers ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const response = await fetch('/api/exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: examTitle,
        source_text: examSourceText,
        generation_params: { num_questions: numQuestions },
      }),
    });

    if (response.ok) {
      setExamTitle('');
      setExamSourceText('');
    } else {
      setError('Error creating exam. Please try again.');
    }

    setIsLoading(false);
  };

  const handleCourseSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const response = await fetch('/api/course', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: courseTitle,
        source_topic: courseSourceTopic,
        generation_params: { num_modules: numModules },
      }),
    });

    if (response.ok) {
      setCourseTitle('');
      setCourseSourceTopic('');
    } else {
      setError('Error creating course. Please try again.');
    }
    setIsLoading(false);
  };

  const handleQuizSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const response = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: quizTitle,
        source_topic: quizSourceTopic,
        level: quizLevel,
      }),
    });

    if (response.ok) {
      setQuizTitle('');
      setQuizSourceTopic('');
    } else {
      setError('Error creating quiz. Please try again.');
    }

    setIsLoading(false);
  };

  const handleExamDelete = async (examId: number) => {
    if (!window.confirm('Are you sure you want to delete this exam? This action cannot be undone.')) {
      return;
    }

    const response = await fetch(`/api/exam/${examId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      // Optimistically remove the exam from the UI
      setExams(currentExams => currentExams.filter(e => e.id !== examId));
    } else {
      setError('Failed to delete the exam. Please try again.');
    }
  };

  const handleCourseDelete = async (courseId: number) => {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    const response = await fetch(`/api/course/${courseId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setCourses(currentCourses => currentCourses.filter(c => c.id !== courseId));
    } else {
      setError('Failed to delete the course. Please try again.');
    }
  };

  const handleQuizDelete = async (quizId: number) => {
    if (!window.confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return;
    }
    
    const response = await fetch(`/api/quiz/${quizId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setQuizzes(currentQuizzes => currentQuizzes.filter(q => q.id !== quizId));
    } else {
      setError('Failed to delete the quiz. Please try again.');
    }
  };

  const handleCopyToClipboard = () => {
    if (!selectedExam || !selectedExam.exam_content) return;

    const textToCopy = selectedExam.exam_content.questions
      .map((q: any, index: number) => {
        const options = q.options.map((opt: string) => `- ${opt}`).join('\n');
        return `${index + 1}. ${q.question}\n${options}\nCorrect Answer: ${q.answer}`;
      })
      .join('\n\n');

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000); // Reset after 2 seconds
    }, (err) => {
      setCopySuccess('Failed to copy');
      setTimeout(() => setCopySuccess(''), 2000);
    });
  };

  const handleStartQuiz = (quiz: Quiz) => {
    setQuizPlayerState({
      currentQuestionIndex: 0,
      score: 0,
      selectedAnswer: '',
      answerStatus: 'unanswered',
      isFinished: false,
    });
    setUserAnswers([]);
    setSelectedQuiz(quiz);
  };

  const handleAnswerSelect = (option: string) => {
    if (quizPlayerState.answerStatus !== 'unanswered' || !selectedQuiz) return;

    const isCorrect = option === selectedQuiz?.quiz_content?.questions[quizPlayerState.currentQuestionIndex].answer;
    setQuizPlayerState(prevState => ({
      ...prevState,
      selectedAnswer: option,
      answerStatus: isCorrect ? 'correct' : 'incorrect',
      score: isCorrect ? prevState.score + 1 : prevState.score,
    }));

    setUserAnswers(prevAnswers => [
      ...prevAnswers,
      {
        question: selectedQuiz.quiz_content?.questions[quizPlayerState.currentQuestionIndex].question,
        selected: option,
        correct: selectedQuiz.quiz_content?.questions[quizPlayerState.currentQuestionIndex].answer,
      }
    ]);
  };

  const handleNextQuestion = () => {
    if (quizPlayerState.currentQuestionIndex < (selectedQuiz?.quiz_content?.questions.length || 0) - 1) {
      setQuizPlayerState(prevState => ({
        ...prevState,
        currentQuestionIndex: prevState.currentQuestionIndex + 1,
        selectedAnswer: '',
        answerStatus: 'unanswered',
        isFinished: false,
      }));
    } else {
      // Quiz is finished, save the attempt
      saveQuizAttempt();
      setQuizPlayerState(prevState => ({ ...prevState, isFinished: true }));
    }
  };

  const saveQuizAttempt = async () => {
    if (!selectedQuiz) return;
    setIsSubmittingScore(true);
    await fetch('/api/quiz/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quiz_id: selectedQuiz.id,
        score: quizPlayerState.score,
        answers: userAnswers,
      }),
    });
    setIsSubmittingScore(false);
  };


  // --- Render Logic ---
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Eduflux Dashboard</h1>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:block">{user.email}</span>
              <button onClick={handleLogout} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                Log out
              </button>
            </div>
          )}
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button onClick={() => setActiveTab('exams')} className={`${activeTab === 'exams' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                ExamForge
              </button>
              <button onClick={() => setActiveTab('courses')} className={`${activeTab === 'courses' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                EduCraft
              </button>
              <button onClick={() => setActiveTab('quizzes')} className={`${activeTab === 'quizzes' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                Quiz Lab
              </button>
              <Link href="/leaderboard" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                Leaderboard
              </Link>
            </nav>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* --- Left Column: Forms --- */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-lg shadow">
                {activeTab === 'exams' && (
                  <form onSubmit={handleSubmit}>
                    <h2 className="text-xl font-bold mb-4">Create a New Exam</h2>
                    <div className="mb-4">
                      <label htmlFor="examTitle" className="block text-sm font-medium text-gray-700">Exam Title</label>
                      <input type="text" id="examTitle" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="examSourceText" className="block text-sm font-medium text-gray-700">Source Material</label>
                      <textarea id="examSourceText" value={examSourceText} onChange={(e) => setExamSourceText(e.target.value)} rows={10} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Paste your course notes, a chapter from a book..." required></textarea>
                    </div>
                    <div className="mb-6">
                      <label htmlFor="numQuestions" className="block text-sm font-medium text-gray-700">Number of Questions</label>
                      <input type="number" id="numQuestions" value={numQuestions} onChange={(e) => setNumQuestions(parseInt(e.target.value, 10))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" min="1" max="50" required />
                    </div>
                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                    <button type="submit" disabled={isLoading} className="w-full rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-gray-400">
                      {isLoading ? 'Forging...' : 'Forge Exam'}
                    </button>
                  </form>
                )}
                {activeTab === 'courses' && (
                  <form onSubmit={handleCourseSubmit}>
                    <h2 className="text-xl font-bold mb-4">Create a New Course Outline</h2>
                    <div className="mb-4">
                      <label htmlFor="courseTitle" className="block text-sm font-medium text-gray-700">Course Title</label>
                      <input type="text" id="courseTitle" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="courseSourceTopic" className="block text-sm font-medium text-gray-700">Main Topic</label>
                      <textarea id="courseSourceTopic" value={courseSourceTopic} onChange={(e) => setCourseSourceTopic(e.target.value)} rows={5} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="e.g., 'Introduction to Quantum Physics'" required></textarea>
                    </div>
                    <div className="mb-6">
                      <label htmlFor="numModules" className="block text-sm font-medium text-gray-700">Number of Modules</label>
                      <input type="number" id="numModules" value={numModules} onChange={(e) => setNumModules(parseInt(e.target.value, 10))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" min="1" max="20" required />
                    </div>
                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                    <button type="submit" disabled={isLoading} className="w-full rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-gray-400">
                      {isLoading ? 'Crafting...' : 'Craft Course'}
                    </button>
                  </form>
                )}
                {activeTab === 'quizzes' && (
                  <form onSubmit={handleQuizSubmit}>
                    <h2 className="text-xl font-bold mb-4">Create a New Quiz</h2>
                    <div className="mb-4">
                      <label htmlFor="quizTitle" className="block text-sm font-medium text-gray-700">Quiz Title</label>
                      <input type="text" id="quizTitle" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="quizSourceTopic" className="block text-sm font-medium text-gray-700">Main Topic</label>
                      <input type="text" id="quizSourceTopic" value={quizSourceTopic} onChange={(e) => setQuizSourceTopic(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="e.g., 'The American Revolution'" required />
                    </div>
                    <div className="mb-6">
                      <label htmlFor="quizLevel" className="block text-sm font-medium text-gray-700">Difficulty Level</label>
                      <select id="quizLevel" value={quizLevel} onChange={(e) => setQuizLevel(e.target.value as any)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="expert">Expert</option>
                      </select>
                    </div>
                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                    <button type="submit" disabled={isLoading} className="w-full rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-gray-400">
                      {isLoading ? 'Generating...' : 'Generate Quiz'}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* --- Right Column: Lists --- */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold mb-4">Your {activeTab === 'exams' ? 'Exams' : activeTab === 'courses' ? 'Courses' : 'Quizzes'}</h2>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <ul role="list" className="divide-y divide-gray-200">
                  {(activeTab === 'exams' ? exams : activeTab === 'courses' ? courses : quizzes).map((item) => (
                    <li key={item.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{item.title}</p>
                        <p className="text-sm text-gray-500">Status: <StatusBadge status={item.status} /></p>
                      </div>
                      <div className="flex items-center gap-4">
                        {item.status === 'completed' && (
                          <button onClick={() => {
                            if (activeTab === 'exams') setSelectedExam(item as Exam);
                            if (activeTab === 'courses') setSelectedCourse(item as Course);
                            if (activeTab === 'quizzes') handleStartQuiz(item as Quiz);
                          }} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                            {activeTab === 'quizzes' ? 'Start' : 'View'}
                          </button>
                        )}
                        <button onClick={() => {
                          if (activeTab === 'exams') handleExamDelete(item.id);
                          if (activeTab === 'courses') handleCourseDelete(item.id);
                          if (activeTab === 'quizzes') handleQuizDelete(item.id);
                        }} className="text-sm font-semibold text-red-600 hover:text-red-500">
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* --- Modals --- */}
      {selectedExam && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">{selectedExam.title}</h3>
                <div className="flex items-center gap-4">
                  <button onClick={handleCopyToClipboard} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                    {copySuccess || 'Copy'}
                  </button>
                  <button onClick={() => setSelectedExam(null)} className="text-gray-400 hover:text-gray-500 text-2xl leading-none">&times;</button>
                </div>
              </div>
            </div>
            <div className="p-6 overflow-y-auto">
              {selectedExam.exam_content?.questions?.map((q: any, index: number) => (
                <div key={index} className="mb-4 p-4 border rounded-md">
                  <p className="font-semibold">{index + 1}. {q.question}</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {q.options.map((opt: string, i: number) => (
                      <li key={i} className={opt === q.answer ? 'text-green-600 font-bold' : ''}>{opt}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedCourse && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">{selectedCourse.title}</h3>
                <button onClick={() => setSelectedCourse(null)} className="text-gray-400 hover:text-gray-500 text-2xl leading-none">&times;</button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto">
              {selectedCourse.course_content?.modules?.map((mod: any, index: number) => (
                <div key={index} className="mb-6">
                  <h4 className="font-bold text-lg text-gray-800">{mod.title}</h4>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-600">
                    {mod.lessons.map((lesson: string, i: number) => (
                      <li key={i}>{lesson}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedQuiz && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50" onClick={() => setSelectedQuiz(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">{selectedQuiz.title}</h3>
              <button onClick={() => setSelectedQuiz(null)} className="text-gray-400 hover:text-gray-500 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto">
              {!quizPlayerState.isFinished ? (
                <div>
                  <div className="flex justify-between items-baseline mb-4">
                    <h4 className="text-xl font-bold">Question {quizPlayerState.currentQuestionIndex + 1} of {selectedQuiz.quiz_content?.questions.length}</h4>
                    <p className="font-semibold">Score: {quizPlayerState.score}</p>
                  </div>
                  <p className="text-lg mb-6">{selectedQuiz.quiz_content?.questions[quizPlayerState.currentQuestionIndex].question}</p>
                  <div className="space-y-3">
                    {selectedQuiz.quiz_content?.questions[quizPlayerState.currentQuestionIndex].options.map((option, i) => {
                      const isSelected = quizPlayerState.selectedAnswer === option;
                      const isCorrect = selectedQuiz.quiz_content?.questions[quizPlayerState.currentQuestionIndex].answer === option;
                      let buttonClass = 'w-full text-left p-4 rounded-lg border-2 transition-colors ';
                      if (quizPlayerState.answerStatus === 'unanswered') {
                        buttonClass += 'bg-gray-100 hover:bg-gray-200 border-gray-200';
                      } else {
                        if (isSelected && isCorrect) buttonClass += 'bg-green-100 border-green-500';
                        else if (isSelected && !isCorrect) buttonClass += 'bg-red-100 border-red-500';
                        else if (isCorrect) buttonClass += 'bg-green-100 border-green-500';
                        else buttonClass += 'bg-gray-50 border-gray-200 text-gray-500';
                      }
                      return (
                        <button key={i} onClick={() => handleAnswerSelect(option)} disabled={quizPlayerState.answerStatus !== 'unanswered'} className={buttonClass}>
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  {quizPlayerState.answerStatus !== 'unanswered' && (
                    <div className="mt-6 p-4 rounded-lg bg-gray-50 animate-fade-in">
                      <p className={`font-bold ${quizPlayerState.answerStatus === 'correct' ? 'text-green-600' : 'text-red-600'}`}>
                        {quizPlayerState.answerStatus === 'correct' ? selectedQuiz.quiz_content?.questions[quizPlayerState.currentQuestionIndex].feedback_correct : selectedQuiz.quiz_content?.questions[quizPlayerState.currentQuestionIndex].feedback_incorrect}
                      </p>
                      <p className="mt-2 text-sm text-gray-700">{selectedQuiz.quiz_content?.questions[quizPlayerState.currentQuestionIndex].explanation}</p>
                      <button onClick={handleNextQuestion} className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                        {quizPlayerState.currentQuestionIndex < (selectedQuiz.quiz_content?.questions.length || 0) - 1 ? 'Next Question' : 'Finish Quiz'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 animate-fade-in">
                  <h3 className="text-2xl font-bold">Quiz Complete!</h3>
                  <p className="text-4xl font-bold my-4">{quizPlayerState.score} / {selectedQuiz.quiz_content?.questions.length}</p>
                  <p className="text-gray-600">You've completed the quiz. Great job!</p>
                  <button onClick={() => handleStartQuiz(selectedQuiz)} disabled={isSubmittingScore} className="mt-8 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-gray-400">
                    Try Again
                  </button>
                </div>
              )}
            </div>
            <div className="p-4 bg-gray-50 border-t text-center">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${((quizPlayerState.currentQuestionIndex + (quizPlayerState.answerStatus !== 'unanswered' ? 1 : 0)) / (selectedQuiz.quiz_content?.questions.length || 1)) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}