"""DB-free unit tests for password hashing.

Guards against the passlib/bcrypt regression that raised on login. These run
without a database so a dependency bump that breaks bcrypt fails fast in CI.
"""

from app.core.security import hash_password, verify_password


def test_hash_and_verify_roundtrip() -> None:
    h = hash_password("s3cr3tpassword!")
    assert h.startswith("$2b$")  # standard bcrypt format
    assert verify_password("s3cr3tpassword!", h) is True


def test_verify_rejects_wrong_password() -> None:
    h = hash_password("correct-horse")
    assert verify_password("battery-staple", h) is False


def test_verify_never_raises_on_bad_hash() -> None:
    # A malformed stored hash must return False, not raise (which would 500).
    assert verify_password("anything", "not-a-real-bcrypt-hash") is False


def test_long_password_does_not_raise() -> None:
    # bcrypt's 72-byte limit must be handled internally, not surfaced as an error.
    long_pw = "x" * 200
    h = hash_password(long_pw)
    assert verify_password(long_pw, h) is True
