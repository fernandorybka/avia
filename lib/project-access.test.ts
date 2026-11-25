import assert from "node:assert/strict";
import test from "node:test";

import { canAccessProject, isProjectManager, parseEmailList } from "./project-access";

test("parseEmailList trims, lowercases and drops empties", () => {
  assert.deepEqual([...parseEmailList(" Ana@x.com, ,bia@y.com ")], ["ana@x.com", "bia@y.com"]);
  assert.equal(parseEmailList(undefined).size, 0);
});

test("isProjectManager matches any verified e-mail, case-insensitive", () => {
  const list = parseEmailList("ana@x.com");
  assert.equal(isProjectManager(["outro@x.com", "ANA@x.com"], list), true);
  assert.equal(isProjectManager(["bia@y.com"], list), false);
  assert.equal(isProjectManager([], list), false);
});

test("canAccessProject requires manager and ownership", () => {
  assert.equal(canAccessProject({ userId: "u1", isManager: true, projectOwnerUserId: "u1" }), true);
  assert.equal(canAccessProject({ userId: "u1", isManager: true, projectOwnerUserId: "u2" }), false);
  assert.equal(canAccessProject({ userId: "u1", isManager: false, projectOwnerUserId: "u1" }), false);
  assert.equal(canAccessProject({ userId: null, isManager: true, projectOwnerUserId: "u1" }), false);
  assert.equal(canAccessProject({ userId: "u1", isManager: true, projectOwnerUserId: null }), false);
});
