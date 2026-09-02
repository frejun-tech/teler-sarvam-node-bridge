import WebSocket from 'ws';
import { STTConfig, STTCallbacks } from '../types';

export class STTClient {
    private ws: WebSocket | null = null;
    private config: STTConfig;
    private callbacks: STTCallbacks;
    private pingInterval: NodeJS.Timeout | null = null;
    private isClosed = false;

    constructor(config: STTConfig, callbacks: STTCallbacks = {}) {
        this.config = config;
        this.callbacks = callbacks;
    }

    public async connect(): Promise<void> {
        this.isClosed = false;
        const params = new URLSearchParams({
            language_code: this.config.languageCode,
            model: this.config.model,
            sample_rate: this.config.sampleRate,
            encoding: this.config.encoding,
            mode: 'transcribe',
            stream_type: 'balanced',
        });
        const url = `${this.config.wsUrl}?${params.toString()}`;

        console.log(`[STTClient] Connecting to Sarvam Realtime STT...`);
        this.ws = new WebSocket(url, {
            headers: {
                'Api-Subscription-Key': this.config.apiKey,
            },
        });

        this.ws.on('open', () => {
            console.log('[STTClient] Sarvam STT WebSocket connected successfully');
            this.startPingInterval();
        });

        this.ws.on('message', async (raw: WebSocket.RawData) => {
            try {
                const control = JSON.parse(raw.toString());
                if (control.event === 'transcript.final' && control.text?.trim()) {
                    const transcript = control.text.trim();
                    console.log(`[STTClient Final Transcript]: "${transcript}"`);
                    if (this.callbacks.onTranscriptFinal) {
                        await this.callbacks.onTranscriptFinal(transcript);
                    }
                } else if (control.event === 'transcript.partial' && control.text) {
                    console.debug(`[STTClient Partial Transcript]: "${control.text}"`);
                    if (this.callbacks.onTranscriptPartial) {
                        this.callbacks.onTranscriptPartial(control.text);
                    }
                } else if (control.event === 'session.begin') {
                    console.log(`[STTClient] Session begin (request_id: ${control.request_id})`);
                    if (this.callbacks.onSessionBegin) {
                        this.callbacks.onSessionBegin(control.request_id);
                    }
                } else if (control.event === 'error') {
                    console.error(`[STTClient Error Event] (${control.code}, fatal=${control.is_fatal}): ${control.message}`);
                    if (this.callbacks.onError) {
                        this.callbacks.onError(new Error(`STT Error ${control.code}: ${control.message}`));
                    }
                }
            } catch (err: any) {
                console.error('[STTClient Message Parsing Error]', err);
            }
        });

        this.ws.on('error', (err) => {
            console.error('[STTClient WebSocket Error]', err);
            if (this.callbacks.onError) {
                this.callbacks.onError(err);
            }
        });

        this.ws.on('close', (code, reason) => {
            const reasonStr = reason ? reason.toString() : 'Normal closure';
            console.log(`[STTClient] WebSocket closed (${code}): ${reasonStr}`);
            this.stopPingInterval();
            if (this.callbacks.onClose) {
                this.callbacks.onClose(code, reasonStr);
            }
        });
    }

    public sendAudio(audioB64: string): void {
        if (this.isClosed || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn(`[STTClient] Cannot send audio — socket not open (readyState=${this.ws?.readyState})`);
            return;
        }
        try {
            this.ws.send(JSON.stringify({ event: 'audio_input', audio: audioB64 }));
        } catch (err) {
            console.error('[STTClient Send Audio Error]', err);
        }
    }

    private startPingInterval(): void {
        this.stopPingInterval();
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.ping();
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
        this.isClosed = true;
        this.stopPingInterval();
        if (this.ws) {
            try {
                if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                    this.ws.close();
                }
            } catch (err) {
                console.error('[STTClient Close Error]', err);
            }
            this.ws = null;
        }
    }
}