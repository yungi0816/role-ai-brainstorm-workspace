import { Router } from 'express';
import {
  configureProvider,
  diagnoseProvider,
  getProviderOrThrow,
  listProviderModels,
  listProviders,
  testProvider
} from '../services/aiRouterService.js';
import {
  getOllamaStatus,
  listOllamaModels,
  pullOllamaModel
} from '../services/ollamaRuntimeService.js';
import {
  clearProviderLogs,
  listProviderLogs
} from '../services/providerDebugLogService.js';

const router = Router();
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);
const LOCAL_ADDRESSES = new Set(['127.0.0.1', '::1']);

function normalizeAddress(value) {
  return String(value || '')
    .replace(/^::ffff:/, '')
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .toLowerCase();
}

function isLocalProviderCredentialRequest(req) {
  if (process.env.ALLOW_REMOTE_PROVIDER_AUTH === 'true') {
    return true;
  }

  const host = normalizeAddress(req.hostname);
  const remoteAddress = normalizeAddress(req.socket?.remoteAddress || req.ip);

  return LOCAL_HOSTNAMES.has(host) && (!remoteAddress || LOCAL_ADDRESSES.has(remoteAddress));
}

function requireLocalProviderCredentialRequest(req, res, next) {
  if (isLocalProviderCredentialRequest(req)) {
    next();
    return;
  }

  res.status(403).json({
    error: {
      code: 'LOCAL_PROVIDER_AUTH_REQUIRED',
      message: 'Provider credential routes are local-only by default. Set ALLOW_REMOTE_PROVIDER_AUTH=true only for a trusted private deployment.'
    }
  });
}

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

router.get('/debug/logs', (req, res) => {
  res.json({
    logs: listProviderLogs({
      providerId: req.query.providerId,
      limit: req.query.limit
    })
  });
});

router.delete('/debug/logs', (req, res) => {
  res.json({
    ...clearProviderLogs({
      providerId: req.query.providerId
    }),
    logs: listProviderLogs({
      providerId: req.query.providerId
    })
  });
});

router.get('/:providerId/models', async (req, res, next) => {
  try {
    res.json(await listProviderModels(req.params.providerId));
  } catch (error) {
    next(error);
  }
});

router.get('/:providerId/diagnostics', async (req, res, next) => {
  try {
    res.json(await diagnoseProvider(req.params.providerId, {
      model: req.query.model
    }));
  } catch (error) {
    next(error);
  }
});

router.post('/:providerId/test', async (req, res, next) => {
  try {
    res.json(await testProvider(req.params.providerId, {
      model: req.body?.model
    }));
  } catch (error) {
    next(error);
  }
});

router.post('/:providerId/auth', requireLocalProviderCredentialRequest, async (req, res, next) => {
  try {
    res.json(await configureProvider(req.params.providerId, req.body));
  } catch (error) {
    next(error);
  }
});

router.get('/:providerId/callback', requireLocalProviderCredentialRequest, async (req, res, next) => {
  try {
    const provider = getProviderOrThrow(req.params.providerId);
    if (typeof provider.handleCallback !== 'function') {
      return res.status(400).send('This provider does not support OAuth callbacks.');
    }

    const success = await provider.handleCallback(req.query.code);

    if (success) {
      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #07111f; color: white;">
            <div style="text-align: center; border: 1px solid #22d3ee; padding: 2rem; border-radius: 1rem; background: #0f172a; box-shadow: 0 0 20px rgba(34, 211, 238, 0.2);">
              <h1 style="color: #22d3ee; margin-top: 0;">Authentication complete</h1>
              <p>You can return to Role AI Brainstorm Workspace.</p>
              <p style="font-size: 0.8rem; color: #94a3b8;">This window can be closed.</p>
              <button onclick="window.close()" style="margin-top: 1rem; padding: 0.6rem 1.2rem; border: none; border-radius: 0.5rem; background: #22d3ee; color: #07111f; cursor: pointer; font-weight: bold; transition: opacity 0.2s;">Close</button>
            </div>
          </body>
        </html>
      `);
    } else {
      res.status(400).send('Authentication failed. The authorization code is invalid or the flow was cancelled.');
    }
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
