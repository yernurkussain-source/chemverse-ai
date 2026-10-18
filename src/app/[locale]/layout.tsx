import type { Metadata, Viewport } from "next";
import { Fira_Code, Montserrat, Onest, Unbounded } from "next/font/google";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ThemeScript } from "@/components/layout/theme-script";
import { routing } from "@/i18n/routing";
import "../globals.css";

// Қаріптер қазақ әріптерін (ә, ғ, қ, ң, ө, ұ, ү, һ, і) толық қолдайды — тексерілген.
// Олар cyrillic және cyrillic-ext жиындарында болғандықтан, екеуі де қосылады.
// next/font параметрлері тікелей жазылған мәндер болуы керек (айнымалы болмайды).
const montserrat = Montserrat({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-montserrat",
  display: "swap",
});
const onest = Onest({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-onest",
  display: "swap",
});
const firaCode = Fira_Code({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-fira-code",
  display: "swap",
});
// Unbounded — тек логотип үшін («CHEMVERSE AI» — латын әріптері ғана)
const unbounded = Unbounded({
  subsets: ["latin"],
  weight: "800",
  variable: "--font-unbounded",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return {
    title: { default: t("title"), template: "%s · CHEMVERSE AI" },
    description: t("description"),
  };
}

export const viewport: Viewport = {
  // iPhone-да экранның «ойығы» мен төменгі жолақ үшін safe-area жұмыс істеуі керек
  viewportFit: "cover",
};

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations("Common");

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      // globals.css-тегі smooth scroll бет ауысқанда өшірілуі үшін (Next.js ұсынысы)
      data-scroll-behavior="smooth"
      className={`${montserrat.variable} ${onest.variable} ${firaCode.variable} ${unbounded.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0 print:pb-0">
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-cyan focus:px-4 focus:py-2 focus:text-on-accent"
          >
            {t("skipToContent")}
          </a>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <BottomNav />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
