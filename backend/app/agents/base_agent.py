import json
import logging
import re
import time
from typing import Any, Callable, Optional, Type, TypeVar

from openai import OpenAI
from pydantic import BaseModel, ValidationError

from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

REQUEST_TIMEOUT_SECONDS = 90
MAX_STRUCTURED_ATTEMPTS = 2

LANGUAGE_INSTRUCTION = (
    "All user-facing content must be written in Simplified Chinese, including summaries, "
    "headings, questions, answer options, explanations, descriptions, checklists, advice, "
    "and activity text. Preserve project names, agent names, programming terms, code, "
    "resource names, and user-provided topic names in their original language. "
    "Do not translate JSON field names or schema keys."
)

JSON_SCHEMA_INSTRUCTION = (
    "You must reply with a single JSON object that strictly matches the JSON Schema below. "
    "Do not wrap the JSON in markdown code fences and do not add any text outside the JSON. "
    "Every field listed in the schema is required. JSON Schema:\n"
)

REPAIR_INSTRUCTION = (
    "The previous JSON output was rejected because it did not match the required schema. "
    "Error: {error}. Return only the corrected JSON object that satisfies the schema."
)

DEFAULT_FOLLOW_UP_QUESTIONS = [
    "可以更详细地解释这个主题吗？",
    "如何把这些知识应用到真实项目中？",
    "你推荐哪些学习资源？",
]

MISSING_KEY_MESSAGE = (
    "尚未配置 AI API 密钥。请打开「设置」页面填写国内大模型 API 密钥"
    "（DeepSeek、通义千问、智谱 GLM、Kimi、硅基流动等），"
    "或在后端 .env 中设置 AI_API_KEY。"
)


class AIConfigurationError(RuntimeError):
    """Raised when the AI provider is not configured (for example, no API key)."""


class AIProviderError(RuntimeError):
    """Raised when the upstream model provider fails to return usable content."""


def extract_json_object(raw: str) -> dict[str, Any]:
    """Parse a JSON object out of a model reply, tolerating markdown code fences."""
    if not raw or not raw.strip():
        raise ValueError("模型返回了空内容")

    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()

    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end < start:
        raise ValueError(f"模型返回的内容中找不到 JSON 对象：{text[:200]}")

    data = json.loads(text[start : end + 1])
    if not isinstance(data, dict):
        raise ValueError("模型返回的 JSON 顶层必须是对象")
    return data


class BaseAgent:
    """Shared agent logic for OpenAI-compatible domestic LLM providers."""

    def __init__(
        self,
        api_key: str = "",
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        allow_fallback: Optional[bool] = None,
        request_timeout: int = REQUEST_TIMEOUT_SECONDS,
    ):
        self.api_key = (api_key or settings.AI_API_KEY or "").strip()
        self.base_url = (base_url or settings.AI_BASE_URL or "").strip().rstrip("/")
        self.model = (model or settings.AI_MODEL or "").strip()
        self.request_timeout = request_timeout
        self.allow_fallback = (
            settings.ALLOW_DEMO_FALLBACK if allow_fallback is None else allow_fallback
        )
        self.client: Optional[OpenAI] = None
        self.is_client_active = False

        if not self.api_key:
            logger.warning("No AI API key provided. Agents will ask the user to configure one.")
            return

        if not self.base_url.startswith(("http://", "https://")):
            raise AIConfigurationError(
                f"AI 接口地址无效：{self.base_url!r}，必须以 http:// 或 https:// 开头。"
            )

        try:
            self.client = OpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
                timeout=self.request_timeout,
                max_retries=1,
            )
            self.is_client_active = True
            logger.info("AI client configured: base_url=%s model=%s", self.base_url, self.model)
        except Exception as exc:  # pragma: no cover - depends on SDK internals
            logger.error("Failed to configure AI client: %s", exc)

    # ------------------------------------------------------------------
    # Public API used by the concrete agents
    # ------------------------------------------------------------------
    def generate_structured_output(
        self,
        prompt: str,
        system_instruction: str,
        response_schema: Type[T],
        fallback_func: Callable[[], T],
    ) -> T:
        """Ask the model for JSON that validates against ``response_schema``."""
        if not self.is_client_active or not self.client:
            return self._handle_unavailable(fallback_func)

        schema_text = json.dumps(response_schema.model_json_schema(), ensure_ascii=False)
        messages: list[dict[str, str]] = [
            {
                "role": "system",
                "content": (
                    f"{system_instruction}\n\n{LANGUAGE_INSTRUCTION}\n\n"
                    f"{JSON_SCHEMA_INSTRUCTION}{schema_text}"
                ),
            },
            {"role": "user", "content": prompt},
        ]

        last_error: Optional[Exception] = None
        try:
            for attempt in range(MAX_STRUCTURED_ATTEMPTS):
                content = self._complete(messages, temperature=0.2 if attempt == 0 else 0.0)
                try:
                    return response_schema.model_validate(extract_json_object(content))
                except (ValueError, ValidationError) as exc:
                    last_error = exc
                    logger.warning(
                        "Structured output attempt %d/%d rejected: %s",
                        attempt + 1,
                        MAX_STRUCTURED_ATTEMPTS,
                        exc,
                    )
                    if attempt == 0:
                        messages = messages[:2] + [
                            {"role": "assistant", "content": content},
                            {
                                "role": "user",
                                "content": REPAIR_INSTRUCTION.format(error=exc),
                            },
                        ]
            raise AIProviderError(f"模型返回的内容无法解析为预期结构：{last_error}")
        except Exception as exc:
            error = exc if isinstance(exc, AIProviderError) else AIProviderError(
                f"{self.model} 调用失败：{exc}"
            )
            if self.allow_fallback:
                logger.warning("%s 已启用演示数据回退。", error)
                return fallback_func()
            raise error from exc

    def generate_chat_reply(
        self,
        history: list,
        user_message: str,
        system_instruction: str,
        fallback_func: Callable[[], tuple[str, list[str]]],
    ) -> tuple[str, list[str]]:
        """Run a multi-turn chat completion and suggest follow-up questions."""
        if not self.is_client_active or not self.client:
            return self._handle_unavailable(fallback_func)

        messages: list[dict[str, str]] = [
            {"role": "system", "content": f"{system_instruction}\n\n{LANGUAGE_INSTRUCTION}"}
        ]
        for msg in history:
            role = "user" if msg.role == "user" else "assistant"
            messages.append({"role": role, "content": msg.content})
        messages.append({"role": "user", "content": user_message})

        try:
            reply = self._complete(messages, temperature=0.7)
        except Exception as exc:
            error = AIProviderError(f"{self.model} 调用失败：{exc}")
            if self.allow_fallback:
                logger.warning("%s 已启用演示数据回退。", error)
                return fallback_func()
            raise error from exc

        return reply, self._suggest_follow_ups(user_message, reply)

    def test_connection(self) -> dict[str, Any]:
        """Verify the provider configuration with a minimal, cheap request."""
        if not self.is_client_active or not self.client:
            raise AIConfigurationError(MISSING_KEY_MESSAGE)

        started = time.monotonic()
        try:
            reply = self._complete(
                [{"role": "user", "content": "请只回复：连接成功"}],
                temperature=0.0,
                json_mode=False,
                max_tokens=16,
            )
        except Exception as exc:
            raise AIProviderError(f"{self.model} 连接失败：{exc}") from exc

        return {
            "ok": True,
            "model": self.model,
            "baseUrl": self.base_url,
            "latencyMs": int((time.monotonic() - started) * 1000),
            "reply": reply.strip()[:100],
        }

    # ------------------------------------------------------------------
    # Provider helpers
    # ------------------------------------------------------------------
    def _complete(
        self,
        messages: list[dict[str, str]],
        temperature: float,
        json_mode: bool = True,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Call the chat completions endpoint and return the assistant text."""
        assert self.client is not None
        kwargs: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "stream": False,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens

        try:
            response = self.client.chat.completions.create(**kwargs)
        except Exception as exc:
            if json_mode and self._supports_json_mode_error(exc):
                logger.warning("Provider rejected JSON mode, retrying without response_format: %s", exc)
                kwargs.pop("response_format", None)
                response = self.client.chat.completions.create(**kwargs)
            else:
                raise

        content = response.choices[0].message.content if response.choices else None
        if not content or not content.strip():
            raise AIProviderError("模型返回了空内容")
        return content

    @staticmethod
    def _supports_json_mode_error(exc: Exception) -> bool:
        message = str(exc).lower()
        return any(token in message for token in ("response_format", "json_object", "response format"))

    def _suggest_follow_ups(self, user_message: str, reply: str) -> list[str]:
        prompt = (
            f"基于学生的问题：'{user_message}' 和你刚才的回答：'{reply[:200]}...'，"
            "生成 3 个学生接下来可能想追问的简短问题（简体中文）。"
            '只返回 JSON 对象，格式：{"questions": ["问题1", "问题2", "问题3"]}'
        )
        try:
            content = self._complete(
                [{"role": "user", "content": prompt}], temperature=0.5, json_mode=True
            )
            questions = extract_json_object(content).get("questions", [])
            valid = [q for q in questions if isinstance(q, str) and q.strip()]
            if valid:
                return valid[:3]
        except Exception as exc:
            logger.warning("Failed to generate follow-up questions, using defaults: %s", exc)
        return list(DEFAULT_FOLLOW_UP_QUESTIONS)

    def _handle_unavailable(self, fallback_func: Callable):
        message = MISSING_KEY_MESSAGE
        if self.allow_fallback:
            logger.warning("%s 已启用演示数据回退。", message)
            return fallback_func()
        raise AIConfigurationError(message)
