import assert from "node:assert/strict";
import test from "node:test";
import { activity, lessonComplete, monthCells, progress, remaining } from "./learning.js";
const course = { lessons: [{ tasks: [{ id: "a" }, { id: "b", type: "gate" }, { id: "c", optional: true }] }] };
test("optional tasks do not reduce progress", () => {
  const records = { "task:a": true, "task:b": true };
  assert.equal(progress(course, records).percent, 100);
  assert.equal(progress(course, records).passed, 1);
  assert.equal(lessonComplete(course.lessons[0], records), true);
});
test("calendar and sessions", () => {
  assert.equal(monthCells(2024, 1).filter(Boolean).length, 29);
  assert.equal(activity({ "session:1": { date: "2026-11-26", seconds: 1500 }, "session:2": { date: "2026-11-26", seconds: 60 } })["2026-11-26"], 1560);
});
test("timer uses absolute deadline", () => {
  assert.equal(remaining({ end: 5000, left: 20 }, 2500), 3);
  assert.equal(remaining({ end: 5000 }, 8000), 0);
});
