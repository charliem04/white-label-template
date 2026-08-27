import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { About } from "@/components/About";
import { Testimonials } from "@/components/Testimonials";
import { Booking } from "@/components/Booking";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { CookieConsent } from "@/components/CookieConsent";
import { StickyCTA } from "@/components/StickyCTA";
import { Analytics } from "@/components/Analytics";
import { ScrollProgress } from "@/components/ScrollProgress";

export default function Home() {
  return (
    <>
      <ScrollProgress />
      <Nav />
      <main className="pb-14 md:pb-0">
        <Hero />
        <Services />
        <About />
        <Testimonials />
        <Booking />
        <Contact />
      </main>
      <Footer />
      <StickyCTA />
      <CookieConsent />
      <Analytics />
    </>
  );
}
