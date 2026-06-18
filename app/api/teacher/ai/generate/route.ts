import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PROMPTS: Record<string, (subject: string, classLevel: string, topic: string) => string> = {
  notes: (subject, classLevel, topic) =>
    `You are an experienced ${subject} teacher creating detailed study notes for ${classLevel} students.\n\nCreate comprehensive, well-structured notes on the topic: "${topic}"\n\nFormat the notes with:\n- Clear headings and subheadings\n- Key concepts explained simply\n- Important definitions\n- Examples where relevant\n- Summary points at the end\n\nMake it educational, age-appropriate, and easy to understand.`,

  quiz: (subject, classLevel, topic) =>
    `You are an experienced ${subject} teacher creating a quiz for ${classLevel} students.\n\nCreate a 10-question quiz on the topic: "${topic}"\n\nInclude a mix of:\n- 6 Multiple Choice Questions (with 4 options each, mark the correct answer)\n- 2 True/False questions\n- 2 Short Answer questions\n\nFormat clearly with question numbers. Include an Answer Key at the end.`,

  worksheet: (subject, classLevel, topic) =>
    `You are an experienced ${subject} teacher creating a practice worksheet for ${classLevel} students.\n\nCreate an engaging practice worksheet on the topic: "${topic}"\n\nInclude:\n- 5 fill-in-the-blank exercises\n- 3 matching exercises\n- 4 problem-solving or application questions\n- 2 creative/critical thinking questions\n\nLeave spaces for student answers. Format clearly.`,

  lesson_plan: (subject, classLevel, topic) =>
    `You are an experienced ${subject} teacher creating a detailed lesson plan for ${classLevel} students.\n\nCreate a comprehensive lesson plan for the topic: "${topic}"\n\nInclude:\n- Learning Objectives (3-4 specific, measurable objectives)\n- Materials/Resources needed\n- Introduction/Hook (5 minutes)\n- Main Instruction (20-25 minutes) with teaching strategies\n- Guided Practice (10 minutes)\n- Independent Practice (10 minutes)\n- Assessment/Evaluation methods\n- Closure/Summary (5 minutes)\n- Homework/Extension activities\n- Differentiation strategies for diverse learners`,
};

export async function POST(request: Request) {
  try {
    await requireRole("teacher");
    const body = await request.json();
    const { tool, subject, classLevel, topic } = body;

    if (!subject || !topic || !tool) {
      return NextResponse.json({ error: "Subject, topic, and tool are required" }, { status: 400 });
    }

    const promptFn = PROMPTS[tool];
    if (!promptFn) {
      return NextResponse.json({ error: "Invalid tool" }, { status: 400 });
    }

    const prompt = promptFn(subject, classLevel || "Students", topic);

    // Use the existing AI infrastructure (Gemini API)
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      // Graceful fallback — return a structured template if no API key
      const fallbackContent = generateFallbackContent(tool, subject, classLevel, topic);
      return NextResponse.json({ content: fallbackContent, isTemplate: true });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI generation failed: ${err}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) throw new Error("No content generated");

    return NextResponse.json({ content });
  } catch (error: any) {
    // If AI fails, return a useful template rather than error
    try {
      const body = await request.clone().json().catch(() => ({}));
      const { tool = "notes", subject = "Subject", classLevel = "Students", topic = "Topic" } = body;
      const fallback = generateFallbackContent(tool, subject, classLevel, topic);
      return NextResponse.json({ content: fallback, isTemplate: true });
    } catch {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}

function generateFallbackContent(tool: string, subject: string, classLevel: string, topic: string): string {
  const templates: Record<string, string> = {
    notes: `${subject.toUpperCase()} STUDY NOTES
Topic: ${topic}
Class: ${classLevel}
${"=".repeat(50)}

1. INTRODUCTION
   - Definition of ${topic}
   - Why is ${topic} important?
   - Historical/contextual background

2. KEY CONCEPTS
   Concept 1: [Main idea]
   • Explanation
   • Example
   
   Concept 2: [Second main idea]
   • Explanation
   • Example
   
   Concept 3: [Third main idea]
   • Explanation
   • Example

3. IMPORTANT TERMS
   Term 1: Definition
   Term 2: Definition
   Term 3: Definition

4. SUMMARY
   • Key point 1
   • Key point 2
   • Key point 3

5. REVIEW QUESTIONS
   Q1. What is ${topic}?
   Q2. What are the main components of ${topic}?
   Q3. How does ${topic} apply in real life?

Note: Edit and customize this template with your specific content.`,

    quiz: `${subject.toUpperCase()} QUIZ — ${topic}
Class: ${classLevel}
${"=".repeat(50)}

SECTION A: MULTIPLE CHOICE (1 mark each)

1. Which of the following best describes ${topic}?
   a) Option A
   b) Option B *
   c) Option C
   d) Option D

2. Question 2 about ${topic}?
   a) Option A
   b) Option B
   c) Option C *
   d) Option D

[Add 4 more MCQs here]

SECTION B: TRUE/FALSE (1 mark each)

7. Statement about ${topic}: _______
8. Another statement about ${topic}: _______

SECTION C: SHORT ANSWER (3 marks each)

9. Explain ${topic} in your own words.

10. Give two examples of ${topic} in daily life.

ANSWER KEY: 1-b, 2-c, 7-True, 8-False

Note: Fill in actual questions, options and answers.`,

    worksheet: `${subject.toUpperCase()} PRACTICE WORKSHEET
Topic: ${topic} | Class: ${classLevel}
${"=".repeat(50)}

SECTION A: FILL IN THE BLANKS

1. ${topic} is defined as _________________.
2. The main components of ${topic} are _________________.
3. _________________ is an example of ${topic}.
4. ${topic} was first discovered by _________________.
5. The opposite of ${topic} is _________________.

SECTION B: MATCH THE FOLLOWING

Column A          Column B
1. Term 1    →   a. Definition A
2. Term 2    →   b. Definition B
3. Term 3    →   c. Definition C

SECTION C: PROBLEM SOLVING

1. [Problem/Question 1 about ${topic}]
   Answer: ___________________________

2. [Problem/Question 2 about ${topic}]
   Answer: ___________________________

SECTION D: CRITICAL THINKING

1. How would you apply ${topic} in your daily life?
   _______________________________________

2. What would happen if ${topic} did not exist?
   _______________________________________

Note: Replace placeholders with actual content specific to ${topic}.`,

    lesson_plan: `LESSON PLAN — ${subject}
Topic: ${topic} | Class: ${classLevel} | Duration: 45 minutes
${"=".repeat(50)}

LEARNING OBJECTIVES:
By end of lesson, students will be able to:
1. Define and explain ${topic}
2. Identify key components of ${topic}
3. Apply ${topic} in problem-solving contexts
4. Evaluate real-world examples of ${topic}

MATERIALS NEEDED:
• Textbook (Chapter: ___)
• Whiteboard/markers
• Worksheets
• Visual aids/charts

LESSON FLOW:

▶ INTRODUCTION (5 min)
   Hook: Start with a thought-provoking question or real-life scenario
   "Can anyone tell me where they have seen ${topic} in real life?"
   Connect to prior knowledge

▶ INSTRUCTION (20 min)
   1. Define ${topic} clearly on board
   2. Explain main concepts step by step
   3. Use visual examples
   4. Think aloud strategy for complex parts

▶ GUIDED PRACTICE (10 min)
   • Work through 2-3 examples together as a class
   • Use questioning techniques (cold calling, think-pair-share)

▶ INDEPENDENT PRACTICE (7 min)
   • Students complete 3-4 worksheet problems individually

▶ ASSESSMENT (check for understanding)
   • Exit ticket: 2 questions students answer before leaving

▶ CLOSURE (3 min)
   • Summarize key learning
   • Preview next lesson
   • Assign homework: Textbook pg. ___

DIFFERENTIATION:
• Advanced: Extension problems
• Struggling: Peer tutoring, visual aids
• ELL: Bilingual glossary

HOMEWORK: 5 practice problems from textbook

Note: Customize with specific examples, page numbers, and activities.`,
  };

  return templates[tool] || `Template for ${tool} on ${topic} (${subject} - ${classLevel})\n\nNote: Configure GEMINI_API_KEY environment variable for AI-powered generation.`;
}
