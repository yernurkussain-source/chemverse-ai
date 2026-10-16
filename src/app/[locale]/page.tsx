import { AiSection } from "@/components/landing/ai-section";
import { AppShowcase } from "@/components/landing/app-showcase";
import { Hero } from "@/components/landing/hero";
import { LabSection } from "@/components/landing/lab-section";
import { LiveSection } from "@/components/landing/live-section";
import { ModulesGrid } from "@/components/landing/modules-grid";
import { StudioSection } from "@/components/landing/studio-section";

// Басты бет (design/prototype.html бойынша)
export default function HomePage() {
  return (
    <>
      <Hero />
      <ModulesGrid />
      <LabSection />
      <AiSection />
      <LiveSection />
      <StudioSection />
      <AppShowcase />
    </>
  );
}
