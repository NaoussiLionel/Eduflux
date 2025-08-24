import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin-client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Quiz } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  const body = await request.json();

  if (body.type !== 'INSERT' || body.table !== 'quizzes') {
    return NextResponse.json({ message: 'Ignoring event' }, { status: 200 });
  }

  const quizRecord = body.record as Quiz;

  await supabaseAdmin
    .from('quizzes')
    .update({ status: 'processing' })
    .eq('id', quizRecord.id);

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
      You are an expert in gamified learning. Based on the following topic and difficulty level, create a multiple-choice quiz.
      The quiz should have exactly 10 questions.
      Each question must have 4 options, with one correct answer.

      For each question, provide:
      1. The question text.
      2. The array of 4 options.
      3. The correct answer text.
      4. A short, encouraging feedback message for a CORRECT answer (e.g., "Great job!").
      5. A short, helpful feedback message for an INCORRECT answer (e.g., "Not quite!").
      6. A detailed explanation of why the correct answer is right.

      Return the result as a single, valid JSON object. Do not include any text or markdown formatting before or after the JSON.
      The JSON object should have a single key "questions", which is an array of objects.
      Each object in the array must have this exact structure:
      { "question": "...", "options": ["...", "...", "...", "..."], "answer": "...", "feedback_correct": "...", "feedback_incorrect": "...", "explanation": "..." }

      Topic: "${quizRecord.source_topic}"
      Difficulty Level: "${quizRecord.level}"
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean the response to ensure it's valid JSON
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const quizContent = JSON.parse(cleanedText);

    await supabaseAdmin
      .from('quizzes')
      .update({ status: 'completed', quiz_content: quizContent })
      .eq('id', quizRecord.id);

  } catch (error: any) {
    await supabaseAdmin
      .from('quizzes')
      .update({
        status: 'failed',
        error_message: 'Failed to generate quiz. The AI may have returned an invalid format. Please try again.',
      })
      .eq('id', quizRecord.id);
  }

  return NextResponse.json({ message: 'Processing complete' }, { status: 200 });
}