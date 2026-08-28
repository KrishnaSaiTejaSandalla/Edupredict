import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { generateLocalNote } from '@/lib/student-resources.service';
import { saveAIGeneratedNote } from '@/lib/student-actions';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await requireRole('student');
    const body = await request.json();
    const { subject, topic, noteType } = body;
    if (!subject || !topic || !noteType) return NextResponse.json({ error: 'subject, topic, and noteType are required' }, { status: 400 });

    // Try Gemini first, fall back to local generator
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    let content = '';

    if (apiKey) {
      try {
        const prompt = `You are a hilarious, witty, absolute legend Gen-Z tutor for ${subject}. Generate a ${noteType} for a student studying "${topic}" in ${subject}. 
        Rules:
        - Use Gen-Z slang, witty analogies, hype vibes, emojis, and zero boring academic waffle.
        - Give extremely witty definitions that make sense instantly.
        - NEVER include any external URLs, links, or resources. Keep it 100% self-contained.
        - Format with clean Markdown headers, bullet points, and code blocks if needed.`;
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.8, maxOutputTokens: 1200 } }),
        });
        if (resp.ok) {
          const data = await resp.json();
          content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch { /* fall through to local */ }
    }

    if (!content) content = generateLocalNote(subject, topic, noteType);

    const title = `${topic} - ${noteType.charAt(0).toUpperCase() + noteType.slice(1)}`;
    await saveAIGeneratedNote({ subjectName: subject, topic, noteType, title, content });

    return NextResponse.json({ content, title });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
