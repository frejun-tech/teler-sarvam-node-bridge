# Teler-Sarvam-Node-Bridge

A reference integration between Teler and SARVAM in Node, based on [Media Streaming Bridge](https://frejun.ai/docs/category/media-streaming/) over WebSockets.

## What is Teler?

Teler is a programmable voice API by FreJun. It handles carriers, phone numbers, and real-time audio streaming so you can connect AI models directly to phone calls. → [frejun.ai](https://frejun.ai)


## Setup

1. **Clone and configure:**

   ```bash
   git clone https://github.com/frejun-tech/teler-sarvam-node-bridge.git
   cd teler-sarvam-node-bridge
   cp .env.example .env
   # Edit .env with your actual values
   ```

2. **Run with Docker:**
   ```bash
   docker compose up -d --build
   ```

## Environment Variables

| Variable                      | Description                                              | Default                                            |
| ----------------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| `PORT`                        | Server HTTP port                                         | `8000`                                             |
| `NODE_ENV`                    | Environment mode (`development`/`production`)            | `development`                                      |
| `SERVER_DOMAIN`               | Fallback domain for flow URLs                            | `your_fallback_domain`                             |
| `TELER_API_KEY`               | Your Teler API key                                       | Required                                           |
| `TELER_SAMPLE_RATE`           | Audio sample rate of Teler                               | `8k`                                               |
| `TELER_CHUNK_SIZE`            | Chunk size of Teler audio                                | `500`                                              |
| `SARVAM_API_KEY`              | Your SARVAM API key                                      | Required                                           |
| `SARVAM_SAMPLE_RATE`          | Audio sample rate of SARVAM                              | `8000`                                             |
| `SARVAM_MESSAGE_BUFFER_SIZE`    | Audio chunk buffer size before relaying                  | `5`                                                |
| `SARVAM_AUDIO_CODEC`          | Audio encoding format                                    | `linear16`                                         |
| `SARVAM_TTS_MODEL`            | SARVAM TTS Model                                         | `bulbul:v3`                                        |
| `SARVAM_TTS_WS_URL`           | SARVAM TTS WebSocket URL                                 | `wss://api.sarvam.ai/text-to-speech/ws`           |
| `SARVAM_LANGUAGE_CODE`        | Language code for STT/TTS                                | `en-IN`                                            |
| `SARVAM_SPEAKER`              | Speaker voice name                                       | `shubh`                                            |
| `STATIC_RESPONSE_TEXT`        | Initial greeting played when call connects               | Welcome message                                    |
| `SARVAM_STT_WS_URL`           | SARVAM Realtime STT WebSocket URL                        | `wss://api.sarvam.ai/speech-to-text-realtime/ws`  |
| `SARVAM_STT_MODEL`            | SARVAM STT Model                                         | `saaras:v3-realtime`                               |
| `SARVAM_LLM_API`              | SARVAM LLM Chat Completions API                          | `https://api.sarvam.ai/v1/chat/completions`       |
| `SARVAM_LLM_MODEL`            | Primary SARVAM Conversational LLM Model                  | `sarvam-105b-conversations`                        |
| `SARVAM_LLM_MODEL_FALLBACK`   | Fallback SARVAM LLM Model                                | `sarvam-105b`                                      |
| `NGROK_AUTHTOKEN`             | Your ngrok auth token (Docker setup)                     | Required                                           |

## API Endpoints

- `GET /` - Health check with server domain
- `GET /health` - Service status
- `GET /ngrok-status` - Current ngrok status and URL
- `POST /api/v1/calls/initiate-call` - Start a new call with dynamic phone numbers
- `POST /api/v1/calls/flow` - Get call flow configuration
- `WebSocket /api/v1/media-stream` - Audio streaming
- `POST /api/v1/webhooks/receiver` - Teler webhook receiver

### Call Initiation Example

```bash
curl -X POST "https://your_ngrok_domain/api/v1/calls/initiate-call" \
  -H "Content-Type: application/json" \
  -d '{
    "fromNumber": "+918064xxx",
    "toNumber": "+919967xxx"
  }'
```

## Features

- **Bi-directional media streaming** - Bridges real-time audio between Teler and Sarvam (STT, LLM, TTS) over WebSockets.
- **Production-Grade Architecture** - Decoupled STT, TTS, and LLM services orchestrated by session-isolated `VoicePipeline`.
- **Interruption & Barge-in Handling** - Automatically clears audio buffers when the user speaks over assistant responses.
- **Dockerized setup** - Dockerfile and `docker-compose.yaml` for seamless local development and containerized deployment.
- **Dynamic ngrok URL detection** - Automatically detects and configures current ngrok domain for webhooks and flow URLs.
