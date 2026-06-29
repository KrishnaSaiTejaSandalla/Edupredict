import { db } from './db';
import { teacherResources, studentDiaries, aiGeneratedNotes, students, subjects, results, exams } from './schema';
import { eq, desc, sql } from 'drizzle-orm';

export async function getStudentResources(userId: number) {
  const [studentRow] = await db.select({ id: students.id, classId: students.classId }).from(students).where(eq(students.userId, userId)).limit(1);

  if (!studentRow) {
    return { recentResources: [], popularResources: [], recommendedResources: [], myNotes: [], weakSubjects: [], recentTopics: [] };
  }

  // Recently added teacher resources
  const recentResources = await db.select().from(teacherResources).orderBy(desc(teacherResources.createdAt)).limit(10);
  
  // Popular resources
  const popularResources = await db.select().from(teacherResources).orderBy(desc(teacherResources.downloadCount)).limit(10);
  
  // Student's own AI-generated notes
  const myNotes = await db.select().from(aiGeneratedNotes).where(eq(aiGeneratedNotes.studentId, studentRow.id)).orderBy(desc(aiGeneratedNotes.createdAt)).limit(20);

  // AI RECOMMENDATION LOGIC:
  // 1. Weak Subjects: subjects with average score < 75%
  const studentResults = await db
    .select({
      subjectId: results.subjectId,
      subjectName: subjects.name,
      marks: results.marks,
      examId: results.examId,
      maxMarks: exams.maxMarks,
    })
    .from(results)
    .leftJoin(subjects, eq(subjects.id, results.subjectId))
    .leftJoin(exams, eq(exams.id, results.examId))
    .where(eq(results.studentId, studentRow.id));

  // Compute subject-wise average
  const subjectSums: Record<string, { obtained: number; max: number; count: number }> = {};
  for (const r of studentResults) {
    const sName = r.subjectName || 'Unknown';
    const obtained = Number(r.marks || 0);
    const max = Number(r.maxMarks || 100);
    if (!subjectSums[sName]) {
      subjectSums[sName] = { obtained: 0, max: 0, count: 0 };
    }
    subjectSums[sName].obtained += obtained;
    subjectSums[sName].max += max;
    subjectSums[sName].count++;
  }

  const weakSubjects = Object.entries(subjectSums)
    .map(([name, val]) => ({ name, percentage: Math.round((val.obtained / val.max) * 100) }))
    .filter(s => s.percentage < 75);

  // 2. Recent Diary Topics
  const recentDiaries = await db
    .select({
      topicTaught: studentDiaries.topicTaught,
      subjectName: subjects.name,
    })
    .from(studentDiaries)
    .leftJoin(subjects, eq(subjects.id, studentDiaries.subjectId))
    .where(eq(studentDiaries.classId, studentRow.classId))
    .orderBy(desc(studentDiaries.date))
    .limit(5);

  const recentTopics = recentDiaries.map(d => ({
    topic: d.topicTaught,
    subject: d.subjectName || 'General',
  }));

  // 3. Match teacher resources with weak subjects or recent topics
  const weakNames = weakSubjects.map(s => s.name);
  const topicNames = recentTopics.map(t => t.subject);

  // Filter classroom resources matching weak subjects or recent topics
  const matchedResources = await db
    .select()
    .from(teacherResources)
    .orderBy(desc(teacherResources.createdAt));

  const recommendedResources = matchedResources.filter(res => {
    const sName = res.subject || '';
    return weakNames.includes(sName) || topicNames.includes(sName);
  }).slice(0, 5);

  // If no recommended resources found, default to popular resources
  const finalRecommended = recommendedResources.length > 0 
    ? recommendedResources 
    : popularResources.slice(0, 5);

  return {
    recentResources,
    popularResources,
    recommendedResources: finalRecommended,
    myNotes,
    weakSubjects: weakSubjects.map(s => s.name),
    recentTopics,
  };
}

// Generate a witty personalized note without calling external APIs
export function generateLocalNote(subject: string, topic: string, noteType: string): string {
  const notes: Record<string, Record<string, string>> = {
    cheatsheet: {
      default: `# ${topic} - Ultimate Cheat Sheet 🚀\n\n## Witty Definition\n${topic} is basically the main character of this chapter in ${subject}. It is the secret sauce that makes everything click. If you ignore it, your exam score will literally ghost you.\n\n## Vibe Check\n1. **Core Rule**: Do the math, trust the process, profit.\n2. **Common Trap**: Trying to speedrun the solution and making basic sign errors. Absolute rookie move. Keep it cool.\n\n## 💀 Deadlines & Traps\n- Do not mix this up with related concepts. They are cousins, not twins.\n- Always double check your calculations.\n\n> 🧠 **No external links needed** — we keep it 100% self-contained here. Just practice 3 problems and you are golden.`,
    },
    revision: {
      default: `# ${topic} - Quick Revision Notes 📝\n\n## TL;DR\nLet's be real — you slept through this class or got distracted by a notification. No judgment, we've got you covered. Here is the emergency pack.\n\n## 3 Key Facts (No Cap)\n1. **Fact 1**: ${topic} is absolutely essential for understanding ${subject}.\n2. **Fact 2**: It is not as hard as it looks, it's just fancy wording.\n3. **Fact 3**: Master this and you're officially a wizard.\n\n## Witty Takeaway\n${topic} is basically [concept]. Remember it or cry later. (Just kidding, you'll ace it).\n\n> ✨ **Zero external resources** — everything you need is right here. Go crush it!`,
    },
    mnemonic: {
      default: `# ${topic} - Brain Hacks 🧠\n\n## Memory Palace Vibes\nHere is how to get this into your brain permanently:\n\n## The Gen-Z Mnemonic\nRemember **"${topic.split(' ').map(w => w[0]).join('') || 'VIP'}"**: \n> **V**ery **I**mportant **P**aper!\n\nOr try this story:\n*Imagine ${topic} is a Fortnite character who always does a dance whenever [action] happens.*\n\n> 🎯 **Zero external links** — just use your brain. It's the best local drive you have!`,
    },
    practice: {
      default: `# ${topic} - Practice Quest 💪\n\n## Level 1: Warm Up\n1. Define ${topic} in 5 words or less.\n2. True or False: ${topic} is a scam. (Spoiler: False).\n\n## Level 2: Boss Fight\n3. Explain this to a toddler without them crying.\n4. Solve a typical mock problem without checking your notes.\n\n> 🏆 **No external URLs allowed** — just pure brain gains. Stay focused!`,
    },
  };

  const typeNotes = notes[noteType] || notes['cheatsheet'];
  return typeNotes[subject] || typeNotes['default'];
}
