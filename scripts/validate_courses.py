"""Validate the checked-in course packs before deployment."""
from server.content import load_courses

if __name__ == "__main__":
    for course in load_courses():
        practice = course.get("practice", [])
        print(
            course["id"], len(course["lessons"]), "lessons",
            len(practice), "practice sections",
            sum(len(x["tasks"]) for x in course["lessons"]), "roadmap tasks",
        )
