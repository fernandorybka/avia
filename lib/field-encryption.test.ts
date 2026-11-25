import assert from "node:assert/strict";
import test from "node:test";

import {
  decryptBuffer,
  decryptFieldValue,
  encryptBuffer,
  encryptFieldValue,
  isEncryptedFieldValue,
} from "./field-encryption";

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

test("encryptBuffer/decryptBuffer roundtrip", () => {
  const original = Buffer.from("PK\x03\x04 planilha de orçamento");
  const encrypted = encryptBuffer(original);

  assert.equal(encrypted.subarray(0, 9).toString(), "AVIA-ENC1");
  assert.equal(encrypted.includes(original), false);
  assert.deepEqual(decryptBuffer(encrypted), original);
});

test("decryptBuffer rejects tampered content", () => {
  const encrypted = encryptBuffer(Buffer.from("conteúdo"));
  encrypted[encrypted.length - 1] ^= 0xff;
  assert.throws(() => decryptBuffer(encrypted), /Failed to decrypt file/);
});

test("decryptBuffer rejects data without the header", () => {
  assert.throws(() => decryptBuffer(Buffer.from("PK\x03\x04 qualquer coisa que não foi cifrada")), /Invalid encrypted file/);
});

test("file key is not the field key", () => {
  // A field ciphertext's raw bytes must not decrypt as a file (different subkey)
  const field = encryptFieldValue("segredo");
  const raw = Buffer.from(field.slice("enc:v1:".length), "base64url");
  assert.throws(() => decryptBuffer(Buffer.concat([Buffer.from("AVIA-ENC1"), raw])));
});
