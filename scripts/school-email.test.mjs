import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedSchoolEmail } from "../src/utils/domain.ts";

test("allows Barnard and Columbia school emails", () => {
  assert.equal(isAllowedSchoolEmail("cz2869@barnard.edu"), true);
  assert.equal(isAllowedSchoolEmail("Student@Columbia.EDU"), true);
  assert.equal(isAllowedSchoolEmail("dean@law.columbia.edu"), true);
  assert.equal(isAllowedSchoolEmail("  name@alumni.barnard.edu "), true);
});

test("rejects non-school emails", () => {
  assert.equal(isAllowedSchoolEmail("user@gmail.com"), false);
  assert.equal(isAllowedSchoolEmail("notcolumbia.edu@gmail.com"), false);
  assert.equal(isAllowedSchoolEmail("user@notcolumbia.edu"), false);
  assert.equal(isAllowedSchoolEmail("user@columbia.com"), false);
  assert.equal(isAllowedSchoolEmail(""), false);
  assert.equal(isAllowedSchoolEmail("no-at-sign"), false);
});
