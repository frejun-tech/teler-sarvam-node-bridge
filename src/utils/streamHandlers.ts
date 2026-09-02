import { StreamData, StreamHandlerResult, StreamOP } from "@frejun/teler";
import { VoicePipeline } from "../services/pipeline";
import { config } from "../core/config";

export const callStreamHandler = (pipeline: VoicePipeline) => {
    return async (content: StreamData): Promise<StreamHandlerResult> => {
        try {
            let audioB64: string | null = null;

            if (typeof content === "string") {
                const control = JSON.parse(content);
                const type = control?.type;

                if (type === "audio") {
                    audioB64 = control?.data?.audio_b64;
                } else if (type === "start") {
                    const callId = control?.call_id;
                    if (callId) {
                        pipeline.setCallId(callId);
                    }
                }
            }

            if (audioB64) {
                pipeline.processCallAudio(audioB64);
            }

            return ['', StreamOP.PASS];
        } catch (err) {
            console.error('[callStreamHandler] error', err);
            return ['', StreamOP.PASS];
        }
    };
};

export const remoteStreamHandler = () => {
    let chunkId = 1;
    const messageBuffer: Buffer[] = [];
    
    function _flush_chunks() {
        const audio = Buffer.concat(messageBuffer);
        const payload = JSON.stringify({
            type: "audio",
            audio_b64: audio.toString("base64"),
            chunk_id: chunkId++,
        });
        messageBuffer.length = 0;
        return payload;
    }

    const handler = async (content: StreamData): Promise<StreamHandlerResult> => {
        try {
            if (typeof content === "string") {
                const control = JSON.parse(content);
                const type = control.type;

                if (type === "audio") {
                    const audioB64 = control?.data?.audio;

                    if (audioB64) {
                        const message = Buffer.from(audioB64, 'base64');
                        messageBuffer.push(message);
                    }

                    if (messageBuffer.length >= config.sarvamMessageBufferSize) {
                        const payload = _flush_chunks();
                        return [payload, StreamOP.RELAY];
                    }
                } else if (type === "event") {
                    const event = control?.data?.event_type;
                    if (event === "final") {
                        const payload = _flush_chunks();
                        return [payload, StreamOP.RELAY];
                    }
                } else if (type === "error") {
                    console.error("Error message: ", control?.data?.message, "Error code: ", control?.data?.code, "Error details: ", control?.data?.details);
                }
            }
            return ['', StreamOP.PASS];
        } catch (err) {
            console.error('[remoteStreamHandler] error', err);
            return ['', StreamOP.PASS];
        }
    };
    return handler;
};