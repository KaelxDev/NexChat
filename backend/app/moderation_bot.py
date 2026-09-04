"""Moderation bot for the public/general chat channel."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable


@dataclass(frozen=True)
class ModerationResult:
    allowed: bool
    reason: str | None = None
    bot_message: str | None = None


class ModerationBot:
    """Small deterministic moderation layer with no external API dependency."""

    def __init__(self) -> None:
        self._commands: dict[str, Callable[..., str]] = {
            "!help": self.help,
            "!rules": self.rules,
        }
        self._blocked_patterns = [
            re.compile(r"\b(?:spam|scam)\b", re.IGNORECASE),
        ]

    def moderate(self, message: str) -> ModerationResult:
        text = " ".join((message or "").split())
        if not text:
            return ModerationResult(False, "empty_message")

        for pattern in self._blocked_patterns:
            if pattern.search(text):
                return ModerationResult(
                    False,
                    "moderation_filter",
                    "🤖 Mensagem bloqueada pelo filtro de moderação.",
                )

        return ModerationResult(True)

    def command(self, message: str) -> str | None:
        command = (message or "").strip().lower().split(maxsplit=1)[0]
        handler = self._commands.get(command)
        return handler() if handler else None

    @staticmethod
    def help() -> str:
        return "🤖 Comandos: !help — ajuda | !rules — regras do canal"

    @staticmethod
    def rules() -> str:
        return "📜 Regras: respeito entre usuários, nada de spam/scam e nada de conteúdo abusivo."


moderation_bot = ModerationBot()
