import { Router } from 'express';

const router = Router();

const providers = [
  {
    id: 'ollama',
    label: 'Ollama Local',
    status: 'planned',
    models: ['gemma3:1b', 'gemma3:4b', 'qwen2.5-coder:1.5b', 'llama3.2:1b']
  },
  {
    id: 'gemini-cli',
    label: 'Gemini CLI',
    status: 'planned',
    models: []
  },
  {
    id: 'openai',
    label: 'OpenAI GPT',
    status: 'planned',
    models: []
  },
  {
    id: 'copilot',
    label: 'GitHub Copilot Provider',
    status: 'stub',
    models: []
  }
];

router.get('/', (req, res) => {
  res.json({ providers });
});

router.get('/ollama/status', (req, res) => {
  res.status(501).json({
    error: {
      code: 'OLLAMA_RUNTIME_NOT_IMPLEMENTED',
      message: 'Ollama installation, server, and connection checks are scheduled for the Ollama runtime phase.'
    }
  });
});

router.get('/ollama/models', (req, res) => {
  res.status(501).json({
    error: {
      code: 'OLLAMA_MODELS_NOT_IMPLEMENTED',
      message: 'Ollama model discovery is scheduled for the Ollama runtime phase.'
    }
  });
});

export default router;
