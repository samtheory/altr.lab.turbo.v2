import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defaultAuthEmailTemplates,
  escapeHtml,
  insertTemplateVariable,
  renderAuthEmail,
  sampleEmailVariables,
  templateVariableNames,
  validateAuthEmailSender,
  validateAuthEmailTemplate,
} from "./studio-auth-email.js";

describe("studio auth email S0072", () => {
  it("renders defaults with sample values", () => {
    const rendered = renderAuthEmail(defaultAuthEmailTemplates().confirm, {
      ...sampleEmailVariables(),
      email: "ada@lab.test",
    });
    assert.equal(rendered.subject, "Confirm your Jord account");
    assert.match(rendered.text, /^Confirm your account for Jord \(ada@lab\.test\)\./);
    assert.match(rendered.text, /confirm:sample-token/);
    assert.match(rendered.html ?? "", /href="https:\/\/app\.example\.com/);
  });

  it("escapes variables in HTML but not in text", () => {
    const rendered = renderAuthEmail(
      {
        subject: "Hi {{email}}",
        text: "raw {{email}}",
        html: "<p>{{email}}</p>",
      },
      { email: '<script>alert("x")</script>@lab.test' },
    );
    assert.equal(rendered.text, 'raw <script>alert("x")</script>@lab.test');
    assert.equal(
      rendered.html,
      "<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;@lab.test</p>",
    );
    assert.equal(escapeHtml("<&>"), "&lt;&amp;&gt;");
  });

  it("collects variables and refuses unknown ones", () => {
    const template = {
      subject: "{{email}}",
      text: "{{token}} {{nope}}",
      html: null,
    };
    assert.deepEqual(templateVariableNames(template).sort(), [
      "email",
      "nope",
      "token",
    ]);
    const errors = validateAuthEmailTemplate(template, "Confirm");
    assert.equal(errors.length, 1);
    assert.match(errors[0] ?? "", /unknown variable \{\{nope\}\}/);
  });

  it("requires subject and body", () => {
    const errors = validateAuthEmailTemplate(
      { subject: " ", text: "", html: null },
      "Invite",
    );
    assert.equal(errors.length, 2);
  });

  it("validates sender identity", () => {
    assert.deepEqual(
      validateAuthEmailSender({
        from_name: "Jord",
        from_address: "no-reply@lab.test",
        reply_to: null,
      }),
      [],
    );
    assert.equal(
      validateAuthEmailSender({
        from_name: "",
        from_address: "nope",
        reply_to: "also-nope",
      }).length,
      3,
    );
  });

  it("inserts variable chips with spacing", () => {
    assert.equal(insertTemplateVariable("Hello", "email"), "Hello {{email}}");
    assert.equal(insertTemplateVariable("Hello ", "email"), "Hello {{email}}");
    assert.equal(insertTemplateVariable("", "token"), "{{token}}");
  });
});
