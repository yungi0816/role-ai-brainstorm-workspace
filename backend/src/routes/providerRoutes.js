import { Router } from 'express';
import {
  configureProvider,
  getProviderOrThrow,
  listProviderModels,
  listProviders
} from '../services/aiRouterService.js';
import {
  getOllamaStatus,
  listOllamaModels,
  pullOllamaModel
} from '../services/ollamaRuntimeService.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ providers: listProviders() });
});

router.get('/ollama/status', async (req, res, next) => {
  try {
    res.json({
      provider: getProviderOrThrow('ollama').getMetadata(),
      status: await getOllamaStatus()
    });
  } catch (error) {
    next(error);
  }
});

router.get('/ollama/models', async (req, res, next) => {
  try {
    res.json({
      provider: getProviderOrThrow('ollama').getMetadata(),
      ...(await listOllamaModels())
    });
  } catch (error) {
    next(error);
  }
});

router.post('/ollama/models/pull', async (req, res, next) => {
  try {
    const { model } = req.body;
    if (!model) {
      return res.status(400).json({
        error: {
          code: 'MODEL_REQUIRED',
          message: 'model is required.'
        }
      });
    }

    return res.json(await pullOllamaModel(model));
  } catch (error) {
    return next(error);
  }
});

router.get('/:providerId/models', async (req, res, next) => {
  try {
    res.json(await listProviderModels(req.params.providerId));
  } catch (error) {
    next(error);
  }
});

router.post('/:providerId/auth', async (req, res, next) => {
  try {
    res.json(await configureProvider(req.params.providerId, req.body));
  } catch (error) {
    next(error);
  }
});

router.get('/:providerId', (req, res, next) => {
  try {
    res.json({ provider: getProviderOrThrow(req.params.providerId).getMetadata() });
  } catch (error) {
    next(error);
  }
});

export default router;
