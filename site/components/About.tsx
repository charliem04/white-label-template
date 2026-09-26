import { client } from "@/client.config";
import { stagger } from "@/lib/motion";
import { Reveal, RevealGroup } from "./Reveal";
import { SectionHead } from "./SectionHead";

/**
 * Who is doing the work. Photo on one side, the client's own words on
 * the other, and the shop-door facts as a ruled mono line rather than a
 * stat-box band — a row of big round numbers in boxes is the most
 * recognisable template pattern there is, and scripts/check.mjs flags
 * it.
 */
export function About() {
  const { about } = client;
  return (
    <section id="about" className="band border-y border-line bg-surface-alt">
      <div className="section grid items-center gap-[clamp(30px,5vw,72px)] md:grid-cols-2">
        <Reveal variant="scale">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={about.photo.src}
            alt={about.photo.alt}
            width={about.photo.width}
            height={about.photo.height}
            loading="lazy"
            className="aspect-[4/3] w-full rounded border border-line object-cover"
          />
        </Reveal>

        <div>
          <SectionHead heading={about.heading} />
          <RevealGroup className="mt-6 space-y-4">
            {about.body.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </RevealGroup>

          {about.stats.length > 0 && (
            <Reveal delay={stagger.loose}>
              <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3 border-t border-line pt-5">
                {about.stats.map((s) => (
                  <div key={s.label}>
                    <dt className="u-label">{s.label}</dt>
                    <dd className="m-0 mt-1 font-mono text-lg font-semibold tabular-nums text-ink">
                      {s.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          )}

          {about.towns.length > 0 && (
            <Reveal delay={stagger.loose}>
              <p className="u-label mt-6">{about.towns.join("  ·  ")}</p>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
