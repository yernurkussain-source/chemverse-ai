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
