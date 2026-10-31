import { getElement } from "@/lib/chemistry/elements";
import { getMolecule } from "@/lib/chemistry/molecules";
import { getLab, labHref } from "@/features/virtual-lab/catalog";

/**
 * QR түрлері (BLUEPRINT 6-бөлім). Сыныпқа қосылу QR-ы Live сабақ экранында (live-host.tsx);
 * сабақ пен үй тапсырмасы беттері дайын болғанда осында қосылады (дерекқор оларды қабылдайды).
 */
export const QR_TYPES = ["ar", "molecule", "element", "lab", "exam"] as const;
export type QrType = (typeof QR_TYPES)[number];

/** Платформадағы тесттер (seed.sql) */
export const EXAM_TARGETS = ["unt-demo"] as const;

export type QrResource = {
  id: string;
  token: string;
  type: QrType;
  target: string;
  /** Қай сыныпқа арналған (null — барлық сыныпқа ортақ) */
  class_id: string | null;
  scan_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
};

export const isQrType = (value: string): value is QrType => (QR_TYPES as readonly string[]).includes(value);

/** QR нысаны дұрыс па (мысалы молекула бар ма) — тексерілген мәнді қайтарады, әйтпесе null */
export function normalizeTarget(type: QrType, target: string): string | null {
  switch (type) {
    case "ar":
    case "molecule":
      return getMolecule(target)?.id ?? null;
    case "element":
      return getElement(target)?.symbol ?? null;
    case "lab":
      return getLab(target)?.slug ?? null;
    case "exam":
      return (EXAM_TARGETS as readonly string[]).includes(target) ? target : null;
  }
}

/** QR сканерленгенде ашылатын бет (тілсіз жол, мысалы "/ar/h2o") */
export function qrDestination(type: QrType, target: string): string {
  switch (type) {
    case "ar":
      return `/ar/${target}`;
    case "molecule":
      return `/molecules/${target}`;
    case "element":
      return `/periodic-table?el=${encodeURIComponent(target)}`;
    case "lab": {
      const lab = getLab(target);
      return lab ? labHref(lab) : "/virtual-lab";
    }
    case "exam":
      return "/exam/unt";
  }
}

/** Токен: 8 таңба, тек әріптер мен сандар (URL-де қауіпсіз, болжауға қиын) */
export const TOKEN_PATTERN = /^[A-Za-z0-9]{8}$/;
