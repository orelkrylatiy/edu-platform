import os
from importlib.util import find_spec
import shutil

import httpx


def configured():
    installed = find_spec("humanizer_framework") is not None
    return {
        "auto": True,
        "openai": bool(os.getenv("OPENAI_API_KEY")),
        "glm": bool(os.getenv("ZAI_API_KEY")),
        "humanizer": installed and os.getenv("WORKSPACE_ENABLE_HUMANIZER") == "1",
        "opencode": (
            installed and os.getenv("WORKSPACE_ENABLE_OPENCODE") == "1"
            and bool(os.getenv("HUMANIZER_OPENCODE_MODEL"))
            and bool(shutil.which("opencode"))
        ),
    }


def generate(provider, messages):
    if provider == "auto":
        for candidate in ("humanizer", "glm", "openai", "opencode"):
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
            from humanizer_framework.providers.harness import HarnessProvider
            from humanizer_framework.providers.zai_http import ZaiAnthropicProvider
            from humanizer_framework.providers.cli import OpenCodeCLIProvider

            candidates = []
            if os.getenv("ZAI_API_KEY"):
                candidates.append(ZaiAnthropicProvider(model=os.getenv("ZAI_MODEL", "glm-5.3-flash"), api_key_env=("ZAI_API_KEY",)))
            if configured()["opencode"]:
                candidates.append(OpenCodeCLIProvider(model=os.environ["HUMANIZER_OPENCODE_MODEL"]))
            if os.getenv("OPENAI_API_KEY"):
                candidates.append(DirectOpenAIProvider())
            if not candidates:
                raise RuntimeError("Humanizer has no enabled provider")
            adapter = HarnessProvider(candidates)
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
            json={"model": model, "messages": messages, "max_tokens": 3000},
        )
        response.raise_for_status()
        answer = response.json()["choices"][0]["message"]["content"]
    if not isinstance(answer, str) or not answer.strip():
        raise RuntimeError("Empty answer")
    return answer, provider


class DirectOpenAIProvider:
    """Humanizer-compatible adapter which does not launch OpenCode."""

    name = "openai-http"

    def generate(self, messages, *, temperature=0.4, max_tokens=3000):
        del temperature, max_tokens
        return generate("openai", messages)[0]
