import { Router } from 'express';
import { callRouter } from './endpoints/voice/calls';
import { webhookRouter } from './endpoints/webhooks';

export const coreRouter = Router();

coreRouter.use('/v1/calls', callRouter);
coreRouter.use('/v1/webhooks', webhookRouter);