import { db } from './db';
import {
  teacherResources,
  students,
  subjects,
  results,
  exams,
  classes,
  teachers,
  users,
  resourceBookmarks,
  studentLearningProgress,
  classSubjects,
} from './schema';
import { eq, desc, sql, and, inArray } from 'drizzle-orm';


export async function getStudentResources(userId: number) {
  const [studentRow] = await db
    .select({ id: students.id, classId: students.classId })
    .from(students)
    .where(eq(students.userId, userId))
    .limit(1);

  if (!studentRow) {
    return {
      availableResources: [],
      bookmarkedIds: [],
      progressList: [],
      weakSubjects: [],
      recentTopics: [],
    };
  }

  // 1. Get class name AND section to build the label exactly as the teacher stores it
  const [classRow] = await db
    .select({ name: classes.name, section: classes.section })
    .from(classes)
    .where(eq(classes.id, studentRow.classId))
    .limit(1);

  if (!classRow) {
    return {
      availableResources: [],
      bookmarkedIds: [],
      progressList: [],
      weakSubjects: [],
      recentTopics: [],
    };
  }

  // Build classLevel label the same way the teacher UI does:
  // TeacherResourcesPage produces: section ? `${name} - ${section}` : name
  const classLabel = classRow.section
    ? `${classRow.name} - ${classRow.section}`
    : classRow.name;
  const className = classRow.name;

  // Fetch subject names assigned to this student's class
  const classSubjectRows = await db
    .select({ name: subjects.name })
    .from(classSubjects)
    .leftJoin(subjects, eq(subjects.id, classSubjects.subjectId))
    .where(eq(classSubjects.classId, studentRow.classId));
  const classSubjectNames = classSubjectRows.map(r => r.name).filter(Boolean) as string[];

  // 2. Fetch resources: strictly match this student's exact class level (e.g. "10 - A" or "10")
  //    Filtered to subjects in this student's class.
  let availableResources: any[] = [];
  if (classLabel) {
    availableResources = await db
      .select({
        id: teacherResources.id,
        title: teacherResources.title,
        description: teacherResources.description,
        subject: teacherResources.subject,
        classLevel: teacherResources.classLevel,
        resourceType: teacherResources.resourceType,
        fileUrl: teacherResources.fileUrl,
        isAIGenerated: teacherResources.isAIGenerated,
        aiContent: teacherResources.aiContent,
        downloadCount: teacherResources.downloadCount,
        viewCount: teacherResources.viewCount,
        createdAt: teacherResources.createdAt,
        teacherName: users.name,
      })
      .from(teacherResources)
      .leftJoin(teachers, eq(teachers.id, teacherResources.teacherId))
      .leftJoin(users, eq(users.id, teachers.userId))
      .where(
        and(
          eq(teacherResources.classLevel, classLabel),
          classSubjectNames.length > 0
            ? sql`(${teacherResources.subject} IS NULL OR ${teacherResources.subject} IN (${sql.join(classSubjectNames.map(s => sql`${s}`), sql`, `)}))`
            : sql`1=1`
        )
      )
      .orderBy(desc(teacherResources.createdAt));
  }

  // 3. Fetch bookmarked resource IDs
  const bookmarkRows = await db
    .select({ resourceId: resourceBookmarks.resourceId })
    .from(resourceBookmarks)
    .where(eq(resourceBookmarks.studentId, studentRow.id));

  const bookmarkedIds = bookmarkRows.map((r) => r.resourceId);

  // 4. Fetch learning progress
  const progressList = await db
    .select({
      resourceId: studentLearningProgress.resourceId,
      progress: studentLearningProgress.progress,
      isCompleted: studentLearningProgress.isCompleted,
    })
    .from(studentLearningProgress)
    .where(eq(studentLearningProgress.studentId, studentRow.id));

  // 5. Compute weak subjects
  const studentResults = await db
    .select({
      subjectId: results.subjectId,
      subjectName: subjects.name,
      marks: results.marks,
      maxMarks: exams.maxMarks,
    })
    .from(results)
    .leftJoin(subjects, eq(subjects.id, results.subjectId))
    .leftJoin(exams, eq(exams.id, results.examId))
    .where(eq(results.studentId, studentRow.id));

  const subjectSums: Record<string, { obtained: number; max: number }> = {};
  for (const r of studentResults) {
    const sName = r.subjectName || 'Unknown';
    const obtained = Number(r.marks || 0);
    const max = Number(r.maxMarks || 100);
    if (!subjectSums[sName]) {
      subjectSums[sName] = { obtained: 0, max: 0 };
    }
    subjectSums[sName].obtained += obtained;
    subjectSums[sName].max += max;
  }

  const weakSubjects = Object.entries(subjectSums)
    .map(([name, val]) => ({ name, percentage: Math.round((val.obtained / val.max) * 100) }))
    .filter(s => s.percentage < 75)
    .map(s => s.name);

  return {
    availableResources,
    bookmarkedIds,
    progressList,
    weakSubjects,
    recentTopics: [],
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
