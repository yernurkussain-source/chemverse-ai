import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Тілді ескеретін Link, usePathname т.б. — next/link орнына осыларды қолданыңыз
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
