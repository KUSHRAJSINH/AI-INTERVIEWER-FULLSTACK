from faster_whisper import WhisperModel
import tempfile

# Load once at startup (important for performance)
model = WhisperModel(
    "base",          # small | base | medium
    device="cpu",    # use "cuda" if GPU available
    compute_type="int8"
)


def speech_to_text(audio_bytes: bytes) -> str:
    if not audio_bytes:
        return ""

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as f:
        f.write(audio_bytes)
        f.flush()
        
        segments, _ = model.transcribe(
        f.name,
        beam_size=5,
        vad_filter=True
        )



       
        text = " ".join(segment.text for segment in segments)

    return text.strip()







