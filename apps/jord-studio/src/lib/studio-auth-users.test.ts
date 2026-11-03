import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AUTH_USERS_PAGE_SIZE,
  authUserStatus,
  filterAuthUsers,
  paginateAuthUsers,
  parseMetadataJson,
  type AuthAdminUser,
} from "./studio-auth-users.js";

function user(overrides: Partial<AuthAdminUser>): AuthAdminUser {
  return {
    id: "u1",
    email: "ada@lab.test",
    emailConfirmed: true,
    disabledAt: null,
    banReason: null,
    userMetadata: {},
    appMetadata: {},
    lastSignInAt: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("studio auth users S0070", () => {
  it("classifies banned before unconfirmed", () => {
    assert.equal(authUserStatus(user({})), "active");
    assert.equal(
      authUserStatus(user({ emailConfirmed: false })),
      "unconfirmed",
    );
    assert.equal(
      authUserStatus(user({ disabledAt: 10, emailConfirmed: false })),
      "banned",
    );
  });

  it("filters by email or id", () => {
    const users = [
      user({ id: "abc-1", email: "ada@lab.test" }),
      user({ id: "def-2", email: "grace@lab.test" }),
    ];
    assert.equal(filterAuthUsers(users, "grace").length, 1);
    assert.equal(filterAuthUsers(users, "ABC").length, 1);
    assert.equal(filterAuthUsers(users, "").length, 2);
  });

  it("paginates and clamps out-of-range pages", () => {
    const users = Array.from({ length: AUTH_USERS_PAGE_SIZE + 3 }, (_, i) =>
      user({ id: `u${i}`, email: `u${i}@lab.test` }),
    );
    const first = paginateAuthUsers(users, 1);
    assert.equal(first.items.length, AUTH_USERS_PAGE_SIZE);
    assert.equal(first.pages, 2);
    const second = paginateAuthUsers(users, 2);
    assert.equal(second.items.length, 3);
    assert.equal(paginateAuthUsers(users, 99).page, 2);
    assert.equal(paginateAuthUsers(users, -4).page, 1);
  });

  it("accepts objects only for metadata", () => {
    assert.deepEqual(parseMetadataJson('{"plan":"pro"}'), {
      ok: true,
      value: { plan: "pro" },
    });
    assert.deepEqual(parseMetadataJson("  "), { ok: true, value: {} });
    assert.equal(parseMetadataJson("[1,2]").ok, false);
    assert.equal(parseMetadataJson("42").ok, false);
    assert.equal(parseMetadataJson("{oops}").ok, false);
  });
});
