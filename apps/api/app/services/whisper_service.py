import os
from functools import lru_cache
import whisper

def _uploads_dir() -> str:
    # apps/api/app/services/whisper_service.py ------> apps/api/uploads
    return os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
    )


@lru_cache(maxsize=1)
def get_model(model_size: str):
    return whisper.load_model(model_size)


def transcribe_file(file_path: str, model_size: str = "base") -> str:
    if not os.path.exists(file_path):
        raise FileNotFoundError(file_path)

    model = get_model(model_size)
    result = model.transcribe(file_path)
    return result.get("text", "").strip()

