import type { MetadataRoute } from "next";
import { listLessons } from "@/features/lessons/lessons";
import { LAB_CATALOG } from "@/features/virtual-lab/catalog";
import { routing } from "@/i18n/routing";
import { MOLECULES } from "@/lib/chemistry/molecules";
import { SITE_URL } from "@/lib/site";

// Іздеу жүйелеріне ашық беттер (кіруді талап ететін беттер — robots.ts-те жабық)
const PAGES = ["", "/learn", "/exam/unt", "/exam/bbzhm", "/olympiad", "/virtual-lab", "/game", "/molecules", "/periodic-table", "/ai-tutor", "/install", "/demo", "/about", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    ...PAGES,
    ...listLessons().map((lesson) => `/learn/${lesson.slug}`),
    ...LAB_CATALOG.filter((lab) => !("href" in lab)).map((lab) => `/virtual-lab/${lab.slug}`),
    ...MOLECULES.map((molecule) => `/molecules/${molecule.id}`),
  ];
  return paths.map((path) => ({
    url: `${SITE_URL}/${routing.defaultLocale}${path}`,
    alternates: { languages: Object.fromEntries(routing.locales.map((locale) => [locale, `${SITE_URL}/${locale}${path}`])) },
  }));
}
