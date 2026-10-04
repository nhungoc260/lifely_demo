import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { ContactForm } from "@/components/support/contact-form";
import { SUPPORT } from "@/lib/support";

interface Doc { title: string; intro: string; sections: { h: string; p: string }[] }

const DISCLAIMER = "LIFELY is a coordination platform and does not provide medical diagnosis, treatment, transfusion decisions, or final donor eligibility decisions. Final eligibility and transfusion decisions must be made by qualified healthcare professionals.";

const DOCS: Record<string, Doc> = {
  faq: {
    title: "Frequently asked questions",
    intro: "Quick answers about how LIFELY works.",
    sections: [
      { h: "Does LIFELY decide who can donate?", p: "No. LIFELY ranks and notifies people who may be able to help. Healthcare professionals always make the final eligibility decision." },
      { h: "Who sees my phone number?", p: "Nobody by default. A requester sees your name and phone only after you accept their request, so they can coordinate with you." },
      { h: "How does LIFELY pick donors?", p: "Using clear rules: blood compatibility, distance, availability, whether you can reach the hospital in time, and time since your last donation. There is no AI involved." },
      { h: "Why was my request not published immediately?", p: "Requests from individuals are verified by an administrator or a verified hospital first, to prevent fake or duplicated requests. Requests from verified organizations are published immediately." },
      { h: "Is this connected to a real hospital system?", p: "This prototype is not integrated with hospital records, blood bank inventory or government identity systems." },
    ],
  },
  safety: {
    title: "Safety",
    intro: "How we protect donors, patients and families.",
    sections: [
      { h: "Verification", p: "Organizations upload documents that our team reviews. Requests are verified before donors are contacted." },
      { h: "Privacy of donors", p: "We only show an approximate area, never a donor's exact location, and we never publish donor phone numbers." },
      { h: "Report problems", p: "Use the Report button on any request to flag fake, spam or incorrect information. Administrators review every report." },
      { h: "In an emergency", p: "Contact the hospital or local emergency services directly. LIFELY is a coordination aid, not an emergency service." },
    ],
  },
  contact: {
    title: "Contact",
    intro: "We would love to hear from you.",
    sections: [
      { h: `Staff hotline: ${SUPPORT.name}`, p: `Call ${SUPPORT.phoneDisplay} for help creating a request, joining as a donor, or any question about LIFELY. If a patient is in danger, call emergency services ${SUPPORT.emergencyNumber} or the hospital first: LIFELY is a coordination platform, not an emergency service.` },
      { h: "Email", p: "support@lifely.demo (demo address for this prototype)." },
      { h: "Partnerships", p: "Hospitals and blood centers can register directly from the sign-up page; our team will review your documents." },
    ],
  },
  privacy: {
    title: "Privacy",
    intro: "What we collect and why.",
    sections: [
      { h: "What we collect", p: "Account details, blood type, an approximate location used only for matching, availability and donation history you choose to share." },
      { h: "What we never make public", p: "Exact donor location, private phone numbers, and patient or medical information." },
      { h: "Your controls", p: "You can turn off emergency matching and notifications at any time in your profile privacy settings." },
      { h: "Retention", p: "Important records such as requests are kept with a status rather than deleted, so activity stays traceable." },
    ],
  },
  terms: {
    title: "Terms of use",
    intro: "Please read before using LIFELY.",
    sections: [
      { h: "Acceptable use", p: "Do not create fake requests, spam, harass others or misuse contact details shared with you." },
      { h: "No medical service", p: DISCLAIMER },
      { h: "Accounts", p: "We may suspend accounts that violate these terms to protect patients and donors." },
    ],
  },
  "medical-disclaimer": {
    title: "Medical disclaimer",
    intro: "Important information about what LIFELY is, and is not.",
    sections: [{ h: "Coordination only", p: DISCLAIMER }, { h: "Matching score", p: "The matching score is used only to prioritize coordination. It is not a medical assessment." }],
  },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: DOCS[slug]?.title ?? "LIFELY" };
}

export default async function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) notFound();
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-5 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">{doc.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{doc.intro}</p>
        <div className="mt-10 space-y-8">
          {doc.sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-lg font-semibold">{s.h}</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{s.p}</p>
            </section>
          ))}
        </div>
        {slug === "contact" && <div className="mt-12"><ContactForm /></div>}
      </main>
      <Footer />
    </>
  );
}
