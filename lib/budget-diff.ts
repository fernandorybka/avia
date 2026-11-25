import { normalizeKey } from "./budget-mapping";
import type { BudgetItemStatus } from "./projects";

/** Matching between the current budget items and a newly uploaded spreadsheet version (remanejamento). */

export type CurrentBudgetItem = {
  id: string;
  code: string | null;
  name: string;
  plannedCents: number;
  paidCents: number;
  paymentCount: number;
  status: BudgetItemStatus;
};

export type IncomingBudgetItem = {
  code: string | null;
  name: string;
  plannedCents: number;
};

/** incoming index → current item id, chosen by hand (e.g. a renamed item without an identifier) */
export type ManualLinks = Record<number, string>;

/**
 * Links are chosen per spreadsheet row; matching works on positions in the list of
 * included rows, which shift when rows are unticked.
 */
export function linksByRowToIndexes(items: { rowNumber: number }[], linksByRow: Record<number, string>): ManualLinks {
  const links: ManualLinks = {};
  items.forEach((item, index) => {
    const id = linksByRow[item.rowNumber];
    if (typeof id === "string") links[index] = id;
  });
  return links;
}

export type MatchedItem = {
  incomingIndex: number;
  current: CurrentBudgetItem;
  changed: boolean;
  /** new planned value is below what's already been paid */
  overspent: boolean;
};

export type BudgetDiff = {
  matched: MatchedItem[];
  added: number[]; // incoming indexes
  removedEmpty: CurrentBudgetItem[];
  removedWithPayments: CurrentBudgetItem[];
};

export function matchBudgetItems(
  current: CurrentBudgetItem[],
  incoming: IncomingBudgetItem[],
  options: { matchByCode: boolean; manualLinks?: ManualLinks }
): BudgetDiff {
  const candidates = current.filter((item) => item.status !== "removed");
  const available = new Map(candidates.map((item) => [item.id, item]));
  const matchedByIndex = new Map<number, CurrentBudgetItem>();

  const take = (index: number, item: CurrentBudgetItem | undefined) => {
    if (!item || !available.has(item.id) || matchedByIndex.has(index)) return;
    available.delete(item.id);
    matchedByIndex.set(index, item);
  };

  for (const [index, id] of Object.entries(options.manualLinks ?? {})) {
    const position = Number(index);
    if (Number.isInteger(position) && position >= 0 && position < incoming.length) {
      take(position, available.get(id));
    }
  }

  const keyOf = (item: { code: string | null; name: string }) =>
    options.matchByCode && item.code ? `code:${normalizeKey(item.code)}` : `name:${normalizeKey(item.name)}`;

  incoming.forEach((item, index) => {
    if (matchedByIndex.has(index)) return;
    const key = keyOf(item);
    take(index, [...available.values()].find((candidate) => keyOf(candidate) === key));
  });

  const matched: MatchedItem[] = [];
  const added: number[] = [];
  incoming.forEach((item, index) => {
    const currentItem = matchedByIndex.get(index);
    if (!currentItem) {
      added.push(index);
      return;
    }
    matched.push({
      incomingIndex: index,
      current: currentItem,
      changed:
        currentItem.plannedCents !== item.plannedCents ||
        currentItem.name !== item.name ||
        (currentItem.code ?? null) !== (item.code ?? null) ||
        currentItem.status !== "active",
      overspent: item.plannedCents < currentItem.paidCents,
    });
  });

  const leftovers = [...available.values()];
  return {
    matched,
    added,
    // Items already out of budget with no new match stay as they are, so they're not "removed" again
    removedEmpty: leftovers.filter((item) => item.paymentCount === 0),
    removedWithPayments: leftovers.filter((item) => item.paymentCount > 0 && item.status === "active"),
  };
}
