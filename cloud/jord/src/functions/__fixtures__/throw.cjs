"use strict";

module.exports = function fail() {
  throw new Error("deliberate handler crash");
};
