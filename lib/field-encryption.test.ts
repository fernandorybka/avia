import assert from "node:assert/strict";
import test from "node:test";

import { decryptFieldValue, encryptFieldValue, isEncryptedFieldValue } from "./field-encryption";

process.env.FIELD_VALUE_ENCRYPTION_KEY ??= "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";

test("encryptFieldValue/decryptFieldValue roundtrip", () => {
  const original = "CPF: 123.456.789-10";
  const encrypted = encryptFieldValue(original);

  assert.equal(isEncryptedFieldValue(encrypted), true);
  assert.notEqual(encrypted, original);
  assert.equal(decryptFieldValue(encrypted), original);
});

test("decryptFieldValue keeps legacy plaintext", () => {
  const legacy = "valor em texto puro";
  assert.equal(decryptFieldValue(legacy), legacy);
});

test("decryptFieldValue throws for invalid encrypted payload", () => {
  assert.throws(() => decryptFieldValue("enc:v1:invalid"));
});
