import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port:                       Number(process.env.PORT) || 8000,
    nodeEnv:                    process.env.NODE_ENV || 'development',
    serverDomain:               process.env.SERVER_DOMAIN || 'your_fallback_domain',
    
    telerKey:                   process.env.TELER_API_KEY || '',
    telerSampleRate:            process.env.TELER_SAMPLE_RATE || "8k",
    telerChunkSize:             Number(process.env.TELER_CHUNK_SIZE) || 500,

    // Sarvam Core Config
    sarvamSpeechSampleRate:     process.env.SARVAM_SAMPLE_RATE || "8000",
    sarvamMessageBufferSize:    Number(process.env.SARVAM_MESSAGE_BUFFER_SIZE) || 5,
    sarvamAudioCodec:           process.env.SARVAM_AUDIO_CODEC || "linear16",
    sarvamApiKey:               process.env.SARVAM_API_KEY || '',

    // Sarvam TTS Config
    sarvamTTSModel:             process.env.SARVAM_TTS_MODEL || 'bulbul:v3',
    sarvamTTSWs:                process.env.SARVAM_TTS_WS_URL || 'wss://api.sarvam.ai/text-to-speech/ws',
    sarvamLanguageCode:         process.env.SARVAM_LANGUAGE_CODE || 'en-IN',
    sarvamSpeaker:              process.env.SARVAM_SPEAKER || 'shubh',
    initialGreeting:            process.env.STATIC_RESPONSE_TEXT || 'Hello, Welcome to Teler Sarvam bridge integration. Hi, how are you. Hope you are doing good. How can I help you today?',

    // Sarvam STT Config
    sarvamSTTWs:                process.env.SARVAM_STT_WS_URL || 'wss://api.sarvam.ai/speech-to-text-realtime/ws',
    sarvamSTTModel:             process.env.SARVAM_STT_MODEL || 'saaras:v3-realtime',

    // Sarvam LLM Config
    LLMApi:                     process.env.SARVAM_LLM_API || 'https://api.sarvam.ai/v1/chat/completions',
    LLLMApi:                    process.env.SARVAM_LLM_API || 'https://api.sarvam.ai/v1/chat/completions',
    LLMModel:                   process.env.SARVAM_LLM_MODEL || 'sarvam-105b-conversations',
    fallbackLLMModel:           process.env.SARVAM_LLM_MODEL_FALLBACK || 'sarvam-105b',
};