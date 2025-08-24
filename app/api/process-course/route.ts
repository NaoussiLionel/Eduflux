import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin-client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Course } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  const body = await request.json();

  if (body.type !== 'INSERT' || body.table !== 'courses') {
    return NextResponse.json({ message: 'Ignoring event' }, { status: 200 });
  }

  const courseRecord = body.record as Course;

  await supabaseAdmin
    .from('courses')
    .update({ status: 'processing' })
    .eq('id', courseRecord.id);

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
      You are an expert curriculum designer. Based on the following topic, create a detailed course outline.
      The outline should have a logical flow with modules and lessons.
      The number of modules should be around ${courseRecord.generation_params?.num_modules || 5}.

      Return the result as a single, valid JSON object. Do not include any text or markdown formatting before or after the JSON.
      The JSON object should have a single key "modules", which is an array of objects.
      Each module object should have a "title" (string) and a "lessons" (array of strings) key.
      Example: { "modules": [ { "title": "Module 1: Introduction", "lessons": ["Lesson 1.1: What is...", "Lesson 1.2: Key Concepts"] } ] }

      Topic:
      ---
      ${courseRecord.source_topic}
      ---
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const courseContent = JSON.parse(text);

    await supabaseAdmin
      .from('courses')
      .update({ status: 'completed', course_content: courseContent })
      .eq('id', courseRecord.id);

  } catch (error: any) {
    await supabaseAdmin
      .from('courses')
      .update({ status: 'failed', error_message: error.message })
      .eq('id', courseRecord.id);
  }

  return NextResponse.json({ message: 'Processing complete' }, { status: 200 });
}