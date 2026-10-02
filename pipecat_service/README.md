# Pipecat Voice Agent Service

This Python service owns the realtime voice agent layer for Sela Tutor English:

```text
Browser WebRTC audio
  -> Pipecat SmallWebRTCTransport
  -> AssemblyAI STT
  -> OpenAI-compatible LLM tutor
  -> Cartesia TTS
  -> Browser audio output
```

The Node/Express app remains the business backend. It creates `practice_session`, stores every `conversation_turn`, and generates the final report. The Pipecat service only handles realtime audio and posts transcript updates back to Node.

## Run Locally

```bash
cd pipecat_service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn server:app --host 127.0.0.1 --port 7860
```

Keep the Node/Vite app running in another terminal:

```bash
npm run dev
```

Frontend defaults:

- `VITE_PIPECAT_BASE_URL=http://127.0.0.1:7860`
- `VITE_BUSINESS_API_URL=http://127.0.0.1:5174`

## Notes

- Do not commit real API keys.
- SmallWebRTC is appropriate for this local competition demo and self-hosted testing.
- For production across many users or networks, switch the transport to Daily/managed WebRTC while keeping the frontend client wrapper and Node business API shape.
