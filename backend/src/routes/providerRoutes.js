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

router.get('/:providerId/callback', async (req, res, next) => {
  try {
    const provider = getProviderOrThrow(req.params.providerId);
    if (typeof provider.handleCallback !== 'function') {
      return res.status(400).send('해당 Provider는 OAuth 콜백을 지원하지 않습니다.');
    }

    const success = await provider.handleCallback(req.query.code);

    if (success) {
      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #07111f; color: white;">
            <div style="text-align: center; border: 1px solid #22d3ee; padding: 2rem; border-radius: 1rem; background: #0f172a; box-shadow: 0 0 20px rgba(34, 211, 238, 0.2);">
              <h1 style="color: #22d3ee; margin-top: 0;">인증 성공!</h1>
              <p>브레인스토밍 앱으로 돌아가셔도 좋습니다.</p>
              <p style="font-size: 0.8rem; color: #94a3b8;">이제 이 창은 닫으셔도 됩니다.</p>
              <button onclick="window.close()" style="margin-top: 1rem; padding: 0.6rem 1.2rem; border: none; border-radius: 0.5rem; background: #22d3ee; color: #07111f; cursor: pointer; font-weight: bold; transition: opacity 0.2s;">창 닫기</button>
            </div>
          </body>
        </html>
      `);
    } else {
      res.status(400).send('인증에 실패했습니다. 코드가 유효하지 않거나 취소되었습니다.');
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
