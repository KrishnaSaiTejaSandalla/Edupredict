import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const HOMEWORK_TEMPLATES: Record<string, (subject: string, classLevel: string, topic: string) => string> = {
  homework: (s, c, t) => `HOMEWORK ASSIGNMENT
Subject: ${s} | Class: ${c} | Topic: ${t}
${'─'.repeat(50)}

Instructions: Complete all questions in your notebook. Show full working where applicable.

SECTION A – Conceptual Questions (2 marks each)
1. Define "${t}" in your own words.
2. What are the key properties/rules of ${t}?
3. Give two real-life examples of ${t}.

SECTION B – Application Questions (4 marks each)
4. Explain how ${t} is used in ${s}. Provide a step-by-step example.
5. Compare ${t} with a related concept you have learned. How are they different?

SECTION C – Problem Solving (6 marks)
6. Solve the following problem involving ${t}:
   [Teacher: Insert a specific problem from today's class or textbook here]
   
Due Date: ________________
Teacher's Signature: ________________`,

  mcqs: (s, c, t) => `MULTIPLE CHOICE QUIZ
Subject: ${s} | Class: ${c} | Topic: ${t}
${'─'.repeat(50)}

Circle the correct answer:

1. Which of the following best describes ${t}?
   A) [Option A - incorrect]
   B) [Option B - correct] ✓
   C) [Option C - incorrect]
   D) [Option D - incorrect]

2. ${t} is primarily used in ${s} to:
   A) [Incorrect use]
   B) [Incorrect use]
   C) [Correct use] ✓
   D) [Incorrect use]

3. What is the main formula/rule for ${t}?
   A) [Wrong formula]
   B) [Correct formula] ✓
   C) [Wrong formula]
   D) [Wrong formula]

4. Which example best demonstrates ${t}?
   A) [Correct example] ✓
   B) [Incorrect example]
   C) [Incorrect example]
   D) [Incorrect example]

5. A common mistake students make with ${t} is:
   A) [Less common mistake]
   B) [Less common mistake]
   C) [Most common mistake] ✓
   D) [Less common mistake]

Answer Key: 1-B, 2-C, 3-B, 4-A, 5-C
(Teacher: Customize options with content-specific answers)`,

  worksheet: (s, c, t) => `PRACTICE WORKSHEET
Subject: ${s} | Class: ${c} | Topic: ${t}
${'─'.repeat(50)}

SECTION A – Fill in the Blanks (1 mark each)
1. ${t} can be defined as _________________________.
2. The main rule of ${t} is _________________________.
3. An everyday example of ${t} is _________________________.
4. The opposite/complement of ${t} is _________________________.
5. ${t} was introduced in ${s} because _________________________.

SECTION B – Match the Following (1 mark each)
    Column A                    Column B
1. [Term related to ${t}]  →  a. [Definition A]
2. [Formula]               →  b. [Application B]
3. [Example]               →  c. [Rule C]
4. [Property]              →  d. [Use case D]

SECTION C – Short Answer (3 marks each)
1. In 2-3 sentences, explain ${t} as if you are teaching it to a younger student.
2. Solve: [Teacher: Insert a typical ${s} problem on ${t}]
3. How would you apply ${t} in real life? Give one original example.

SECTION D – Challenge Problem (5 marks)
[Teacher: Insert a multi-step exam-level problem on ${t}]`,

  revision: (s, c, t) => `REVISION SHEET
Subject: ${s} | Class: ${c} | Topic: ${t}
${'─'.repeat(50)}

WHAT TO KNOW 📋
□ Definition of ${t}
□ Key formula(s) or rules
□ At least 2 real-world applications
□ Common mistakes to avoid
□ Related topics from ${s}

QUICK RECALL DRILL ⚡
Answer these in 30 seconds each:
• What is ${t}? → ___________________
• Formula/Rule: → ___________________
• Example: → ___________________
• Exam trick: → ___________________

SELF-ASSESSMENT ✅
Rate your understanding of each sub-topic:
[ ] Definition — ★★★★★
[ ] Application — ★★★★★
[ ] Problem-solving — ★★★★★
[ ] Real-world connection — ★★★★★

EXAM PREP CHECKLIST
□ Revised notes at least twice
□ Attempted at least 5 practice questions
□ Reviewed common errors
□ Can explain ${t} without notes`,
};

export async function POST(request: Request) {
  try {
    await requireRole('teacher');
    const body = await request.json();
    const { tool, subject, classLevel, topic } = body;
    if (!tool || !subject || !topic) return NextResponse.json({ error: 'tool, subject, and topic are required' }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    let content = '';

    if (apiKey) {
      try {
        const prompts: Record<string, string> = {
          homework: `Create engaging homework for ${classLevel} ${subject} students on "${topic}". Include 3 sections: conceptual (3 questions), application (2 questions), and one challenge problem. Format clearly with marks allocated.`,
          mcqs: `Create 10 well-written MCQ questions for ${classLevel} ${subject} students on "${topic}". Include 4 options each. Mark correct answers. Include answer key at end.`,
          worksheet: `Create a comprehensive practice worksheet for ${classLevel} ${subject} students on "${topic}". Include: fill-in-blanks, matching, short answers, and one challenge problem.`,
          revision: `Create a complete revision sheet for ${classLevel} ${subject} students on "${topic}". Include key points to know, quick recall drill, self-assessment checklist, and exam tips.`,
        };
        const prompt = prompts[tool] || prompts['homework'];
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 1500 } }),
        });
        if (resp.ok) {
          const data = await resp.json();
          content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch { /* fall through */ }
    }

    if (!content) {
      const templateFn = HOMEWORK_TEMPLATES[tool] || HOMEWORK_TEMPLATES['homework'];
      content = templateFn(subject, classLevel || 'Students', topic);
    }

    return NextResponse.json({ content });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
