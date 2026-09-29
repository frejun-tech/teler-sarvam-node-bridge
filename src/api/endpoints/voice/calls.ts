import { Router, Request, Response } from 'express';
import { config } from '../../../core/config';
import { telerClient } from '../../../services/telerClient';

export const callRouter = Router();

export const getFlowUrl             = () => `https://${process.env.SERVER_DOMAIN}/api/v1/calls/flow`;
export const getStatusCallbackUrl   = () => `https://${process.env.SERVER_DOMAIN}/api/v1/webhooks/receiver`;
export const getMediaStreamURL      = () => `wss://${process.env.SERVER_DOMAIN}/api/v1/media-stream`;

callRouter.post('/initiate', async (req: Request, res: Response) => {
    try {
        const { fromNumber, toNumber, record } = req.body;

        const flowUrl           = getFlowUrl();
        const statusCallbackUrl = getStatusCallbackUrl();

        const call = await telerClient.voice.calls.create({
            fromNumber,
            toNumber,
            flowUrl,
            statusCallbackUrl,
            record: record ?? true
        });

        console.log(`Call created successfully: ${JSON.stringify(call)}`);
        res.status(200).json({ message: 'Call initiated', call: call });
    } catch (error) {
        res.status(500).json({ message: 'Failed to initiate call', error: error});
    }
});

callRouter.post('/flow', (_req: Request, res: Response) => {
    const mediaStreamURL = getMediaStreamURL();

    res.json({
        action:      'stream',
        ws_url:      mediaStreamURL,
        sample_rate: config.telerSampleRate,
        chunk_size:  500,
        record:      false,
    });
});


callRouter.post("/dial", (req: Request, res: Response) => {
    console.log("Request body: ", req.body);
    res.json({
        action: "dial",
        to: "+918918961351"
    })
})