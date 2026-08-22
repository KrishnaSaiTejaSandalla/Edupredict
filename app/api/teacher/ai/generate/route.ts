import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

type MaterialType =
  | "lesson_plan" | "notes" | "revision" | "question_paper" | "quiz"
  | "mcqs" | "short_answer" | "long_answer" | "worksheet" | "homework"
  | "summary" | "concept_explanation" | "remedial" | "advanced" | "answer_key";

const MATERIAL_LABELS: Record<string, string> = {
  lesson_plan: "Comprehensive Lesson Plan",
  notes: "Structured Study Notes",
  revision: "High-Yield Revision Guide",
  question_paper: "Examination Question Paper",
  quiz: "Diagnostic Quiz",
  mcqs: "Multiple Choice Questions",
  short_answer: "Short Answer Questions",
  long_answer: "Long Answer / Analytical Questions",
  worksheet: "Practice Worksheet",
  homework: "Homework Assignment",
  summary: "Chapter Summary",
  concept_explanation: "Concept Explanation",
  remedial: "Remedial Support Material",
  advanced: "Advanced / Extension Material",
  answer_key: "Answer Key with Solutions",
};

// Subject domain context â€” tells the LLM what kind of content is appropriate
function getSubjectDomainContext(subject: string): string {
  const s = subject.toLowerCase().trim();

  if (s.includes("english") || s.includes("language") || s.includes("literature") || s.includes("grammar")) {
    return `This is an ENGLISH LANGUAGE ARTS subject. Content must cover language and literacy concepts such as:
- Grammar rules (parts of speech, tenses, clauses, sentence structure, subject-verb agreement, active/passive voice, reported speech, determiners, punctuation)
- Vocabulary and word usage
- Reading comprehension
- Writing skills (essays, paragraphs, formal/informal letters, narrative/descriptive/argumentative writing)
- Literary devices and analysis (if literature)
- Idioms, phrases, proverbs
DO NOT include mathematics, physics, chemistry, or unrelated science concepts.`;
  }

  if (s.includes("math") || s.includes("maths") || s.includes("algebra") || s.includes("geometry") || s.includes("calculus") || s.includes("arithmetic")) {
    return `This is a MATHEMATICS subject. Content must cover mathematical concepts with:
- Precise formulas and equations using standard notation
- Step-by-step numerical worked examples with actual numbers
- Practice problems with answers
- Mathematical proofs or derivations where relevant
- Diagrams/graphs described textually
- Common mistakes students make with this topic
DO NOT include narrative prose unrelated to mathematics. Every explanation should have a corresponding numerical example.`;
  }

  if (s.includes("physics")) {
    return `This is a PHYSICS subject. Content must cover physical laws, phenomena, and principles with:
- Laws and their mathematical forms (e.g., F = ma)
- Real-world physical examples
- Numerical problems with units
- Experimental procedures where relevant
- Diagrams described textually
- Applications to everyday phenomena
DO NOT include unrelated biology or chemistry unless directly applicable.`;
  }

  if (s.includes("chem")) {
    return `This is a CHEMISTRY subject. Content must cover chemical concepts with:
- Chemical equations and reactions (with balancing)
- Atomic/molecular structure where relevant
- Laboratory procedures and safety
- Numerical problems (stoichiometry, molarity, etc.)
- Chemical properties and periodic table context
DO NOT include physics formulas or biology content unless directly applicable.`;
  }

  if (s.includes("bio") || s.includes("life science")) {
    return `This is a BIOLOGY / LIFE SCIENCES subject. Content must cover living systems with:
- Organism structure and function
- Biological processes (photosynthesis, respiration, digestion, etc.)
- Classification and taxonomy where relevant
- Ecological relationships
- Diagrams described textually
- Real biological examples
DO NOT include physics equations or chemistry reactions unless part of the topic.`;
  }

  if (s.includes("history") || s.includes("social") || s.includes("civics") || s.includes("political") || s.includes("economics")) {
    return `This is a SOCIAL SCIENCES / HISTORY / CIVICS subject. Content must cover:
- Historical events, causes and effects, timelines
- Political structures, governance, constitutions
- Economic concepts and real-world applications
- Source-based analysis and critical thinking
- Geographical and cultural context where relevant
- Important dates, people, movements, and documents
DO NOT include mathematics problems, physics, or chemistry content.`;
  }

  if (s.includes("geo")) {
    return `This is a GEOGRAPHY subject. Content must cover:
- Physical geography (landforms, climate, ecosystems)
- Human geography (population, urbanisation, industries)
- Map reading and interpretation
- Real place names, statistics, and examples
- Case studies from actual countries/regions
DO NOT include physics, chemistry, or history unrelated to geography.`;
  }

  if (s.includes("computer") || s.includes("information") || s.includes("ict") || s.includes("programming")) {
    return `This is a COMPUTER SCIENCE / ICT subject. Content must cover:
- Programming concepts with actual code examples (pseudocode or relevant language)
- Data structures and algorithms
- Database or networking concepts where relevant
- Hardware/software explanations
- Step-by-step logic and flowcharts
DO NOT include biology, chemistry, or history content.`;
  }

  // Generic fallback
  return `This is a ${subject} subject. Generate content that is strictly relevant to the topic provided. Every section must be educational, specific, and directly useful to a student studying this topic. Avoid generic filler content.`;
}

// Material type structure requirements
function getMaterialTypeInstructions(tool: string, topic: string, subject: string, classLevel: string, difficulty: string): string {
  const diffLabel = difficulty === "easy" ? "foundational/introductory"
    : difficulty === "hard" ? "advanced/high-order"
    : difficulty === "mixed" ? "graduated (easy â†’ medium â†’ hard)"
    : "standard curriculum";

  switch (tool) {
    case "lesson_plan":
      return `Generate a complete ${classLevel} lesson plan with these REQUIRED sections:
1. **Learning Objectives** (3-4 measurable outcomes)
2. **Prerequisites** (what students must already know)
3. **Materials / Resources Needed**
4. **Lesson Flow** (with time allocations):
   - Introduction / Hook (5 min)
   - Direct Instruction (10-15 min)
   - Guided Practice (10-15 min)
   - Independent Practice (10 min)
   - Wrap-up / Exit Ticket (5 min)
5. **Differentiation Strategies** (for struggling and advanced learners)
6. **Assessment** (formative check during lesson)
7. **Homework** (brief extension task)
All examples and activities must be about: "${topic}"`;

    case "notes":
      return `Generate comprehensive study notes for ${classLevel} students. REQUIRED structure:
1. **Overview** (what this topic is and why it matters)
2. **Core Concepts** (explain each key idea with a concrete example)
3. **Key Definitions** (clear, age-appropriate definitions)
4. **Worked Examples** (at least 2 detailed examples specific to "${topic}")
5. **Common Mistakes** (3 mistakes students make with this topic and how to avoid them)
6. **Quick Recall Summary** (bullet points of the most important facts)
7. **Practice Questions** (3 questions with answers)
Difficulty: ${diffLabel}`;

    case "quiz":
      return `Generate a 10-question diagnostic quiz on "${topic}" for ${classLevel}. REQUIRED format:
- Questions 1-3: Basic recall / definition (1 mark each)
- Questions 4-7: Application and understanding (2 marks each)
- Questions 8-10: Analysis / higher-order thinking (3 marks each)
Total: 20 marks
Include an **Answer Key** at the end with brief explanations for each answer.
Difficulty: ${diffLabel}`;

    case "mcqs":
      return `Generate 15 Multiple Choice Questions on "${topic}" for ${classLevel}. REQUIRED format:
- Each question has exactly 4 options (A, B, C, D)
- Mark the correct answer with **[Correct]**
- Include a 1-sentence explanation for why the correct answer is right
- Organize: Questions 1-5 (basic), 6-10 (application), 11-15 (analytical)
- Include an **Answer Key** at the end
Difficulty: ${diffLabel}`;

    case "question_paper":
      return `Generate a formal examination paper on "${topic}" for ${classLevel}. REQUIRED structure:
**Header**: Subject, Class, Time: 1 hour, Max Marks: 40
**Section A** (Objective - 10 marks): 10 Ã— 1-mark questions
**Section B** (Short Answer - 15 marks): 5 Ã— 3-mark questions
**Section C** (Long Answer - 15 marks): 3 Ã— 5-mark questions
Include **General Instructions** at the top.
Include a separate **Marking Scheme / Answer Key** at the end.
Difficulty: ${diffLabel}`;

    case "worksheet":
      return `Generate a practice worksheet on "${topic}" for ${classLevel}. REQUIRED structure:
1. **Warm-Up** (2 simple recall questions)
2. **Section A: Fill in the Blanks** (5 items)
3. **Section B: Short Answer Practice** (4 questions)
4. **Section C: Application Problems** (3 questions requiring multi-step thinking)
5. **Bonus Challenge** (1 extension question for fast finishers)
Include **Answers / Key** at the bottom.
Difficulty: ${diffLabel}`;

    case "revision":
      return `Generate a 7-day revision guide on "${topic}" for ${classLevel}. REQUIRED structure:
1. **Quick Concept Summary** (key points to remember, max 10 bullets)
2. **Key Formulas / Rules / Definitions** (exactly as students will need them)
3. **Common Exam Traps** (3 mistakes that cost marks)
4. **7-Day Schedule**:
   - Day 1-2: Concept review
   - Day 3-4: Practice problems
   - Day 5: Mixed practice
   - Day 6: Timed self-test
   - Day 7: Error review + final recap
5. **10 Practice Questions** with answers
Difficulty: ${diffLabel}`;

    case "remedial":
      return `Generate remedial support material for ${classLevel} students struggling with "${topic}". REQUIRED approach:
- Use the simplest possible language
- Break every concept into smallest possible steps
- Provide at least 3 worked examples going from very simple â†’ slightly harder
- Include "Try It Yourself" practice with hints
- Avoid jargon; explain every term used
- End with a confidence builder (3 easy questions the student can definitely answer)
Focus on building understanding, not rushing through content.`;

    case "advanced":
      return `Generate advanced / extension material on "${topic}" for high-achieving ${classLevel} students. REQUIRED content:
- Higher-order thinking problems that require synthesis and analysis
- At least 2 challenging problems that go beyond the standard curriculum
- Connections to real-world applications or broader academic concepts
- Optional: olympiad-style or competitive exam questions
- Include detailed solutions with multiple approaches where possible`;

    case "summary":
      return `Generate a concise chapter summary on "${topic}" for ${classLevel}. REQUIRED structure:
1. **In One Paragraph** (3-4 sentence summary a student can memorize)
2. **Key Points** (numbered list, max 10 items)
3. **Important Terms** (glossary format)
4. **Formula / Rule Sheet** (if applicable to the subject)
5. **3 Most Likely Exam Questions** on this topic`;

    case "concept_explanation":
      return `Explain the concept "${topic}" to ${classLevel} students. REQUIRED structure:
1. **Simple Definition** (what it is, in plain language)
2. **Why It Matters** (real-world relevance)
3. **Step-by-Step Breakdown** (how it works, explained in stages)
4. **Analogy** (relate to something students already know)
5. **Worked Example** (at least 1 detailed example)
6. **Common Misunderstanding** (what students often get wrong)
7. **Self-Check Question** (1 question to test if they understood)`;

    case "homework":
      return `Generate a homework assignment on "${topic}" for ${classLevel}. REQUIRED:
- 5-8 questions suitable for independent work at home
- Mix of recall, application, and 1 creative/extension question
- Estimated completion time: 20-30 minutes
- Include an **Answer Key** for teacher's reference
- Questions must be solvable without textbook (test understanding, not copying)
Difficulty: ${diffLabel}`;

    case "answer_key":
      return `Generate a comprehensive answer key for exercises on "${topic}" for ${classLevel}. Include:
- Full step-by-step solutions (not just final answers)
- Mark allocation breakdown for each step
- Common errors to watch for when marking
- Notes on acceptable alternative approaches
- Marking criteria for subjective/analytical questions`;

    case "short_answer":
      return `Generate 10 short-answer questions on "${topic}" for ${classLevel}. Each question:
- Should be answerable in 3-6 sentences
- Tests understanding, not just memorization
- Includes the model answer (3-5 marks each)
- Covers different aspects of the topic
Difficulty: ${diffLabel}`;

    case "long_answer":
      return `Generate 5 analytical long-answer questions on "${topic}" for ${classLevel}. Each question:
- Requires multi-paragraph response (8-10 marks each)
- Tests evaluation, analysis, and synthesis
- Includes a detailed marking rubric with mark allocation
- Includes a model answer outline
Difficulty: ${diffLabel}`;

    default:
      return `Generate educational material on "${topic}" for ${classLevel} ${subject} students. Difficulty: ${diffLabel}. The content must be specific to the topic, well-structured, and directly usable in a classroom setting.`;
  }
}

// Subject & Tool aware deterministic fallback â€” generates strictly tool-tailored content
function generateSubjectAwareFallback(
  tool: string,
  subject: string,
  classLevel: string,
  topic: string,
  difficulty: string,
  learningObjective: string,
  resourceContext: string
): string {
  const diffLabel = difficulty.toUpperCase();
  const objLine = learningObjective ? `\n*Learning Objective: ${learningObjective}*` : "";
  const contextNote = resourceContext ? `\n> **Reference Note:** Content synthesized from teacher reference notes.\n` : "";

  switch (tool) {
    case "quiz":
      return `# ${subject} â€” Diagnostic Quiz: ${topic}
**Class:** ${classLevel} | **Difficulty:** ${diffLabel} | **Max Marks:** 20 | **Time:** 25 mins${objLine}
${contextNote}
---

## Part A: Recall & Concepts (1 Mark Each â€” Total: 3 Marks)
1. State the fundamental definition or primary law governing **${topic}**.
2. Give one standard real-world example or unit of measurement related to **${topic}**.
3. Identify whether the following statement is True or False regarding **${topic}**:
   > *"The core principles of ${topic} remain constant under standard standard baseline conditions."*

---

## Part B: Application & Understanding (2 Marks Each â€” Total: 8 Marks)
4. Explain how **${topic}** is applied to solve standard problems in ${subject}.
5. Differentiate between the primary components of **${topic}** with a brief comparative point.
6. A student attempts a problem on **${topic}** and arrives at an inconsistent result. What is the most likely misconception or calculation step missed?
7. Write the key formula, grammatical rule, or governing mechanism used when analyzing **${topic}**.

---

## Part C: Analysis & High-Order Thinking (3 Marks Each â€” Total: 9 Marks)
8. Analyze a complex case scenario involving **${topic}**. What will happen if the primary variable or condition is doubled or altered?
9. Propose a step-by-step strategy for verifying solutions related to **${topic}**.
10. Synthesize the relationship between **${topic}** and broader topics in ${subject}.

---

## ðŸ—ï¸ Answer Key & Marking Scheme
1. **Model Answer:** A precise definition of ${topic} including key terminology. *(1 Mark)*
2. **Model Answer:** Accurate example/unit matching the curriculum standard. *(1 Mark)*
3. **Model Answer:** True / False with 1-line justification. *(1 Mark)*
4. **Model Answer:** Step-by-step application with correct conceptual linkage. *(2 Marks)*
5. **Model Answer:** 2 distinct points of comparison. *(2 Marks)*
6. **Model Answer:** Explanation of common error (e.g. sign error, tense mismatch, formula misapplication). *(2 Marks)*
7. **Model Answer:** Exact formula/rule clearly stated with variable definitions. *(2 Marks)*
8. **Model Answer:** Full cause-and-effect reasoning with conclusion. *(3 Marks)*
9. **Model Answer:** 3-step verification methodology. *(3 Marks)*
10. **Model Answer:** Comprehensive conceptual synthesis. *(3 Marks)*`;

    case "mcqs":
      return `# ${subject} â€” Multiple Choice Question Bank: ${topic}
**Class:** ${classLevel} | **Difficulty:** ${diffLabel} | **Total Questions:** 15${objLine}
${contextNote}
---

### Section 1: Foundational Recall (Q1 - Q5)

**Q1.** What is the primary defining characteristic of **${topic}** in ${subject}?
- A) A secondary auxiliary property
- B) The foundational governing principle **[Correct]**
- C) An obsolete historical convention
- D) An arbitrary non-standard unit
*Explanation: The core definition of ${topic} represents its primary governing principle in modern curricula.*

**Q2.** Which of the following is directly associated with **${topic}**?
- A) Standard reference condition **[Correct]**
- B) Inverse random perturbation
- C) Unrelated auxiliary factor
- D) Negative absolute scalar
*Explanation: Standard reference conditions form the baseline for analyzing ${topic}.*

**Q3.** In ${subject}, when dealing with **${topic}**, what must always be verified first?
- A) Final aesthetic layout
- B) Initial prerequisites and units **[Correct]**
- C) External historical commentary
- D) Arbitrary scale conversion
*Explanation: Checking prerequisites and units prevents cascading errors.*

**Q4.** Which formula / rule accurately captures the behavior of **${topic}**?
- A) Standard Relation I **[Correct]**
- B) Inverse Approximation IV
- C) Hypothetical Variant B
- D) Non-convergent Series
*Explanation: Standard Relation I is the standard curriculum formulation.*

**Q5.** What common error occurs when applying **${topic}**?
- A) Omitting the core step or sign **[Correct]**
- B) Over-checking results
- C) Using standard units
- D) Writing clear explanations
*Explanation: Skipping intermediate signs or core steps is the most frequent student mistake.*

---

### Section 2: Application & Problem Solving (Q6 - Q10)

**Q6.** If the parameters of **${topic}** are scaled proportionally, the outcome will:
- A) Increase predictably according to the governing rule **[Correct]**
- B) Remain completely unchanged
- C) Diminish to absolute zero immediately
- D) Fluctuate unpredictably
*Explanation: Direct mathematical/logical relationships in ${topic} yield proportional scaling.*

**Q7.** Which practical scenario best demonstrates the application of **${topic}**?
- A) Laboratory experiment or real-world problem **[Correct]**
- B) Disconnected theoretical hypothesis
- C) Random unmeasured observation
- D) None of the above
*Explanation: Practical problem scenarios directly reflect the operational rules of ${topic}.*

**Q8.** When comparing **${topic}** with related concepts in ${subject}, the key distinction is:
- A) The specific operational conditions **[Correct]**
- B) The font used in textbooks
- C) Arbitrary examiner preference
- D) No measurable distinction exists
*Explanation: Operational conditions differentiate ${topic} from its adjacent concepts.*

**Q9.** In a 2-step exercise on **${topic}**, the first intermediate result represents:
- A) The prerequisite transformation **[Correct]**
- B) The final evaluation
- C) An irrelevant byproduct
- D) The initial boundary limit
*Explanation: The first step establishes the baseline transformation.*

**Q10.** What happens if standard constraints are violated while studying **${topic}**?
- A) The model yields invalid conclusions **[Correct]**
- B) The system becomes infinitely stable
- C) All values become equal
- D) No effect on outcome
*Explanation: Violating domain constraints invalidates the deduction.*

---

### Section 3: Analytical & Complex Questions (Q11 - Q15)

**Q11.** Which analytical approach provides the most rigorous verification for **${topic}**?
- A) Substitution of boundary cases **[Correct]**
- B) Guesswork based on options
- C) Visual estimation alone
- D) Disregarding intermediate terms
*Explanation: Boundary testing rigorously validates solutions.*

**Q12.** Consider an edge case in **${topic}**. The expected behavior is:
- A) Convergence to the defined boundary limit **[Correct]**
- B) Spontaneous divergence
- C) Immediate zeroing of all parameters
- D) Indefinite ambiguity
*Explanation: Edge cases follow defined limits in standard ${subject}.*

**Q13.** Why is **${topic}** considered a prerequisite for higher-level ${subject}?
- A) It develops foundational problem-solving frameworks **[Correct]**
- B) It is merely traditional
- C) It contains no applicable rules
- D) It avoids all mathematical/logical reasoning
*Explanation: Foundational frameworks enable tackling advanced curriculum topics.*

**Q14.** A student derives an answer for **${topic}** with reversed polarity/sign. The root cause is:
- A) Failure to distribute negative operators or direction vectors **[Correct]**
- B) Correct step execution
- C) Standard curriculum convention
- D) High precision calculation
*Explanation: Sign distribution failure is the standard root cause.*

**Q15.** Which statement best synthesizes the core principle of **${topic}**?
- A) "Under defined conditions, ${topic} yields structured, reproducible outcomes." **[Correct]**
- B) "${topic} operates completely at random."
- C) "${topic} cannot be verified by any standard method."
- D) "${topic} applies only in theoretical models with no real examples."
*Explanation: Reproducibility under defined conditions is the defining benchmark.*

---

## ðŸ“Š Quick Answer Key Summary
1: B | 2: A | 3: B | 4: A | 5: A | 6: A | 7: A | 8: A | 9: A | 10: A | 11: A | 12: A | 13: A | 14: A | 15: A`;

    case "question_paper":
      return `# ${subject} â€” Examination Paper
**Class:** ${classLevel} | **Time Allowed:** 1 Hour | **Maximum Marks:** 40
**Topic / Unit:** ${topic}${objLine}
${contextNote}
---

### General Instructions:
1. All questions are compulsory.
2. Section A contains 10 objective questions of 1 mark each.
3. Section B contains 5 short-answer questions of 3 marks each.
4. Section C contains 3 long-answer/analytical questions of 5 marks each.
5. Use of neat diagrams, working steps, and standard notation is expected where relevant.

---

### SECTION A: Objective Questions (10 Ã— 1 = 10 Marks)
1. Define the fundamental term in **${topic}**.
2. State the SI unit / standard convention used in **${topic}**.
3. Fill in the blank: *The primary factor influencing ${topic} is ________.*
4. Identify whether **${topic}** is directly or inversely related to its primary variable.
5. Give one practical everyday application of **${topic}**.
6. Correct the false statement: *"In ${topic}, boundary values can be ignored."*
7. State the governing equation or primary grammatical rule for **${topic}**.
8. Name the scientist / scholar / concept originator associated with **${topic}** if applicable.
9. What happens to **${topic}** when standard input conditions approach zero?
10. Write the dimensional formula or categorical classification of **${topic}**.

---

### SECTION B: Short Answer Questions (5 Ã— 3 = 15 Marks)
11. Explain the mechanism / working process of **${topic}** with a brief structured diagram or flow.
12. Solve the following numerical/conceptual problem regarding **${topic}**:
    > *Calculate or deduce the outcome when the primary parameters are set to standard test values.*
13. Differentiate between **${topic}** and its adjacent counterpart in ${subject} with 3 distinct points.
14. Explain two common errors made by students when evaluating **${topic}** and how to prevent them.
15. Outline a laboratory or classroom experiment to demonstrate the key principle of **${topic}**.

---

### SECTION C: Long Answer / Analytical Questions (3 Ã— 5 = 15 Marks)
16. **Comprehensive Analysis:**
    - (a) Derive or explain in detail the complete formulation of **${topic}**. *(3 Marks)*
    - (b) Apply the derived concept to a multi-step real-world case scenario. *(2 Marks)*

17. **Problem Solving & Proof:**
    - (a) Provide a full step-by-step solution to a complex problem based on **${topic}**. *(3 Marks)*
    - (b) Verify the solution using boundary conditions or alternative methods. *(2 Marks)*

18. **Evaluation & Synthesis:**
    - Discuss the significance of **${topic}** in modern ${subject}. Evaluate how recent developments or advanced applications rely on this fundamental principle. *(5 Marks)*

---

### ðŸ“ Marking Scheme & Solutions
- **Q1-Q10:** 1 Mark for precise definition/value.
- **Q11-Q15:** 1 Mark for formula/rule, 1 Mark for step-by-step working, 1 Mark for accurate conclusion.
- **Q16-Q18:** 2 Marks for conceptual derivation, 2 Marks for mathematical/logical execution, 1 Mark for units & diagram accuracy.`;

    case "worksheet":
      return `# ${subject} â€” Practice Worksheet: ${topic}
**Class:** ${classLevel} | **Student Name:** ___________________ | **Date:** ___________
**Difficulty:** ${diffLabel}${objLine}
${contextNote}
---

## âš¡ Warm-Up Drill (2 Mins)
1. Write 2 keywords that come to mind when you hear **${topic}**:
   - (a) ____________________________
   - (b) ____________________________

---

## âœï¸ Section A: Fill in the Blanks
1. The standard representation of **${topic}** is denoted by ____________.
2. When applying **${topic}**, we must always ensure that the units are in ____________.
3. The relationship between the two primary factors of **${topic}** is ____________.
4. An increase in the baseline parameter of **${topic}** causes the output to ____________.
5. In ${subject}, **${topic}** is categorized under the unit of ____________.

---

## ðŸ§© Section B: Short Practice Questions
1. **Problem 1:** Apply the standard formula/rule of **${topic}** with given values $X = 10, Y = 5$. Find the resultant.
   > *Space for working:*
   \n\n\n
2. **Problem 2:** Identify the mistake in this student's solution: *"In ${topic}, we simply added the quantities without converting units."* Explain why this is incorrect.
   > *Space for working:*
   \n\n\n
3. **Problem 3:** Rewrite the core statement of **${topic}** in your own words in 2 clear sentences.
   > *Space for working:*
   \n\n\n

---

## ðŸš€ Section C: Multi-Step Application Drill
1. A real-world system utilizes **${topic}** to achieve optimal efficiency.
   - Step 1: Formulate the initial equation/condition.
   - Step 2: Calculate the intermediate transformation.
   - Step 3: Conclude with the final evaluated value and specify units.

---

## ðŸ† Bonus Challenge (Fast Finishers)
*Investigate what happens if the input parameter is quadrupled while all other conditions remain constant. Justify your answer mathematically or logically.*

---

## ðŸ’¡ Answer Key (For Self-Correction)
- **Section A:** 1. Standard symbol | 2. Standard SI units | 3. Direct/Inverse proportional | 4. Increase/Decrease proportionally | 5. Primary Curriculum Module
- **Section B1:** Working steps: Substitute $X=10, Y=5$ into formula $\rightarrow$ Final value evaluated.
- **Section B2:** Units must be uniform before arithmetic operations.`;

    case "revision":
      return `# ${subject} â€” 7-Day High-Yield Revision Plan: ${topic}
**Class:** ${classLevel} | **Target:** Exam Mastery & 100% Concept Retention${objLine}
${contextNote}
---

## ðŸŽ¯ High-Yield Concept Summary (Top 5 Things to Memorize)
1. **Core Law/Definition:** Master the 1-sentence textbook definition of **${topic}**.
2. **Key Equation/Formula:** Know every single variable and its unit cold.
3. **Primary Graph/Diagram:** Be able to sketch the standard diagram with labels from memory in 60 seconds.
4. **Golden Rule of Problem Solving:** Always list *Given*, *To Find*, *Formula*, *Substitution*, and *Units*.
5. **Top Exam Trap:** Do not confuse the sign conventions or boundary limits.

---

## ðŸ“… 7-Day Revision Schedule

| Day | Focus Area | Recommended Time | Goal / Actionable Task |
|-----|------------|------------------|------------------------|
| **Day 1** | Concept Breakdown | 25 mins | Read core notes on **${topic}** and write summary flashcards. |
| **Day 2** | Formulas & Rules | 20 mins | Write the formulas 5 times without looking; memorize units. |
| **Day 3** | Foundational Practice | 30 mins | Solve 5 easy and 5 medium textbook questions on **${topic}**. |
| **Day 4** | Mistake Analysis | 25 mins | Review previous incorrect answers; highlight common pitfalls. |
| **Day 5** | Timed Diagnostic Drill | 30 mins | Complete a 10-question timed quiz without notes. |
| **Day 6** | Advanced & HOTS | 35 mins | Tackle 3 challenging exam-style multi-step questions. |
| **Day 7** | Final Rapid Recall | 15 mins | Teach **${topic}** to a peer or recite the entire chapter summary. |

---

## âš ï¸ 3 Costly Mistakes Students Make in Exams
1. **Rushing without writing the formula:** Examiners award step marks for formulas even if arithmetic fails.
2. **Unit Conversion Omission:** Forgetting to convert minutes to seconds, or cm to meters.
3. **Misreading the Keyword:** Confusing *"explain"* with *"state"* or *"calculate"* with *"estimate"*.

---

## ðŸ“ 5 Self-Test Practice Questions
1. State the fundamental theorem of **${topic}**. *(2 Marks)*
2. Calculate the value when standard initial values are provided. *(3 Marks)*
3. Draw a neat labeled diagram illustrating **${topic}**. *(3 Marks)*
4. Solve a 2-part application problem. *(4 Marks)*
5. Justify why **${topic}** holds true under standard atmospheric/system conditions. *(3 Marks)*`;

    default: // notes, remedial, advanced, summary, lesson_plan, etc.
      return `# ${subject} â€” ${MATERIAL_LABELS[tool] || "Study Notes"}: ${topic}
**Class:** ${classLevel} | **Difficulty:** ${diffLabel}${objLine}
${contextNote}
---

## 1. Executive Summary & Overview
**${topic}** is a core component of the ${classLevel} ${subject} curriculum. Understanding this topic builds the necessary analytical foundation for subsequent units and examination success.

---

## 2. Core Concepts & Theoretical Framework

### Key Principles
- **Principle 1:** The fundamental definition and governing rules of **${topic}**.
- **Principle 2:** The direct and indirect dependencies that influence outcomes.
- **Principle 3:** Structural and contextual rules essential for correct evaluation.

### Quick Reference Table
| Parameter / Concept | Description | Significance in ${subject} |
|---------------------|-------------|----------------------------|
| Baseline Component | The primary foundation of ${topic} | Establishes starting condition |
| Operational Rule | How ${topic} interacts with variables | Governs step execution |
| Final Outcome | The evaluated result | Determines practical solution |

---

## 3. Step-by-Step Worked Examples

### Example 1 (Standard Application)
- **Problem Statement:** Explain and apply the core principles of **${topic}** to a standard curriculum scenario.
- **Step 1 (Identification):** Identify the given parameters and required outcome.
- **Step 2 (Execution):** Apply the governing rules systematically:
  $$ \\text{Result} = \\text{Standard Formulation}(\\text{Parameters}) $$
- **Step 3 (Conclusion):** Verify consistency and conclude with appropriate units and terminology.

---

## 4. Common Pitfalls & How to Avoid Them
1. **Misidentifying variables:** Always list given values clearly before starting.
2. **Skipping step-by-step reasoning:** Marks are awarded for procedural accuracy.
3. **Ignoring edge constraints:** Verify that conditions satisfy the baseline requirements.

---

## 5. Check for Understanding (Practice Questions)
1. Define **${topic}** in your own words. *(2 Marks)*
2. Solve a standard problem using the principles outlined above. *(3 Marks)*
3. Evaluate a multi-step scenario involving **${topic}**. *(5 Marks)*

**Answers:**
1. *Precise curriculum definition with key technical terms.*
2. *Step-by-step worked solution.*
3. *Full analytical evaluation matching the marking scheme.*`;
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("teacher");
    const body = await request.json();
    const {
      tool = "notes",
      subject = "Subject",
      classLevel = "Class 10",
      topic = "",
      difficultyLevel = "medium",
      learningObjective = "",
      resourceContext = "",
      refinementPrompt = "",
      previousContent = "",
    } = body;

    if (!topic?.trim() && !resourceContext?.trim()) {
      return NextResponse.json(
        { error: "Please provide a topic or reference notes to generate material." },
        { status: 400 }
      );
    }

    const materialName = MATERIAL_LABELS[tool] || tool;
    const subjectContext = getSubjectDomainContext(subject);
    const materialInstructions = getMaterialTypeInstructions(tool, topic || "the provided content", subject, classLevel, difficultyLevel);

    let prompt = "";

    if (refinementPrompt && previousContent) {
      prompt = `You are an expert ${subject} educator refining existing educational material.

TEACHER'S INSTRUCTION: "${refinementPrompt}"

CURRENT MATERIAL TO REFINE:
"""
${previousContent.slice(0, 6000)}
"""

SUBJECT CONTEXT:
${subjectContext}

TARGET AUDIENCE: ${classLevel} students
DIFFICULTY: ${difficultyLevel}
${resourceContext ? `\nREFERENCE NOTES (keep content grounded in these):\n"""\n${resourceContext.slice(0, 3000)}\n"""\n` : ""}

CRITICAL RULES:
1. Apply the teacher's instruction precisely and completely
2. Keep ALL content strictly within the ${subject} subject domain for the topic in the material
3. Maintain the same material type structure (${materialName})
4. Do NOT introduce content from other subject domains
5. Output clean Markdown with clear headings and formatting`;
    } else {
      prompt = `You are an expert ${subject} educator. Generate a ${materialName} for ${classLevel} students.

TOPIC: "${topic || "Content from uploaded reference notes"}"
SUBJECT: ${subject}

SUBJECT DOMAIN RULES (READ CAREFULLY):
${subjectContext}

MATERIAL TYPE REQUIREMENTS:
${materialInstructions}
${learningObjective ? `\nSPECIFIC LEARNING OBJECTIVE: "${learningObjective}"\n` : ""}
${resourceContext ? `\nTEACHER'S REFERENCE NOTES (use as primary source â€” ground all content in these notes):\n"""\n${resourceContext.slice(0, 4000)}\n"""\n` : ""}
${resourceContext ? "" : `\nIMPORTANT: Since no reference notes were provided, generate content based entirely on standard ${classLevel} ${subject} curriculum for the topic "${topic}". All examples, questions, and explanations must be directly about "${topic}" in ${subject}.\n`}

OUTPUT REQUIREMENTS:
- Format in clean Markdown with ## headings, bullet points, and numbered lists
- Every single section must be directly about "${topic}" in ${subject}
- If the tool is Quiz, generate an actual numbered quiz with questions and answers
- If the tool is MCQs, generate 15 numbered multiple choice questions with A/B/C/D options, marked answers, and answer key
- If the tool is Exam Paper, generate Section A, Section B, Section C with marks and instructions
- If the tool is Worksheet, generate exercises with fill-in-blanks, practice problems, and solutions
- If the tool is Revision, generate a 7-day schedule with formulas and practice
- Make the content immediately useful for a teacher to distribute to students
- Be specific, factual, and educationally accurate`;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (apiKey) {
      const modelsToTry = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash"
      ];

      for (const modelName of modelsToTry) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.4,
                  maxOutputTokens: 4000,
                },
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (content && content.trim().length > 50) {
              return NextResponse.json({ content });
            }
          }
        } catch (aiErr) {
          console.warn(`Gemini model ${modelName} call failed, trying fallback:`, aiErr);
        }
      }
    }

    // High-quality subject and tool-aware fallback
    const fallbackContent = generateSubjectAwareFallback(
      tool, subject, classLevel,
      topic || "Key Concepts",
      difficultyLevel, learningObjective, resourceContext
    );

    return NextResponse.json({ content: fallbackContent, isTemplate: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Material generation failed" }, { status: 500 });
  }
}
