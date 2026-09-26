/**
 * ════════════════════════════════════════════════════════════════════
 *  PREVIEW MODE — the build that goes on a temporary URL.
 *
 *  This site is a working replica of a real company: real phone
 *  numbers, real address, real photographs of real jobs, real reviews
 *  by named people. That is the point of the pitch, and it is exactly
 *  what makes putting it on a public URL different from putting up a
 *  mockup.
 *
 *  Three things could go wrong, in rough order of how much they would
 *  cost the client:
 *
 *  1. A stranger finds it and believes it is the client's website. They ring
 *     the number on it — which is the client's real number — and the client's office
 *     answers a call from a site they have never seen. Or they fill in
 *     the form and nobody ever calls them back, because a preview build
 *     has no form key configured. The banner is the answer to this one:
 *     the page says what it is, on every page, without being dismissed.
 *  2. Google indexes it and it competes with example.com — the same
 *     business name, address and phone on two domains is the textbook
 *     way to confuse a local listing. noindex, nofollow, a robots.txt
 *     that disallows everything, and an X-Robots-Tag header, because
 *     any one of the three can be missed and they cost nothing.
 *  3. It quietly stays up for a year after the conversation ends.
 *     Nothing in code fixes that. Take it down.
 *
 *  Set NEXT_PUBLIC_PREVIEW=1 for that build. Unset — a normal
 *  production build — every one of these is inert.
 * ════════════════════════════════════════════════════════════════════
 */

/** Is this the temporary-URL build? */
export const IS_PREVIEW = process.env.NEXT_PUBLIC_PREVIEW === "1";

/**
 * Where somebody who landed here by mistake should actually go. Their
 * real site, not ours.
 */
/**
 * Where the banner sends someone who landed here by mistake.
 *
 * TODO(client): the business's REAL website, if one already exists. If
 * there is no existing site, set this to "" — PreviewBanner drops the
 * link rather than pointing at nothing, and the rest of the banner
 * still does its job.
 */
export const REAL_SITE = "";

/**
 * What the banner says. One sentence, in plain words, answering the
 * only question the accidental visitor has: is this the real thing?
 *
 * TODO(client): rewrite for the engagement. "An unsolicited redesign
 * proposed to <business>" is honest for a pitch; "A staging copy of
 * <business>'s website" is honest for a rebuild. Say which, and say
 * that the forms do not reach anyone.
 */
export const PREVIEW_NOTE =
  "A work-in-progress copy of this business's website. It is not the official site and the forms here do not reach anyone.";
