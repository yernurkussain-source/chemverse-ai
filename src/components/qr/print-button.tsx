"use client";

import { Button } from "@/components/ui/button";

/** Браузердің басып шығару терезесін ашады (бет @media print стильдерімен A4-ке бейімделген) */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button type="button" variant="glow" size="pill-sm" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
