# Voice biometric model — roadmap

> Imported from the legacy `workguard/` web prototype on 2026-04-25.
> Original location: `workguard/src/models/README.md`.

## ECAPA-TDNN speaker verification (target)

We want to replace the current simulated **Vocal Imprint** with real speaker verification.

Reference model:

- https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb

Expected placement (after ONNX conversion):

- `android/app/src/main/assets/models/speaker_verification.onnx`
- `ios/WorkguardRN/Resources/models/speaker_verification.onnx`

Notes:

- This repository does **not** ship the ONNX model file.
- Convert/export the model to ONNX separately and bundle as a native asset.
- For RN: `onnxruntime-react-native` (https://github.com/microsoft/onnxruntime/tree/main/js/react_native).

## Lightweight fallback (current)

Until an ONNX ECAPA-TDNN pipeline is wired end-to-end, `VocalImprint.tsx` uses
a vocal-Stroop task driven by `@react-native-voice/voice` (system speech
recognition). Subjects must speak the **ink color** of a displayed word, not
read the word — measuring response latency + correctness as a proxy for the
behavioral signal we will eventually replace with a real speaker embedding.

This is **not** equivalent to ECAPA-TDNN accuracy, but it is:

- fully on-device (no audio ever leaves the device)
- fast enough for mobile
- good enough to lock down the biometric UX and payload format

## Migration steps when the ONNX model is ready

1. Add `onnxruntime-react-native` to `package.json`.
2. Bundle the `.onnx` file as a native asset on both platforms.
3. In `signal-engine/VoiceCollector.ts`, swap the Stroop-based payload for the
   ECAPA embedding (192-dim `Float32Array`).
4. Backend (`hybrid-vector-api`): persist embeddings under
   `workguard_enrollments.voice_embedding` and verify with cosine similarity
   against future check-ins.
