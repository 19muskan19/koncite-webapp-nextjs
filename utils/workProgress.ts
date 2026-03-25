/**
 * Work progress balance qty:
 * - If estimate qty is 0 → balance is 0 (no work was estimated, so nothing remains “in balance”).
 * - Otherwise → estimate qty minus completed qty till date.
 */
export function computeWorkProgressBalanceQty(estimateQty: number, completedQty: number): number {
  const est = Number.isFinite(estimateQty) ? estimateQty : 0;
  const done = Number.isFinite(completedQty) ? completedQty : 0;
  if (est === 0) return 0;
  return est - done;
}
