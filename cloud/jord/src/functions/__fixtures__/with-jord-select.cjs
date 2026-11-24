"use strict";

/** Calls the principal-bound client — parent enforces policies. */
module.exports = async function selectLab(_input, ctx) {
  return ctx.jord.from("records").select({ bucket: "lab", limit: 10 });
};
