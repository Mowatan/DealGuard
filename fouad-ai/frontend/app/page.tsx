import {
  LandingHeader,
  HeroSection,
  HowItWorksSection,
  FeaturesSection,
  RoadmapSection,
  FAQSection,
  Footer,
} from "@/components/landing/hero"
import TransactionTypesSection from "@/components/landing/TransactionTypesSection"
import ServiceTiersSection from "@/components/landing/ServiceTiersSection"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <LandingHeader />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <ServiceTiersSection />
        <TransactionTypesSection />
        <FeaturesSection />
        <RoadmapSection />
        <FAQSection />
      </main>
      <Footer />
    </div>
  )
}
