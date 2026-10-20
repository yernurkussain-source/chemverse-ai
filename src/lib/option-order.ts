/**
 * Тест нұсқаларының ретін араластыру (нақты ҰБТ-дағыдай): әр сессияда әр сұрақтың нұсқалары
 * басқа ретпен көрсетіледі, әріптер (A, B, C, D) жаңа ретпен қайта қойылады.
 * Сонда дұрыс жауап қай әріпте тұратыны алдын ала белгісіз («бәріне B» деп белгілеу көмектеспейді).
 *
 * Рет seed-ке (сессия id + сұрақ id) тәуелді: бетті жаңартса да, нәтиже бетінде де рет бірдей.
 * Дерекқордағы әріптер өзгермейді — тек көрсетілуі.
 */
const LABELS = ["A", "B", "C", "D", "E"];

/** Жолдан 32-биттік сан (FNV-1a) */
function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Seed бойынша қайталанатын кездейсоқ сандар (mulberry32), 0 ≤ x < 1 */
function seededRandom(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleOptions<T extends { label: string }>(options: T[], seed: string): T[] {
  const result = [...options].sort((a, b) => a.label.localeCompare(b.label));
  const random = seededRandom(hash(seed));
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.map((option, i) => ({ ...option, label: LABELS[i] ?? option.label }));
}
