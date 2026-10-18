/** Жауап нұсқаларының түстері: проекторда да, телефонда да бірдей (A, B, C, D) */
export const OPTION_STYLE: Record<string, { bg: string; bar: string; text: string; shape: string }> = {
  A: { bg: "bg-pink", bar: "bg-pink", text: "text-pink", shape: "▲" },
  B: { bg: "bg-cyan", bar: "bg-cyan", text: "text-cyan", shape: "◆" },
  C: { bg: "bg-amber", bar: "bg-amber", text: "text-amber", shape: "●" },
  D: { bg: "bg-good", bar: "bg-good", text: "text-good", shape: "■" },
  E: { bg: "bg-muted-foreground", bar: "bg-muted-foreground", text: "text-muted-foreground", shape: "★" },
};

export const optionStyle = (label: string) => OPTION_STYLE[label] ?? OPTION_STYLE.E;
