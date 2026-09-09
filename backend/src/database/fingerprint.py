import hashlib
import json
import re
from urllib.parse import urlsplit, urlunsplit

_WHITESPACE = re.compile(r"\s+")


def _squash(value: str | None) -> str:
    return _WHITESPACE.sub(" ", (value or "").strip()).lower()


def _canonical_url(url: str | None) -> str:
    """Scheme, host and path only. Providers vary tracking parameters per call."""
    if not url:
        return ""
    parts = urlsplit(url.strip())
    return urlunsplit((
        parts.scheme.lower(),
        parts.netloc.lower(),
        parts.path.rstrip("/"),
        "",
        "",
    )).lower()


def job_fingerprint(
    provider: str,
    title: str | None,
    company: str | None,
    location: str | None,
    url: str | None,
) -> str:
    """
    Stable identity for a posting that carries no usable provider id.

    Description is deliberately excluded: providers reflow whitespace and
    truncate it differently between calls, so including it would produce a new
    identity for the same posting.
    """
    payload = "|".join([
        provider,
        _squash(company),
        _squash(title),
        _squash(location),
        _canonical_url(url),
    ])
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def payload_hash(raw: dict | None) -> str:
    return hashlib.sha256(
        json.dumps(raw or {}, sort_keys=True, default=str).encode("utf-8")
    ).hexdigest()
