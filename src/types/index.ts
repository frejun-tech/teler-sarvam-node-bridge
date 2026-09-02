export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface STTConfig {
    wsUrl: string;
    apiKey: string;
    languageCode: string;
    model: string;
    sampleRate: string;
    encoding: string;
}

export interface STTCallbacks {
    onSessionBegin?: (requestId: string) => void;
    onTranscriptFinal?: (transcript: string) => void | Promise<void>;
    onTranscriptPartial?: (transcript: string) => void;
    onError?: (error: Error | string) => void;
    onClose?: (code: number, reason: string) => void;
}

export interface TTSConfig {
    wsUrl: string;
    apiKey: string;
    model: string;
    languageCode: string;
    speaker: string;
    speechSampleRate: string;
    outputAudioCodec: string;
    pace?: number;
    temperature?: number;
    minBufferSize?: number;
    maxChunkLength?: number;
    initialGreeting?: string;
}

export interface LLMConfig {
    apiEndpoint: string;
    apiKey: string;
    model: string;
    fallbackModel: string;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
    maxRetries?: number;
}

export type PipelineState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING';
