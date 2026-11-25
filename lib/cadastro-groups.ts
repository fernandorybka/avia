export const NO_GROUP_LABEL = "Sem nível";

export type GroupedItem = {
  id: string;
  name: string;
  groupName: string | null;
};

export type CadastroGroup<T extends GroupedItem> = {
  groupName: string | null; // null = cadastros without a parent level
  items: T[];
};

const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

export function compareNames(a: string, b: string): number {
  return collator.compare(a, b);
}

/** Trims the level name and turns blanks into null so "" and "  " mean "no level". */
export function normalizeGroupName(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

/**
 * Sorts level names: the ones in `order` first, in that order; the rest alphabetically after them.
 */
export function sortGroupNames(names: string[], order: string[] = []): string[] {
  const position = new Map(order.map((name, index) => [name, index]));
  return [...names].sort((a, b) => {
    const pa = position.get(a);
    const pb = position.get(b);
    if (pa !== undefined && pb !== undefined) return pa - pb;
    if (pa !== undefined) return -1;
    if (pb !== undefined) return 1;
    return compareNames(a, b);
  });
}

/**
 * Groups by level (custom `order` first, then alphabetically), cadastros alphabetically
 * inside each group, ungrouped ones last.
 */
export function groupCadastros<T extends GroupedItem>(items: T[], order: string[] = []): CadastroGroup<T>[] {
  const byGroup = new Map<string | null, T[]>();
  for (const item of items) {
    const key = normalizeGroupName(item.groupName);
    const list = byGroup.get(key);
    if (list) list.push(item);
    else byGroup.set(key, [item]);
  }

  const names = sortGroupNames(
    Array.from(byGroup.keys()).filter((name): name is string => name !== null),
    order
  );
  const sortedKeys: (string | null)[] = byGroup.has(null) ? [...names, null] : names;

  return sortedKeys.map((groupName) => ({
    groupName,
    items: [...byGroup.get(groupName)!].sort((a, b) => compareNames(a.name, b.name)),
  }));
}

/** Distinct level names, in the custom order then alphabetically, for pickers. */
export function listGroupNames(items: { groupName: string | null }[], order: string[] = []): string[] {
  const names = new Set<string>();
  for (const item of items) {
    const name = normalizeGroupName(item.groupName);
    if (name) names.add(name);
  }
  return sortGroupNames(Array.from(names), order);
}
