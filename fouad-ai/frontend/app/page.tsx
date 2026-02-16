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
      <div className="bg-card rounded-b-3xl shadow-sm">
        <LandingHeader />
      </div>
      <HeroSection />
      <TransactionTypesSection />
      <ServiceTiersSection />
      <HowItWorksSection />
      <FeaturesSection />
      <RoadmapSection />
      <FAQSection />
      <Footer />
    </div>
  )
}
