import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/landing/navbar";
import { Audiences, EmergencyRequests, HowItWorks, Impact, MapPreview, Trust } from "@/components/landing/sections";

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">
        <Hero />
        <Impact />
        <HowItWorks />
        <EmergencyRequests />
        <MapPreview />
        <Audiences />
        <Trust />
      </main>
      <Footer />
    </>
  );
}
