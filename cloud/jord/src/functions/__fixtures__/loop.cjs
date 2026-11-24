"use strict";

/** Busy-loops forever — parent must terminate() at the deadline. */
module.exports = function loop() {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // burn CPU; do not await
  }
};
