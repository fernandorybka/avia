import assert from "node:assert/strict";
import test from "node:test";

import { groupCadastros, listGroupNames, normalizeGroupName, sortGroupNames } from "./cadastro-groups";

const item = (name: string, groupName: string | null) => ({ id: name, name, groupName });

test("groupCadastros sorts groups and items alphabetically, ungrouped last", () => {
  const groups = groupCadastros([
    item("Zé", "Teatro Miçanga"),
    item("ana", null),
    item("Bruno", "Quando um lugar termina não desaparecer"),
    item("Álvaro", "Teatro Miçanga"),
    item("Carla", ""),
    item("beatriz", "Teatro Miçanga"),
  ]);

  assert.deepEqual(
    groups.map((group) => [group.groupName, group.items.map((i) => i.name)]),
    [
      ["Quando um lugar termina não desaparecer", ["Bruno"]],
      ["Teatro Miçanga", ["Álvaro", "beatriz", "Zé"]],
      [null, ["ana", "Carla"]],
    ]
  );
});

test("groupCadastros merges levels that differ only by surrounding spaces", () => {
  const groups = groupCadastros([item("A", "Teatro "), item("B", " Teatro")]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].groupName, "Teatro");
});

test("listGroupNames returns distinct names sorted, without blanks", () => {
  assert.deepEqual(
    listGroupNames([{ groupName: "b" }, { groupName: null }, { groupName: "A" }, { groupName: "b" }, { groupName: " " }]),
    ["A", "b"]
  );
});

test("normalizeGroupName turns blanks into null", () => {
  assert.equal(normalizeGroupName("  "), null);
  assert.equal(normalizeGroupName(undefined), null);
  assert.equal(normalizeGroupName(" X "), "X");
});

test("groupCadastros puts levels from the custom order first, the rest alphabetically", () => {
  const groups = groupCadastros(
    [item("A", "Banda"), item("B", "Teatro Miçanga"), item("C", null), item("D", "Arena"), item("E", "Quando")],
    ["Teatro Miçanga", "Quando", "Removido"]
  );
  assert.deepEqual(groups.map((group) => group.groupName), ["Teatro Miçanga", "Quando", "Arena", "Banda", null]);
});

test("sortGroupNames ignores order entries that are not in the list", () => {
  assert.deepEqual(sortGroupNames(["b", "a"], ["x", "b"]), ["b", "a"]);
});
