"use strict";

module.exports = async function noisy(input, _ctx) {
  console.log("start invoke");
  console.info("payload", input ?? null);
  console.warn("JORD_TEST_SECRET=super-secret-value");
  console.log("Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb");
  return { ok: true };
};
