# EduPredict

> **Intelligent School Management & Real-Time Student Risk Forecasting Platform**  
> Built with Next.js 15, React 19, TypeScript, Drizzle ORM, MySQL, Google Gemini API, and Expo React Native.

---

## ⚡ Overview

**EduPredict** is an end-to-end institutional intelligence platform that unifies students, teachers, parents, administrators, and transport operators into a single data-driven ecosystem. 

Rather than functioning as a passive administrative ledger, EduPredict actively identifies academic degradation before it impacts final grades. Its predictive analytics engine ingests live classroom attendance, continuous assessment scores, and temporal learning momentum to forecast subject-level grade bands, calculate risk levels, and synthesize personalized cognitive study regimens powered by Google Gemini.

```
                  ┌─────────────────────────────────────────────────────────────┐
                  │                      EDUPREDICT SYSTEM                      │
                  └──────┬───────────────────────┬───────────────────────┬──────┘
                         │                       │                       │
           ┌─────────────▼────────────┐ ┌────────▼─────────┐ ┌───────────▼────────────┐
           │     ACADEMIC PORTALS     │ │  PREDICTIVE AI   │ │   IOT & TRANSPORT      │
           │  • Admin Control Center  │ │  • Trend Engine  │ │  • Expo Driver Mobile  │
           │  • Teacher Workspace     │ │  • Risk Scoring  │ │  • Real-Time Location  │
           │  • Student AI Studio     │ │  • Gemini 3.6    │ │  • Route & Bus ETA     │
           │  • Parent Monitoring     │ │  • Auto-Revision │ │  • Parent Live Tracker │
           └──────────────────────────┘ └──────────────────┘ └────────────────────────┘
```

---

## 🌟 Key Role Portals

| Portal | Primary Capabilities | Key Route |
| :--- | :--- | :--- |
| **👨‍💼 Admin Console** | Institutional KPI monitoring, timetable designer, multi-department role access, student/teacher directories, and database auditing. | `/admin` |
| **👩‍🏫 Teacher Workspace** | 4-tab student diagnostic modal (Personal / Academic / Performance / Guardian), dynamic attendance grid, AI lesson note & homework generation. | `/teacher` |
| **🎓 Student AI Studio** | Predictive grade trajectory charts, subject-by-subject risk indicators, AI doubt solver, curated revision resources, and personalized study buddies. | `/student` |
| **👨‍👩‍👧 Parent Portal** | Real-time child performance tracking, predictive report cards, attendance alerts, digital leave applications, and live school bus tracking. | `/parent` |
| **🚌 Driver Mobile App** | Cross-platform Expo / React Native mobile app with real-time GPS coordinate telemetry broadcasting bus positions to parents. | `driver-app/` |

---

## 🧠 How the AI Works

EduPredict employs a **Multi-Factor Predictive Scoring Engine** paired with a **Google Gemini Generative AI Layer**:

```
[ Classroom Attendance % ] ──────────┐
[ Longitudinal Exam Scores ] ────────┼──▶ [ Deterministic Scoring Engine ] ──▶ [ Risk & Score Range ] ──▶ [ Gemini API ] ──▶ [ Actionable Study Plan ]
[ Assignment Submissions ] ──────────┘
```

### 1. Data Pipeline & Feature Extraction
* **Weighted Academic Base**: Exam scores ($70\%$) and assignment grades ($30\%$) are normalized to a 100-point scale:
  $$\text{Base} = 0.70 \times \text{ExamAvg} + 0.30 \times \text{AssignmentAvg}$$
* **Attendance Risk Factor**: Attendance below $75\%$ penalizes the forecast by up to $-15\%$ to reflect missed classroom instruction. Consistent attendance above $90\%$ adds a $+1\%$ stability bonus.
* **Temporal Momentum Analysis ($\Delta_{\text{trend}}$)**: The engine splits assessment history chronologically into earlier vs. recent halves, weighting the performance delta by $0.5$ to capture learning velocity.
* **Confidence Level**: Evaluated deterministically (`high`, `medium`, `low`) based on sample density ($N \ge 4$ assessments) and score stability ($|\Delta| < 3$).
* **Risk Classification**:
  * **Low Risk**: Midpoint $\ge 75\%$ $\rightarrow$ Focuses on mastery reinforcement and peer tutoring.
  * **Moderate Risk**: Midpoint $60\% - 74\%$ $\rightarrow$ Triggers targeted active recall and Pomodoro pacing.
  * **High Risk**: Midpoint $< 60\%$ $\rightarrow$ Automatically alerts educators and maps remediation resources.

### 2. Generative AI Layer
The deterministic predictions and subject metrics are passed into Google Gemini (`gemini-3.6-flash`, with fallbacks to `gemini-2.0-flash` and `gemini-1.5-flash` via [`lib/prediction-engine.service.ts`](file:///c:/Users/krish/OneDrive/Desktop/edupredict/lib/prediction-engine.service.ts)) to produce personalized cognitive strategies and targeted problem-set recommendations.

### 3. Worked Example (Live Database Seed Output)

Running `Student ID: 1` (`Raj Kumar`, Class 10-A) through [`prediction-engine.service.ts`](file:///c:/Users/krish/OneDrive/Desktop/edupredict/lib/prediction-engine.service.ts):

#### Inputs:
* **Subject**: Mathematics
* **Assessments**: Periodic Test 1 ($16.50/20.00 = 82.5\%$), Mid-Term Exam ($85.00/100 = 85.0\%$) $\rightarrow$ **Exam Average**: $83.75\%$
* **Attendance**: $100\%$ ($9/9$ sessions present)
* **Assignments**: None recorded (Exam weight takes $100\%$)

#### Computation:
$$\text{Base Score} = 83.75\%$$
$$\text{Attendance Bonus} = (100 - 90) \times 0.1 = +1.0\%$$
$$\text{Trend Momentum} = (85.0 - 82.5) \times 0.5 = +1.25\%$$
$$\text{Forecast Midpoint} = 83.75 + 1.0 + 1.25 = 86.00\%$$
$$\text{Predicted Range} = [86.00 - 3.00, 86.00 + 3.00] = [83.00\%, 89.00\%]$$

#### Output Generated in Database (`ai_predictions` table):
```json
{
  "subjectName": "Mathematics",
  "currentScore": 83.75,
  "predictedScoreMin": 83.00,
  "predictedScoreMax": 89.00,
  "riskLevel": "low",
  "confidence": "medium",
  "academicHealthScore": 90,
  "attendanceImpact": "Consistent attendance of 100% in Mathematics stabilizes your academic projection."
}
```

---

## 🛠️ Tech Stack

```
Frontend:        Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, Sonner
Backend:         Next.js Route Handlers, Server Actions, Drizzle ORM
Database:        MySQL (Connection pool via drizzle-orm/mysql2)
AI & LLMs:       Google Gemini 3.6 Flash / 2.0 Flash / 1.5 Flash (Generative Language API)
Mobile (Driver): Expo SDK 52, React Native, React Navigation
State & Auth:    Zustand, Custom Cookie-Based Multi-Role Session System, bcryptjs
```

---

## 🚀 Quickstart & Demo Setup

### 1. Prerequisites
* Node.js 18+ & npm
* Running MySQL instance

### 2. Clone & Install
```bash
git clone https://github.com/KrishnaSaiTejaSandalla/Edupredict.git
cd Edupredict
npm install
```

### 3. Configure Environment
Create a `.env` file in the root directory:
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=edupredict

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.6-flash
```

### 4. Seed Demo Data
```bash
npx tsx scripts/seed.ts
npx tsx scripts/seed-attendance.ts
npx tsx scripts/seed-exams.ts
npx tsx scripts/seed-assignments.ts
```

### 5. Launch
```bash
npm run dev
# Web application will be live at http://localhost:3000
```

### Demo Accounts
| Role | Email | Access URL |
| :--- | :--- | :--- |
| **Admin** | `admin@stmary.edu` | `http://localhost:3000/admin` |
| **Teacher** | `teacher1@stmary.edu` | `http://localhost:3000/teacher` |
| **Student** | `student1@stmary.edu` | `http://localhost:3000/student` |
| **Parent** | `parent1@stmary.edu` | `http://localhost:3000/parent` |

---

## 👨‍💻 My Role & Engineering Contributions

As the lead architect and developer of **EduPredict**, I designed and implemented the platform end-to-end:

1. **System Architecture & Database Design**:
   - Engineered the normalized relational schema in MySQL via Drizzle ORM spanning $25+$ tables (students, teachers, class subjects, exams, attendance, results, assignments, and predictions).
   - Designed a high-throughput session authentication middleware isolating 4 distinct user roles with path-level security.
2. **AI & Predictive Pipeline Engineering**:
   - Built the multi-factor performance forecasting engine combining longitudinal assessment velocity, attendance thresholds, and confidence intervals.
   - Integrated Google Gemini Flash models (`gemini-3.6-flash` / `gemini-2.0-flash`) for automated doubt resolution, attendance risk summaries, and individualized cognitive study regimens.
3. **Role-Based Portals & Interactive UI**:
   - Developed the full dashboard suite across Admin, Teacher, Student, and Parent experiences with glassmorphic aesthetics, responsive KPI telemetry, and real-time state synchronization.
   - Created the 4-tab student performance diagnosis modal and teacher AI resource generation tools.
4. **Mobile Driver Tracking App**:
   - Built the Expo React Native mobile companion (`driver-app/`) providing live driver route tracking and coordinate telemetry for student transport safety.

---

## 📁 Repository Structure

```
edupredict/
├── app/                  # Next.js 15 App Router (Admin, Teacher, Student, Parent, APIs)
│   ├── api/              # RESTful API routes & Gemini AI handlers
│   ├── admin/            # Institutional management console
│   ├── teacher/          # Teacher dashboard, attendance, assignments, and AI tools
│   ├── student/          # Student portal, performance predictions, resources
│   └── parent/           # Parent monitoring & student progress tracking
├── components/           # Reusable UI component library (Tailwind CSS + Lucide)
├── driver-app/           # Expo / React Native mobile tracking application
├── lib/                  # Prediction engine, DB connection, schema, auth, and services
│   ├── prediction-engine.service.ts # Core AI performance forecasting pipeline
│   ├── schema.ts         # Drizzle ORM relational database schema
│   └── db.ts             # MySQL connection pooling
├── scripts/              # Database migration and realistic demo seed scripts
└── docs/                 # Extended technical documentation and API specifications
```

---

## 🔒 Security & Verification

* **Zero Hardcoded Secrets**: All API tokens and database credentials are fully parameterized through `.env` and excluded via `.gitignore`.
* **Database Verification**: All dashboard figures, charts, and metrics are backed by live relational database queries with zero mock stubs in production routes.
* **TypeScript Integrity**: Verified via `npx tsc --noEmit`.

