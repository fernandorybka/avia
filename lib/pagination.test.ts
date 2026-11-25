import assert from "node:assert/strict";
import test from "node:test";

import { pageWindow, paginate, parseListParam, parsePageParam } from "./pagination";

const numbers = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

test("paginate slices pages of the given size", () => {
  const result = paginate(numbers(20), 2, 9);
  assert.deepEqual(result.items, [10, 11, 12, 13, 14, 15, 16, 17, 18]);
  assert.equal(result.totalPages, 3);
  assert.equal(result.totalItems, 20);
});

test("paginate clamps pages past the end to the last page", () => {
  const result = paginate(numbers(10), 5, 9);
  assert.equal(result.page, 2);
  assert.deepEqual(result.items, [10]);
});

test("paginate keeps one empty page when there are no items", () => {
  assert.deepEqual(paginate([], 3, 9), { items: [], page: 1, totalPages: 1, totalItems: 0 });
});

test("parsePageParam falls back to 1 for invalid values", () => {
  assert.equal(parsePageParam("3"), 3);
  assert.equal(parsePageParam(["2", "5"]), 2);
  assert.equal(parsePageParam("0"), 1);
  assert.equal(parsePageParam("abc"), 1);
  assert.equal(parsePageParam(undefined), 1);
});

test("parseListParam accepts single or repeated values", () => {
  assert.deepEqual(parseListParam("a"), ["a"]);
  assert.deepEqual(parseListParam(["a", " b ", "a", ""]), ["a", "b"]);
  assert.deepEqual(parseListParam(undefined), []);
});

test("pageWindow collapses distant pages", () => {
  assert.deepEqual(pageWindow(1, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(pageWindow(6, 12), [1, null, 5, 6, 7, null, 12]);
  assert.deepEqual(pageWindow(1, 12), [1, 2, null, 12]);
  assert.deepEqual(pageWindow(3, 12), [1, 2, 3, 4, null, 12]);
});
