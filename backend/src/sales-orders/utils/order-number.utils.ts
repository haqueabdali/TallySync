export function generateOrderNumber(sequence: number): string {
  const year = new Date().getFullYear();

  return `SO-${year}-${sequence.toString().padStart(6, '0')}`;
}
