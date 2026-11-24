"use strict";

/** Returns whether a secret env key is visible inside the worker. */
module.exports = function probe(input) {
  const key = input && typeof input.key === "string" ? input.key : "JORD_TEST_SECRET";
  return {
    has: Object.prototype.hasOwnProperty.call(process.env, key),
    value: process.env[key] ?? null,
    allowlisted: process.env.JORD_FUNC_ALLOW ?? null,
  };
};
