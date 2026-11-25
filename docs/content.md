# Content contract

Course JSON in content/courses is public-safe. Each course has id, title, description, skills (array of strings), lessons (ordered array). Lessons have stable id, title, module, minutes, body (Markdown), tasks (id, text, optional, type). Never change existing identifiers when editing copy. Optional tasks do not affect completion. Private additions can be mounted in content/private, gitignored. Replace or add lessons by editing files and redeploy; no runtime writes to course sources. Use unique IDs. Do not export private vault material to this public repository.

The sample System Analyst track is an original scaffold; it is not a verbatim copy of the private Wiki. Expand it after review. AI sees only the selected course/lesson/task and relevant saved answer, notes, history; planner sees bounded progress. It does not have repository access. The frontend course is a small scaffold.
