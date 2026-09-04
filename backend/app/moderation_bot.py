from dataclasses import dataclass
import re


BOT_USER = {
    "id": "moderation-bot",
    "username": "PokiBot",
    "displayName": "PokiBot",
    "avatar": "🤖",
    "status": "online",
}


@dataclass(frozen=True)
class ModerationResult:
    allowed: bool
    reason: str | None = None
    bot_message: str | None = None


class ModerationBot:
    """Deterministic moderation bot for the General channel."""

    BLOCKED_PATTERNS = (
        re.compile(r"\bspam\b", re.IGNORECASE),
        re.compile(r"\bscam\b", re.IGNORECASE),
    )

    def moderate(self, message: str) -> ModerationResult:
        normalized = " ".join(message.split())
        for pattern in self.BLOCKED_PATTERNS:
            if pattern.search(normalized):
                return ModerationResult(
                    allowed=False,
                    reason="Mensagem bloqueada pela moderação automática.",
                    bot_message="⚠️ Essa mensagem foi bloqueada pela moderação automática.",
                )
        return ModerationResult(allowed=True)

    def command(self, message: str) -> str | None:
        command = message.strip().lower().split()[0] if message.strip() else ""
        if command == "!help":
            return "🤖 Comandos: !help — ajuda | !rules — regras do canal"
        if command == "!rules":
            return "📜 Regras: respeito entre usuários, nada de spam/scam e nada de conteúdo abusivo."
        return None


moderation_bot = ModerationBot()
