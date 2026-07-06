"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Drives the sidebar's active-item state for the Awards System page:
 * - IntersectionObserver marks a section active as it crosses the
 *   upper-middle of the viewport while scrolling.
 * - `scrollTo` smooth-scrolls to a section and immediately marks it active
 *   (so clicking doesn't wait for the observer to catch up).
 * - On mount, an initial `#<slug>` in the URL (the homepage deep-link) is
 *   honored by scrolling to that section.
 *
 * `slugs` must be a referentially stable array (defined at module scope by
 * the caller) — it is an effect dependency.
 */
export function useActiveSection(slugs: string[]) {
  const [active, setActive] = useState<string>(slugs[0] ?? "");

  // One-time sync from the URL hash on mount (homepage deep-link support).
  // Justified: this reads window.location, which isn't available during SSR,
  // so it can only run after mount — an effect is the correct place for it.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash || !slugs.includes(hash)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount sync from the URL hash, not derivable during render.
    setActive(hash);
    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only.
  }, []);

  useEffect(() => {
    const elements = slugs
      .map((slug) => document.getElementById(slug))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [slugs]);

  const scrollTo = useCallback((slug: string) => {
    document.getElementById(slug)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(slug);
  }, []);

  return { active, scrollTo };
}
