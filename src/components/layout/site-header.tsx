import { useTranslations } from "next-intl";
import { AuthButton } from "@/components/auth/auth-button";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

// Басты беттегі бөлімдер (id-лері landing компоненттерінде)
const LINKS = ["modules", "lab", "ai", "class", "teacher", "app"] as const;

export function SiteHeader() {
  const t = useTranslations("Header");

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ink/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="page-wrap flex h-16 items-center gap-3 sm:gap-6">
        <Logo />

        {/* Компьютерде: жоғарғы мәзір */}
        <nav aria-label={t("menuLabel")} className="ml-auto hidden gap-5 text-[0.9rem] text-muted-foreground lg:flex">
          {LINKS.map((id) => (
            <Link key={id} href={`/#${id}`} className="whitespace-nowrap transition-colors hover:text-foreground">
              {t(`links.${id}`)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-2.5 lg:ml-0">
          <ThemeToggle />
          <LocaleSwitcher />
          {/* Телефонда кіру — төменгі мәзірдегі «Профиль» арқылы */}
          <div className="hidden sm:block">
            <AuthButton />
          </div>
          <Link
            href="/demo"
            className={cn(
              buttonVariants({ variant: "glow", size: "pill-sm" }),
              "hidden sm:inline-flex lg:hidden xl:inline-flex",
            )}
          >
            {t("demo")}
          </Link>
        </div>
      </div>
    </header>
  );
}
