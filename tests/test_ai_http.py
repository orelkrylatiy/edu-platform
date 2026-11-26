import httpx
import pytest

from server import ai


@pytest.mark.parametrize(
    "provider,key_name,expected",
    [
        ("openai", "OPENAI_API_KEY", "https://api.openai.com/v1/chat/completions"),
        ("glm", "ZAI_API_KEY", "https://api.z.ai/api/paas/v4/chat/completions"),
    ],
)
def test_direct_providers_mocked_http(monkeypatch, provider, key_name, expected):
    monkeypatch.setenv(key_name, "safe-test-key")
    response = []

    def handler(request):
        response.append(request)
        assert str(request.url) == expected
        assert request.headers["Authorization"] == "Bearer safe-test-key"
        assert b"\"messages\"" in request.content
        return httpx.Response(200, json={"choices": [{"message": {"content": "Feedback"}}]})

    client_class = httpx.Client
    monkeypatch.setattr(
        ai.httpx, "Client",
        lambda **options: client_class(transport=httpx.MockTransport(handler), **options),
    )
    answer, selected = ai.generate(provider, [{"role": "user", "content": "Hello"}])
    assert answer == "Feedback"
    assert selected == provider
    assert len(response) == 1


def test_provider_http_error_does_not_store_credentials(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "safe-test-key")

    def handler(request):
        return httpx.Response(429, json={"error": "too many requests"})

    client_class = httpx.Client
    monkeypatch.setattr(
        ai.httpx, "Client",
        lambda **options: client_class(transport=httpx.MockTransport(handler), **options),
    )
    with pytest.raises(httpx.HTTPStatusError):
        ai.generate("openai", [{"role": "user", "content": "Hello"}])
