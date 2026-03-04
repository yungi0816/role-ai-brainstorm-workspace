import { Router } from 'express';
import { getProviderOrThrow, listProviders } from '../services/aiRouterService.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ providers: listProviders() });
});

router.get('/ollama/status', (req, res) => {
  res.status(501).json({
    error: {
      code: 'OLLAMA_RUNTIME_NOT_IMPLEMENTED',
      message: 'Ollama installation, server, and connection checks are scheduled for the Ollama runtime phase.'
    },
    provider: getProviderOrThrow('ollama').getMetadata()
  });
});

router.get('/ollama/models', (req, res) => {
  const provider = getProviderOrThrow('ollama').getMetadata();
  res.json({
    source: 'configured-small-local-candidates',
    runtimeImplemented: false,
    models: provider.models,
    provider
  });
});

router.get('/:providerId', (req, res, next) => {
  try {
    res.json({ provider: getProviderOrThrow(req.params.providerId).getMetadata() });
  } catch (error) {
    next(error);
  }
});

export default router;
