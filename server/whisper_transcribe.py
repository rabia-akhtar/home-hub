#!/usr/bin/env python3
"""
Transcribe an audio file using faster-whisper (local, offline).
Usage: python3 whisper_transcribe.py <audio_file> [model_size]
Prints the transcript to stdout.
"""
import sys
from faster_whisper import WhisperModel

audio_file = sys.argv[1]
model_size  = sys.argv[2] if len(sys.argv) > 2 else "base"

model    = WhisperModel(model_size, device="cpu", compute_type="int8")
segments, _ = model.transcribe(audio_file, beam_size=5, language="en")
transcript   = " ".join(s.text.strip() for s in segments)
print(transcript, flush=True)
