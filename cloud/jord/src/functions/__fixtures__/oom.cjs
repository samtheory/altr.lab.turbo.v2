"use strict";

/**
 * Allocate until the worker heap cap trips.
 * Parent sets a small maxOldGenerationSizeMb in tests.
 */
module.exports = function boom() {
  const chunks = [];
  // Keep growing until V8 OOM / resourceLimits kill the isolate.
  for (;;) {
    chunks.push(Buffer.alloc(4 * 1024 * 1024, 0x61));
  }
};
