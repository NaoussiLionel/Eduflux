import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin-client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Exam } from '@/types';

// Initialize the Google AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  const webhookSecret = request.headers.get('x-webhook-secret');
  if (webhookSecret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // We only care about new rows being inserted
  if (body.type !== 'INSERT') {
    return NextResponse.json({ message: 'Ignoring event type' }, { status: 200 });
  }

  const examRecord = body.record as Exam;

  // 1. Update status to 'processing'
  await supabaseAdmin
    .from('exams')
    .update({ status: 'processing' })
    .eq('id', examRecord.id);

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // 2. Craft the prompt for the AI
    const prompt = `
      You are an expert exam creator. Based on the following source material, create a multiple-choice exam.
      The exam should have exactly ${examRecord.generation_params?.num_questions || 10} questions.
      Each question must have 4 options, with one correct answer.

      Return the result as a single, valid JSON object. Do not include any text or markdown formatting before or after the JSON.
      The JSON object should have a single key "questions", which is an array of objects.
      Each object in the array should have the following structure:
      { "question": "The question text", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": "The correct option text" }

      Source Material:
      ---
      ${examRecord.source_text}
      ---
    `;

    // 3. Call the AI
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 4. Parse the JSON response from the AI
    const examContent = JSON.parse(text);

    // 5. Update the exam record to 'completed' with the content
    await supabaseAdmin
      .from('exams')
      .update({ status: 'completed', exam_content: examContent })
      .eq('id', examRecord.id);

  } catch (error: any) {
    // If anything goes wrong, update the status to 'failed'
    await supabaseAdmin
      .from('exams')
      .update({ status: 'failed', error_message: error.message })
      .eq('id', examRecord.id);
  }

  return NextResponse.json({ message: 'Processing complete' }, { status: 200 });
}