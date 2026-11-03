import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ageSeconds,
  describePartial,
  errorRateStatus,
  formatAge,
  formatBytes,
  formatCount,
  formatPercent,
  parseStatsWindow,
  summarizeSeries,
  toChartData,
} from "./studio-dashboard.js";

describe("studio dashboard S0096", () => {
  it("parses the window with a 1h fallback", () => {
    assert.equal(parseStatsWindow("24h"), "24h");
    assert.equal(parseStatsWindow("7d"), "7d");
    assert.equal(parseStatsWindow("30d"), "1h");
    assert.equal(parseStatsWindow(undefined), "1h");
    assert.equal(parseStatsWindow(["7d", "24h"]), "7d");
  });

  it("formats numbers", () => {
    assert.equal(formatCount(999), "999");
    assert.equal(formatCount(1500), "1.5k");
    assert.equal(formatCount(25_000), "25k");
    assert.equal(formatCount(2_000_000), "2M");
    assert.equal(formatBytes(0), "0 B");
    assert.equal(formatBytes(1536), "1.5 KB");
    assert.equal(formatPercent(0), "0%");
    assert.equal(formatPercent(0.0234), "2.3%");
    assert.equal(formatPercent(0.5), "50%");
    assert.equal(formatAge(ageSeconds(1000, 31_000)), "30s ago");
    assert.equal(formatAge(125), "2m ago");
  });

  it("maps the series and summarises it", () => {
    const series = [
      { t: 1, total: 4, errors: 1 },
      { t: 2, total: 10, errors: 0 },
    ];
    assert.deepEqual(toChartData(series), series);
    assert.match(summarizeSeries(series, "hour"), /14 requests and 1 errors.*busiest bucket had 10/);
    assert.match(summarizeSeries([], "hour"), /No requests/);
  });

  it("derives error-rate status and partial text", () => {
    assert.equal(errorRateStatus(0, 0), "neutral");
    assert.equal(errorRateStatus(0.001, 100), "ok");
    assert.equal(errorRateStatus(0.02, 100), "warn");
    assert.equal(errorRateStatus(0.2, 100), "bad");
    assert.equal(describePartial(["db", "mystery"]), "database report, mystery");
  });
});
