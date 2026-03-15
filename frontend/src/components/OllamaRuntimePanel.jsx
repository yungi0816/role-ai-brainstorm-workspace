import { useEffect, useMemo, useState } from 'react';
import { Download, Play, RefreshCw } from 'lucide-react';
import { fetchOllamaModels, pullOllamaModel } from '../api/chatApi.js';

const OLLAMA_DOWNLOAD_URL = 'https://ollama.com/download';

function StatusPill({ ok, label }) {
  return (
    <span
      className={[
        'rounded border px-2 py-1 text-[11px]',
        ok
          ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-200'
          : 'border-rose-300/25 bg-rose-400/10 text-rose-200'
      ].join(' ')}
    >
      {label}
    </span>
  );
}

export default function OllamaRuntimePanel({ isActive, selectedModel }) {
  const [runtime, setRuntime] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pullingModel, setPullingModel] = useState(null);
  const [error, setError] = useState(null);

  const localModelNames = useMemo(
    () => new Set((runtime?.models || []).map((item) => item.name)),
    [runtime]
  );

  async function loadOllamaRuntime() {
    setIsLoading(true);
    setError(null);
    try {
      setRuntime(await fetchOllamaModels());
    } catch (loadError) {
      setError(loadError.response?.data?.error?.message || loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isActive) {
      loadOllamaRuntime();
    }
  }, [isActive]);

  if (!isActive) {
    return null;
  }

  const status = runtime?.status;
  const recommendedModels = runtime?.recommendedModels || [];

  async function handleDownload() {
    if (window.desktopShell?.openExternal) {
      await window.desktopShell.openExternal(OLLAMA_DOWNLOAD_URL);
      return;
    }

    window.open(OLLAMA_DOWNLOAD_URL, '_blank', 'noopener,noreferrer');
  }

  async function handlePull(model) {
    setPullingModel(model);
    setError(null);
    try {
      await pullOllamaModel(model);
      await loadOllamaRuntime();
    } catch (pullError) {
      setError(pullError.response?.data?.error?.message || pullError.message);
    } finally {
      setPullingModel(null);
    }
  }

  return (
    <section className="grid gap-3 rounded-md border border-cyan-300/10 bg-slate-900/48 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Ollama Runtime</h3>
          <p className="text-xs text-slate-400">Local install, server, and model checks</p>
        </div>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-slate-300 transition hover:border-cyan-300/40 hover:bg-slate-800 disabled:opacity-60"
          onClick={loadOllamaRuntime}
          disabled={isLoading}
          title="Refresh Ollama"
          aria-label="Refresh Ollama"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {status ? (
        <div className="flex flex-wrap gap-2">
          <StatusPill ok={status.installed} label={status.installed ? 'installed' : 'not installed'} />
          <StatusPill ok={status.serverRunning} label={status.serverRunning ? 'server running' : 'server stopped'} />
          <StatusPill ok={status.connected} label={status.connected ? 'connected' : 'not connected'} />
        </div>
      ) : (
        <div className="text-xs text-slate-400">Ollama status has not been loaded yet.</div>
      )}

      {status && !status.installed ? (
        <div className="grid gap-2 rounded-md border border-amber-300/20 bg-amber-400/10 p-3">
          <p className="text-xs leading-5 text-amber-100">
            Ollama가 설치되어 있지 않습니다. 다운로드 후 설치하고 다시 새로고침하세요.
          </p>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-amber-300/30 bg-amber-300/14 px-3 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/20"
            onClick={handleDownload}
          >
            <Download size={15} />
            Download Ollama
          </button>
        </div>
      ) : null}

      {status?.installed && !status.connected ? (
        <div className="grid gap-2 rounded-md border border-cyan-300/15 bg-cyan-400/10 p-3">
          <p className="text-xs leading-5 text-cyan-100">
            Ollama는 설치되어 있지만 서버 연결이 되지 않았습니다. Ollama 앱을 실행하거나 터미널에서
            <span className="mx-1 rounded bg-slate-950 px-1.5 py-0.5 font-mono">ollama serve</span>
            를 실행하세요.
          </p>
        </div>
      ) : null}

      {status?.connected ? (
        <div className="grid gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Play size={14} />
            Local models
          </div>
          <div className="grid gap-2">
            {recommendedModels.map((model) => {
              const installed = localModelNames.has(model);
              const isSelected = model === selectedModel;
              return (
                <div
                  key={model}
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-700/70 bg-slate-950/60 px-3 py-2"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-200">{model}</div>
                    <div className="text-[11px] text-slate-500">
                      {installed ? 'installed' : 'missing'}{isSelected ? ' / selected' : ''}
                    </div>
                  </div>
                  {!installed ? (
                    <button
                      type="button"
                      className="h-8 rounded-md border border-cyan-300/20 bg-cyan-400/10 px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/18 disabled:opacity-60"
                      onClick={() => handlePull(model)}
                      disabled={Boolean(pullingModel)}
                    >
                      {pullingModel === model ? 'Pulling...' : 'Pull'}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </div>
      ) : null}
    </section>
  );
}
