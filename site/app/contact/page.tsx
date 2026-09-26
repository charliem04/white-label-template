import { getContactPage } from "@/lib/content";
import { bookingOrigins } from "@/lib/booking";
import { pageMetadata } from "@/lib/meta";
import { client } from "@/client.config";
import { PageHero } from "@/components/PageHero";
import { SectionHead } from "@/components/SectionHead";
import { BookingEmbed } from "@/components/BookingEmbed";
import { Contact } from "@/components/Contact";
import { CtaBand } from "@/components/CtaBand";

const page = getContactPage();

export const metadata = pageMetadata(page.meta);

/**
 * Every primary CTA on the site lands here (CTA_HREF in lib/routes.ts),
 * so this page has to answer whichever way in the visitor actually
 * wanted rather than assuming they had already decided.
 *
 * Routes in, in the order people actually use them: the phone at the
 * top for the ones who are already decided, the calendar — when one is
 * configured — for the ones who hate phone tag, and the form for the
 * ones who would rather write it all down once.
 */
export default function ContactPage() {
  // Warmed only behind cookie consent. Empty when no scheduler is
  // configured, which is why this is a call and not a constant.
  const origins = bookingOrigins();

  return (
    <>
      {origins.map((o) => (
        <link key={o} rel="preconnect" href={o} crossOrigin="" />
      ))}

      <PageHero
        path={page.meta.path}
        heading={page.heading}
        lede={page.lede}
        photo={page.photo}
      />

      {/* The booking band drops out entirely when client.bookingUrl is
          empty — the page keeps the phone and the request form, which
          is a complete contact page on its own. */}
      {client.bookingUrl ? (
        <section className="band bg-surface-alt">
          <div className="section">
            <SectionHead
              heading={page.booking.heading}
              lede={page.booking.lede}
            />
            <BookingEmbed />
          </div>
        </section>
      ) : null}

      <Contact />

      <CtaBand cta={page.cta} line="urgent" />
    </>
  );
}
