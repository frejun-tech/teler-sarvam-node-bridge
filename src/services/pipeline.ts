import WebSocket from 'ws';
import { STTClient } from './sttClient';
import { LLMClient } from './llmClient';
import { TTSClient } from './ttsClient';
import { config } from '../core/config';
import { PipelineState } from '../types';
import { randomUUID } from 'crypto';

export class VoicePipeline {
    public  sessionId: string;
    private callWs: WebSocket;
    private sttClient: STTClient;
    private llmClient: LLMClient;
    private ttsClient: TTSClient;
    private state: PipelineState = 'IDLE';

    constructor(callWs: WebSocket) {
        this.callWs = callWs;
        this.sessionId = randomUUID();

        // Initialize STT Client
        this.sttClient = new STTClient(
            {
                wsUrl: config.sarvamSTTWs,
                apiKey: config.sarvamApiKey,
                languageCode: config.sarvamLanguageCode,
                model: config.sarvamSTTModel,
                sampleRate: config.sarvamSpeechSampleRate,
                encoding: config.sarvamAudioCodec,
            },
            {
                onTranscriptFinal: async (transcript: string) => {
                    await this.handleUserUtterance(transcript);
                },
                onTranscriptPartial: (partial: string) => {
                    if (this.state === 'SPEAKING' || this.state === 'PROCESSING') {
                        console.log(`[VoicePipeline ${this.sessionId}] User interruption detected during state: ${this.state}`);
                        this.handleInterruption();
                    }
                },
                onError: (err) => {
                    console.error(`[VoicePipeline ${this.sessionId}] STT Error:`, err);
                },
                onClose: (code, reason) => {
                    console.log(`[VoicePipeline ${this.sessionId}] STT WebSocket closed (${code}): ${reason}`);
                }
            }
        );

        // Initialize LLM Client
        this.llmClient = new LLMClient({
            apiEndpoint: config.LLMApi,
            apiKey: config.sarvamApiKey,
            model: config.LLMModel,
            fallbackModel: config.fallbackLLMModel,
        });

        // Initialize TTS Client
        this.ttsClient = new TTSClient({
            wsUrl: config.sarvamTTSWs,
            apiKey: config.sarvamApiKey,
            model: config.sarvamTTSModel,
            languageCode: config.sarvamLanguageCode,
            speaker: config.sarvamSpeaker,
            speechSampleRate: config.sarvamSpeechSampleRate,
            outputAudioCodec: config.sarvamAudioCodec,
            initialGreeting: config.initialGreeting,
        });
    }

    public setCallId(callId: string): void {
        if (callId && callId !== this.sessionId) {
            this.sessionId = callId;
        }
    }

    public async initialize(): Promise<void> {
        console.log(`[VoicePipeline ${this.sessionId}] Initializing session pipeline...`);
        this.state = 'LISTENING';
        await this.sttClient.connect();
    }

    public setTTSWebSocket(ws: WebSocket): void {
        console.log(`[VoicePipeline ${this.sessionId}] Attaching TTS WebSocket stream`);
        this.ttsClient.setSocket(ws);
    }

    public processCallAudio(audioB64: string): void {
        this.sttClient.sendAudio(audioB64);
    }

    private async handleUserUtterance(transcript: string): Promise<void> {
        if (!transcript || !transcript.trim()) return;

        console.log(`[VoicePipeline ${this.sessionId}] Processing user speech: "${transcript}"`);
        this.state = 'PROCESSING';

        try {
            const reply = await this.llmClient.generateReply(transcript);
            
            // Check if pipeline was interrupted while LLM was processing
            if (this.state as PipelineState !== 'PROCESSING') {
                console.warn(`[VoicePipeline ${this.sessionId}] Pipeline state changed during LLM completion (${this.state}), dropping reply.`);
                return;
            }

            console.log(`[VoicePipeline ${this.sessionId}] LLM Reply: "${reply}"`);
            this.state = 'SPEAKING';
            await this.ttsClient.streamText(reply);
        } catch (err) {
            console.error(`[VoicePipeline ${this.sessionId}] Error handling utterance:`, err);
        } finally {
            if (this.state === 'SPEAKING' || this.state === 'PROCESSING') {
                this.state = 'LISTENING';
            }
        }
    }

    private handleInterruption(): void {
        console.log(`[VoicePipeline ${this.sessionId}] Handling user barge-in / interruption`);
        this.ttsClient.interrupt();
        
        // clear Teler audio buffer
        const clearPayload = JSON.stringify({ type: "clear" });
        this.callWs.send(clearPayload);
        this.state = 'LISTENING';
    }

    public getState(): PipelineState {
        return this.state;
    }

    public destroy(): void {
        console.log(`[VoicePipeline ${this.sessionId}] Destroying pipeline and cleaning resources`);
        this.state = 'IDLE';
        this.sttClient.close();
        this.ttsClient.close();
        this.llmClient.clearHistory();

        if (this.callWs && (this.callWs.readyState === WebSocket.OPEN || this.callWs.readyState === WebSocket.CONNECTING)) {
            try {
                this.callWs.close();
            } catch (err) {
                console.error(`[VoicePipeline ${this.sessionId}] Error closing call WS:`, err);
            }
        }
    }
}