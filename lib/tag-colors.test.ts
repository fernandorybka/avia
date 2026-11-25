import assert from "node:assert/strict";
import test from "node:test";

import { isValidTagColor, readableTextColor, tagBadgeStyle } from "./tag-colors";

test("isValidTagColor accepts only #rrggbb", () => {
  assert.equal(isValidTagColor("#3b82f6"), true);
  assert.equal(isValidTagColor("#FFF"), false);
  assert.equal(isValidTagColor("red"), false);
  assert.equal(isValidTagColor("#3b82f6; background: url(x)"), false);
  assert.equal(isValidTagColor(null), false);
});

test("readableTextColor picks black on light colors and white on dark ones", () => {
  assert.equal(readableTextColor("#eab308"), "#000000");
  assert.equal(readableTextColor("#1e3a8a"), "#ffffff");
});

test("tagBadgeStyle returns nothing for tags without color", () => {
  assert.equal(tagBadgeStyle(undefined, "solid"), undefined);
});
