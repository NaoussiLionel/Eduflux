import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const examId = params.id;

    // The .match({ user_id: session.user.id }) is crucial.
    // It ensures users can only delete their own exams, enforcing row-level security.
    const { error } = await supabase
      .from('exams')
      .delete()
      .match({ id: examId, user_id: session.user.id });

    if (error) {
      throw error;
    }

    return new NextResponse(null, { status: 204 }); // 204 No Content is standard for successful DELETE
  } catch (error) {
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}