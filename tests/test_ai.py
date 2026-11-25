from server import ai


def test_auto_prefers_humanizer(monkeypatch):
    original = ai.generate
    called = []
    monkeypatch.setattr(ai, "configured", lambda: {
        "humanizer": True, "glm": True, "openai": True, "opencode": False
    })

    def fake(provider, messages):
        called.append(provider)
        if provider == "humanizer":
            raise RuntimeError("unavailable")
        return "answer", provider

    monkeypatch.setattr(ai, "generate", fake)
    assert original("auto", []) == ("answer", "glm")
    assert called == ["humanizer", "glm"]


def test_direct_adapter_does_not_launch_cli(monkeypatch):
    monkeypatch.setattr(ai, "generate", lambda provider, messages: ("response", provider))
    assert ai.DirectOpenAIProvider().generate([]) == "response"
