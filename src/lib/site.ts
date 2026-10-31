/** Сайттың негізгі адресі (sitemap, robots, сілтеме суреті). Басқа домен болса — .env.local → NEXT_PUBLIC_SITE_URL */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://chemverse-ai.vercel.app").replace(/\/$/, "");
