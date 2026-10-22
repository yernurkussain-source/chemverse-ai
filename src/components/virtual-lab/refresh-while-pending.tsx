"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

/** AI қорытындыны фонда бағалап жатқанда нәтиже бетін 4 секунд сайын жаңартады (ең көбі 1 минут) */
export function RefreshWhilePending() {
  const router = useRouter();
  useEffect(() => {
    let count = 0;
    const id = window.setInterval(() => {
      count += 1;
      router.refresh();
      if (count >= 15) window.clearInterval(id);
    }, 4000);
    return () => window.clearInterval(id);
  }, [router]);
  return null;
}
