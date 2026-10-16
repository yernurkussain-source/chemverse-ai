import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16: бұрынғы middleware.ts енді proxy.ts деп аталады
export default createMiddleware(routing);

export const config = {
  // api, _next, _vercel және нүктесі бар файлдардан (favicon.ico т.б.) басқа барлық жол
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
