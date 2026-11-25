export function dateKey(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
export function progress(course, records) {
  const tasks = course.lessons.flatMap((lesson) => lesson.tasks.filter((task) => !task.optional));
  const done = tasks.filter((task) => records["task:" + task.id] === true).length;
  const gates = tasks.filter((task) => task.type === "gate");
  return { total: tasks.length, done, percent: tasks.length ? Math.round(done / tasks.length * 100) : 0, gates: gates.length, passed: gates.filter((task) => records["task:" + task.id] === true).length };
}
export function lessonComplete(lesson, records) {
  const required = lesson.tasks.filter((task) => !task.optional);
  return required.length > 0 && required.every((task) => records["task:" + task.id] === true);
}
export function activity(records) {
  const days = {};
  Object.entries(records).forEach(([key, value]) => {
    if (key.startsWith("session:") && value && Number.isFinite(value.seconds)) {
      days[value.date] = (days[value.date] || 0) + value.seconds;
    }
  });
  return days;
}
export function monthCells(year, month) {
  const first = new Date(year, month, 1);
  const padding = (first.getDay() + 6) % 7;
  return [...Array(padding).fill(null), ...Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => new Date(year, month, i + 1))];
}
export function remaining(timer, now = Date.now()) {
  return timer.end ? Math.max(0, Math.ceil((timer.end - now) / 1000)) : timer.left;
}
