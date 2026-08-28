import LandingHeader from "@/components/landing/LandingHeader";
import HeroSection from "@/components/landing/HeroSection";
import BuiltForSchoolSection from "@/components/landing/BuiltForSchoolSection";
import StudentExperienceSection from "@/components/landing/StudentExperienceSection";
import TeacherExperienceSection from "@/components/landing/TeacherExperienceSection";
import SchoolIntelligenceSection from "@/components/landing/SchoolIntelligenceSection";
import AboutSection from "@/components/landing/AboutSection";
import LandingFooter from "@/components/landing/LandingFooter";

export const metadata = {
  title: "EduPredict — Smarter Learning. Better Futures.",
  description:
    "EduPredict is a smart school platform that helps students learn, teachers teach, and schools understand progress.",
};

export default function Home() {
  return (
    <div className="landing-page public-page min-h-screen bg-white text-slate-900 selection:bg-cyan-500 selection:text-slate-950">
      <LandingHeader />
      <main>
        <HeroSection />
        <BuiltForSchoolSection />
        <StudentExperienceSection />
        <TeacherExperienceSection />
        <SchoolIntelligenceSection />
        <AboutSection />
      </main>
      <LandingFooter />
    </div>
  );
}
