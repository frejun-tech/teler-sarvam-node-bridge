import { WebSocket } from 'ws';
import { TTSConfig } from '../types';

export class TTSClient {
    private ttsWs: WebSocket | null = null;
    private config: TTSConfig;
    private pingInterval: NodeJS.Timeout | null = null;

    constructor(config: TTSConfig) {
        this.config = config;
    }

    public setSocket(ws: WebSocket): void {
        this.ttsWs = ws;
        this.startPingInterval();

        if (this.ttsWs.readyState === WebSocket.OPEN) {
            this.sendConfig();
            this.playInitialGreeting();
        } else {
            this.ttsWs.once('open', () => {
                this.sendConfig();
                this.playInitialGreeting();
            });
        }

        this.ttsWs.once('close', () => {
            this.stopPingInterval();
        });
    }

    public sendConfig(): void {
        if (!this.ttsWs || this.ttsWs.readyState !== WebSocket.OPEN) {
            console.warn('[TTSClient] Cannot send config — TTS socket not open');
            return;
        }

        try {
            const configPayload = JSON.stringify({
                type: "config",
                data: {
                    model: this.config.model,
                    language_code: this.config.languageCode,
                    speaker: this.config.speaker,
                    speech_sample_rate: this.config.speechSampleRate,
                    output_audio_codec: this.config.outputAudioCodec,
                    pace: this.config.pace ?? 1.0,
                    temperature: this.config.temperature ?? 0.6,
                    min_buffer_size: this.config.minBufferSize ?? 30,
                    max_chunk_length: this.config.maxChunkLength ?? 150
                }
            });
            console.log('[TTSClient] Sending Sarvam TTS config:', configPayload);
            this.ttsWs.send(configPayload);
        } catch (err) {
            console.error('[TTSClient Config Error]', err);
        }
    }

    public async streamText(text: string): Promise<void> {
        if (!text || !text.trim()) return;

        if (!this.ttsWs || this.ttsWs.readyState !== WebSocket.OPEN) {
            console.error('[TTSClient] Cannot stream text — socket not open');
            return;
        }

        try {
            const textPayload = JSON.stringify({
                type: "text",
                data: { text: text.trim() }
            });
            const flushPayload = JSON.stringify({ type: "flush" });

            console.log(`[TTSClient Streaming Text]: "${text.trim()}"`);
            this.ttsWs.send(textPayload);
            this.ttsWs.send(flushPayload);
        } catch (err) {
            console.error('[TTSClient Stream Text Error]', err);
        }
    }

    public async playInitialGreeting(): Promise<void> {
        const greeting = this.config.initialGreeting || 'Hello, how can I help you today?';
        console.log(`[TTSClient] Playing initial greeting: "${greeting}"`);
        await this.streamText(greeting);
    }

    public interrupt(): void {
        if (!this.ttsWs || this.ttsWs.readyState !== WebSocket.OPEN) return;
        try {
            console.log('[TTSClient] Sending flush signal for interruption');
            const flushPayload = JSON.stringify({ type: "flush" });
            this.ttsWs.send(flushPayload);
        } catch (err) {
            console.error('[TTSClient Interrupt Error]', err);
        }
    }

    private startPingInterval(): void {
        this.stopPingInterval();
        this.pingInterval = setInterval(() => {
            if (this.ttsWs && this.ttsWs.readyState === WebSocket.OPEN) {
                this.ttsWs.ping();
            }
        }, 30000);
    }

    private stopPingInterval(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    public close(): void {
        this.stopPingInterval();
        if (this.ttsWs) {
            try {
                if (this.ttsWs.readyState === WebSocket.OPEN || this.ttsWs.readyState === WebSocket.CONNECTING) {
                    this.ttsWs.close();
                }
            } catch (err) {
                console.error('[TTSClient Close Error]', err);
            }
            this.ttsWs = null;
        }
    }
}