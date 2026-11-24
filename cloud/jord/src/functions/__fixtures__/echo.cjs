"use strict";

/** Happy-path user module: echoes JSON input. */
module.exports = function echo(input) {
  return { echoed: input ?? null, pid: process.pid };
};
