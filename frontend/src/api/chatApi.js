import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL
    || window.desktopConfig?.apiBaseUrl
    || 'http://localhost:4000/api',
  timeout: 180000
});

export async function fetchProviders() {
  const { data } = await api.get('/providers');
  return data.providers || [];
}

export async function fetchOllamaStatus() {
  const { data } = await api.get('/providers/ollama/status');
  return data;
}

export async function fetchOllamaModels() {
  const { data } = await api.get('/providers/ollama/models');
  return data;
}

export async function pullOllamaModel(model) {
  const { data } = await api.post('/providers/ollama/models/pull', { model });
  return data;
}

export async function sendChatMessage(payload) {
  const { data } = await api.post('/chat', payload);
  return data;
}

export async function sendNodeQuestion(payload) {
  const { data } = await api.post('/mindmap/node-question', payload);
  return data;
}
