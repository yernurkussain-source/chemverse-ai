/**
 * Тест сессиясының сұрақтары: банктен тақырыптар бойынша теңдей (кезекпен) таңдау.
 * Әр тақырыптың ішінде және тақырыптардың реті — кездейсоқ, сондықтан әр тапсыру әртүрлі.
 */
export function pickQuestions<T extends { topicId: string }>(pool: T[], count: number, randomInt: (max: number) => number): T[] {
  const shuffle = <U>(items: U[]) => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  const byTopic = new Map<string, T[]>();
  for (const item of pool) byTopic.set(item.topicId, [...(byTopic.get(item.topicId) ?? []), item]);
  const queues = shuffle([...byTopic.values()].map(shuffle));

  const picked: T[] = [];
  while (picked.length < count && queues.some((q) => q.length)) {
    for (const queue of queues) {
      const next = queue.pop();
      if (next && picked.length < count) picked.push(next);
    }
  }
  return shuffle(picked);
}

/** ҰБТ химия пішімі (ҰТО спецификациясы, 2026 жылдан): 25 бір жауапты + 1 контекст + 5 сәйкестендіру + 5 бірнеше жауапты */
export const UNT_FORMAT = { single: 25, context: 5, matching: 5, multiple: 5 } as const;

type FormatItem = { topicId: string; kind: string; contextId: string | null; position: number };

/**
 * ҰБТ нұсқасы: бөлімдер нақты тесттегідей ретпен (1–25, 26–30 контекст, 31–35 сәйкестендіру, 36–40 бірнеше жауап).
 * Контекст кездейсоқ біреу, оның сұрақтары өз ретімен. Банкте бір түр жетпесе — барынша.
 */
export function pickUntFormat<T extends FormatItem>(pool: T[], randomInt: (max: number) => number): T[] {
  const single = pool.filter((q) => q.kind === "single" && !q.contextId);
  const contexts = [...new Set(pool.flatMap((q) => (q.contextId ? [q.contextId] : [])))];
  const contextId = contexts.length ? contexts[randomInt(contexts.length)] : null;
  const context = pool.filter((q) => contextId && q.contextId === contextId).sort((a, b) => a.position - b.position);
  return [
    ...pickQuestions(single, UNT_FORMAT.single, randomInt),
    ...context.slice(0, UNT_FORMAT.context),
    ...pickQuestions(pool.filter((q) => q.kind === "matching"), UNT_FORMAT.matching, randomInt),
    ...pickQuestions(pool.filter((q) => q.kind === "multiple"), UNT_FORMAT.multiple, randomInt),
  ];
}
