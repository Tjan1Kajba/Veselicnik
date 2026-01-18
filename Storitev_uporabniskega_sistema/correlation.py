from contextvars import ContextVar

# Context variable to store correlation id per request context
correlation_id_var: ContextVar[str | None] = ContextVar('correlation_id_var', default=None)

def set_correlation_id(cid: str | None):
    correlation_id_var.set(cid)

def get_correlation_id() -> str | None:
    return correlation_id_var.get()
