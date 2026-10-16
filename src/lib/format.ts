/** Ондық бөлшекті үтірмен жазу (қазақ және орыс тілдерінде солай): 18.015 → "18,02" */
export function formatDecimal(value: number, digits = 2): string {
  return value.toFixed(digits).replace(".", ",");
}
