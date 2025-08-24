import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse the request body
    const body = await request.json();
    const { title, source_text, generation_params } = body;

    if (!title || !source_text) {
      return NextResponse.json({ error: 'Title and source text are required' }, { status: 400 });
    }

    // 3. Insert a new record into the 'exams' table
    const { data, error } = await supabase
      .from('exams')
      .insert({
        user_id: session.user.id,
        title,
        source_text,
        generation_params,
        status: 'pending', // Start the process in a 'pending' state
      })
      .select() // Return the newly created row
      .single(); // Expect only one row to be returned

    if (error) {
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
