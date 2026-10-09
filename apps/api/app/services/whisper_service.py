"""Local Whisper integration used to turn uploaded audio into text."""

import os
from functools import lru_cache
import whisper

def _uploads_dir() -> str:
    # sobe dois níveis a partir deste arquivo para chegar em apps/api/uploads
    return os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
    )


@lru_cache(maxsize=1)
def get_model(model_size: str) -> whisper.Whisper:
    """Load and cache a Whisper model for the requested model size."""
    return whisper.load_model(model_size)


def transcribe_file(file_path: str, model_size: str = "base") -> str:
    """Transcribe an audio file with the cached local Whisper model.

    Args:
        file_path: Path to the audio file.
        model_size: Whisper model name to load.

    Raises:
        FileNotFoundError: If ``file_path`` does not exist.
        RuntimeError: If Whisper cannot decode or transcribe the file.

    Returns:
        The transcribed text.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(file_path)

    model: whisper.Whisper = get_model(model_size)
    result = model.transcribe(file_path)
    
    text = result.get("text", "")
    return text.strip() if isinstance(text, str) else ""
