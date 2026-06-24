import Navbar from "@/app/_components/landing/Navbar";
import HeroSection from "@/app/_components/landing/HeroSection";
import StatsStrip from "@/app/_components/landing/StatsStrip";
import HowItWorks from "@/app/_components/landing/HowItWorks";
import AlertsPreview from "@/app/_components/landing/AlertsPreview";
import FeaturesGrid from "@/app/_components/landing/FeaturesGrid";
import AboutSection from "@/app/_components/landing/AboutSection";
import CTASection from "@/app/_components/landing/CTASection";
import Footer from "@/app/_components/landing/Footer";

export default function LandingPage() {
  return (
    <main className="relative overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <StatsStrip />
      <HowItWorks />
      <AlertsPreview />
      <FeaturesGrid />
      <AboutSection />
      <CTASection />
      <Footer />
    </main>
  );
}
