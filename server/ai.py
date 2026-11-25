import os
import shutil

import httpx


def configured():
    return {
        "auto": True,
        "openai": bool(os.getenv("OPENAI_API_KEY")),
        "glm": bool(os.getenv("ZAI_API_KEY")),
        "humanizer": os.getenv("WORKSPACE_ENABLE_HUMANIZER") == "1",
        "opencode": (
            os.getenv("WORKSPACE_ENABLE_OPENCODE") == "1"
            and bool(os.getenv("HUMANIZER_OPENCODE_MODEL"))
            and bool(shutil.which("opencode"))
        ),
    }


def generate(provider, messages):
    if provider == "auto":
        for candidate in ("glm", "openai", "humanizer", "opencode"):
            if configured()[candidate]:
                try:
                    return generate(candidate, messages)
                except Exception:
                    continue
        raise RuntimeError("No configured provider succeeded")
    if not configured().get(provider):
        raise RuntimeError("Provider not configured")
    if provider in {"humanizer", "opencode"}:
        if provider == "humanizer":
            from humanizer_framework.providers.default_chain import default_provider

            adapter = default_provider()
        else:
            from humanizer_framework.providers.cli import OpenCodeCLIProvider

            adapter = OpenCodeCLIProvider(model=os.environ["HUMANIZER_OPENCODE_MODEL"])
        return adapter.generate(messages, max_tokens=3000), provider
    if provider == "openai":
        url = "https://api.openai.com/v1/chat/completions"
        key = os.environ["OPENAI_API_KEY"]
        model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    else:
        url = "https://api.z.ai/api/paas/v4/chat/completions"
        key = os.environ["ZAI_API_KEY"]
        model = os.getenv("ZAI_MODEL", "glm-5.3-flash")
    with httpx.Client(timeout=90) as client:
        response = client.post(
            url,
            headers={"Authorization": f"Bearer {key}"},
            json={"model": model, "messages": messages},
        )
        response.raise_for_status()
        answer = response.json()["choices"][0]["message"]["content"]
    if not isinstance(answer, str) or not answer.strip():
        raise RuntimeError("Empty answer")
    return answer, provider
