import axios from 'axios';
import { LLMConfig, ChatMessage } from '../types';

export class LLMClient {
    private config: LLMConfig;
    private contextWindow: ChatMessage[] = [];

    constructor(config: LLMConfig, customSystemPrompt?: string) {
        this.config = config;
        const systemPrompt = customSystemPrompt || `
            You are a helpful, concise voice AI assistant speaking to users over phone calls. Keep your responses brief, natural, and conversational (1 to 2 sentences max, less than 500 characters).
            Your reply is sent directly to a text-to-speech engine, so punctuation controls how it sounds, not just how it reads:
            - Use commas for short natural pauses within a sentence.
            - End sentences with a period for a clear, medium pause.
            - Do not use bullet points, asterisks, parentheses, markdown formatting, or emojis — write only what should be spoken aloud.
            - Spell out numbers, dates, and abbreviations the way they should be pronounced.
        `;
        this.contextWindow.push({
            role: 'system',
            content: systemPrompt.trim()
        });
    }

    public async generateReply(userTranscript: string): Promise<string> {
        this.contextWindow.push({ role: 'user', content: userTranscript });

        try {
            let reply = await this.queryLLMWithRetry();
            reply = this.sanitizeTextForTTS(reply);
            this.contextWindow.push({ role: 'assistant', content: reply });
            return reply;
        } catch (err) {
            console.error('[LLMClient Reply Error]', err);
            const fallbackResponse = 'जी, मैं आपकी सहायता के लिए तैयार हूँ।';
            this.contextWindow.push({ role: 'assistant', content: fallbackResponse });
            return fallbackResponse;
        }
    }

    private async queryLLMWithRetry(): Promise<string> {
        const maxRetries = this.config.maxRetries ?? 2;
        const timeoutMs = this.config.timeoutMs ?? 10000;

        // Try Primary Model
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[LLMClient] Querying model "${this.config.model}" (attempt ${attempt})...`);
                const response = await axios.post(
                    this.config.apiEndpoint,
                    {
                        model: this.config.model,
                        messages: this.contextWindow,
                        temperature: this.config.temperature ?? 0.7,
                        max_tokens: this.config.maxTokens ?? 300
                    },
                    {
                        headers: {
                            'api-subscription-key': this.config.apiKey,
                            'Content-Type': 'application/json'
                        },
                        timeout: timeoutMs
                    }
                );

                const content = response.data?.choices?.[0]?.message?.content;
                if (content && content.trim().length > 0) {
                    return content.trim();
                }
            } catch (err: any) {
                console.warn(`[LLMClient Primary Model Failed] Attempt ${attempt}:`, err?.response?.data || err?.message || err);
                if (attempt < maxRetries) {
                    await new Promise((res) => setTimeout(res, attempt * 500));
                }
            }
        }

        // Try Fallback Model
        console.warn(`[LLMClient] Primary model failed. Trying fallback model "${this.config.fallbackModel}"...`);
        try {
            const response = await axios.post(
                this.config.apiEndpoint,
                {
                    model: this.config.fallbackModel,
                    messages: this.contextWindow,
                    temperature: 0.7,
                    max_tokens: 300
                },
                {
                    headers: {
                        'api-subscription-key': this.config.apiKey,
                        'Content-Type': 'application/json'
                    },
                    timeout: timeoutMs
                }
            );
            const content = response.data?.choices?.[0]?.message?.content;
            if (content && content.trim().length > 0) {
                return content.trim();
            }
        } catch (fallbackErr: any) {
            console.error('[LLMClient Fallback Model Error]', fallbackErr?.response?.data || fallbackErr?.message || fallbackErr);
        }

        return 'जी, बताएँ मैं आपकी क्या सहायता कर सकता हूँ?';
    }

    private sanitizeTextForTTS(text: string): string {
        return text
            .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold **text**
            .replace(/\*([^*]+)\*/g, '$1')     // Italic *text*
            .replace(/#+\s+/g, '')              // Markdown Headers #
            .replace(/[-*•]\s+/g, '')           // Bullet points
            .replace(/[`~_]/g, '')              // Code formatting & underscores
            .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Emojis
            .replace(/\s+/g, ' ')               // Collapse whitespace
            .trim();
    }

    public clearHistory(): void {
        const systemMsg = this.contextWindow.find((m) => m.role === 'system');
        this.contextWindow = systemMsg ? [systemMsg] : [];
    }
}