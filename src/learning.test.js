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

import { getWeekDays, weekTotal, studyStreak } from "./learning.js";
test("week starts on Monday even across month", () => {
  const dates = getWeekDays(new Date(2026,10,1));
  assert.equal(dates[0].getDay(), 1);
  assert.equal(dates[0].getDate(), 26);
  assert.equal(dates[6].getDate(), 1);
});
test("weekly seconds use active week only", () => {
  const entries = {"2026-10-26":1500, "2026-11-01":3000, "2026-11-02":100};
  assert.equal(weekTotal(entries,new Date(2026,10,1)),4500);
});
test("streak allows today to be unfinished", () => {
  assert.equal(studyStreak({"2026-11-24":100,"2026-11-25":100},new Date(2026,10,26)),2);
  assert.equal(studyStreak({},new Date(2026,10,26)),0);
});

import { advanceCalendar } from "./learning.js";
test("month navigation never skips February after January 31", () => {
  const next = advanceCalendar(new Date(2027,0,31),true,1);
  assert.equal(next.getFullYear(),2027);
  assert.equal(next.getMonth(),1);
  assert.equal(next.getDate(),1);
});
