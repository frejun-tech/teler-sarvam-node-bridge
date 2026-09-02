import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { StreamConnector, StreamType } from '@frejun/teler';
import {
    callStreamHandler,
    remoteStreamHandler
} from './streamHandlers';
import { VoicePipeline } from '../services/pipeline';
import { config } from '../core/config';

export const wss = new WebSocketServer({ noServer: true });
const activePipelines = new Map<WebSocket, VoicePipeline>();

wss.on('connection', async (callWs: WebSocket) => {
    console.log('[Server] Teler call WebSocket connected!');

    const pipeline = new VoicePipeline(callWs);
    activePipelines.set(callWs, pipeline);

    try {
        await pipeline.initialize();

        const connector = new StreamConnector(
            `${config.sarvamTTSWs}?model=${config.sarvamTTSModel}&send_completion_event=true`,
            StreamType.BIDIRECTIONAL,
            callStreamHandler(pipeline),
            remoteStreamHandler(),
            { 'api-subscription-key': config.sarvamApiKey }
        );

        const ttsWs = await connector.bridgeStream(callWs) ?? null;

        if (!ttsWs) {
            throw new Error(`[Server] Error connecting to TTS websocket via StreamConnector.`);
        }

        pipeline.setTTSWebSocket(ttsWs);
        console.log(`[Server] Pipeline session ${pipeline.sessionId} fully initialized and bridged`);
    } catch (err) {
        console.error(`[Server] Failed to initialize pipeline session for call`, err);
        cleanupSession(callWs);
    }

    callWs.on('close', () => {
        console.log('[Server] Teler call WebSocket closed');
        cleanupSession(callWs);
    });

    callWs.on('error', (err) => {
        console.error('[Server] Teler call WebSocket error', err);
        cleanupSession(callWs);
    });
});

function cleanupSession(callWs: WebSocket): void {
    const pipeline = activePipelines.get(callWs);
    if (pipeline) {
        pipeline.destroy();
        activePipelines.delete(callWs);
    }
}

export const handleUpgrade = (request: IncomingMessage, socket: Socket, head: Buffer) => {
    if (request.url === '/api/v1/media-stream') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws);
        });
    } else {
        socket.destroy();
    }
};