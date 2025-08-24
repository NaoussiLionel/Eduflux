export type Exam = {
  id: number;
  created_at: string;
  title: string;
  source_text: string | null;
  generation_params: { [key: string]: any } | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  exam_content: { [key: string]: any } | null;
  error_message: string | null;
  user_id: string;
};

export type Course = {
  id: number;
  created_at: string;
  title: string;
  source_topic: string | null;
  generation_params: { [key: string]: any } | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  course_content: { [key: string]: any } | null;
  error_message: string | null;
  user_id: string;
};

export type GameJSON = {
  questions: {
    question: string;
    options: string[];
    answer: string;
    feedback_correct: string;
    feedback_incorrect: string;
    explanation: string;
  }[];
};

export type Quiz = {
  id: number;
  created_at: string;
  title: string;
  source_topic: string | null;
  level: 'beginner' | 'intermediate' | 'expert' | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  quiz_content: GameJSON | null;
  error_message: string | null;
  user_id: string;
};

export type QuizAttempt = {
  id: number;
  // ... other fields
};