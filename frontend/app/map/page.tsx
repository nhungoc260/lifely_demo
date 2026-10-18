import { EmergencyMap } from "@/components/map/emergency-map";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";

export default function MapPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <EmergencyMap />
      </main>
      <Footer />
    </>
  );
}
