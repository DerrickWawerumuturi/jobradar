import os
from concurrent.futures import ProcessPoolExecutor
from concurrent.futures.process import BrokenProcessPool

# Skill extraction is ~93% of an analysis and is pure CPU work in one thread.
# Threads cannot help: the GIL is held throughout, and spaCy pipelines are not
# safe to call concurrently on the same object. Separate processes give each
# worker its own pipeline and its own core.

_extractor = None


def _init_worker():
    """Build one SkillExtractor per worker, once, and keep it warm."""
    global _extractor
    from src.Agent.utils.skill_extractor import SkillExtractor
    _extractor = SkillExtractor()


def _extract_one(description):
    """Returns the skill list, or None if SkillNer failed on this posting."""
    try:
        return sorted(_extractor.extract(description))
    except Exception as err:
        print(f"Skill extraction failed, dropping posting: {err}")
        return None


def _worker_count() -> int:
    override = os.getenv("JOBRADAR_EXTRACTION_WORKERS", "")
    if override.isdigit() and int(override) > 0:
        return int(override)

    cpus = os.cpu_count() or 2
    # Each worker holds its own en_core_web_lg plus the 31k-entry SkillNer
    # matchers, so this is bounded by memory rather than by core count.
    return max(1, min(4, cpus - 1))


class ExtractionPool:
    """
    Lazily-created process pool with a warm extractor in each worker.

    Created on first use and kept for the life of the process: spinning it up
    costs each worker a model load, which is only worth paying once.
    """

    def __init__(self):
        self._pool = None

    def _ensure_pool(self) -> ProcessPoolExecutor:
        if self._pool is None:
            workers = _worker_count()
            print(f"Starting skill-extraction pool with {workers} workers")
            self._pool = ProcessPoolExecutor(
                max_workers=workers,
                initializer=_init_worker
            )
        return self._pool

    def _discard_pool(self) -> None:
        if self._pool is not None:
            self._pool.shutdown(wait=False, cancel_futures=True)
            self._pool = None

    def extract_many(self, descriptions: list) -> list:
        """Skill lists in the same order as the input; None where extraction failed."""
        if not descriptions:
            return []

        try:
            return list(self._ensure_pool().map(_extract_one, descriptions))
        except BrokenProcessPool:
            # A worker died — usually memory, since each holds its own
            # en_core_web_lg and the 31k matchers. The executor stays broken
            # for good once this happens, and the pool is a module-level
            # singleton, so without rebuilding it every later analysis in this
            # process would fail too and only a restart would help.
            print("Extraction pool broke (worker died); rebuilding and retrying once")
            self._discard_pool()

        return list(self._ensure_pool().map(_extract_one, descriptions))


extraction_pool = ExtractionPool()
