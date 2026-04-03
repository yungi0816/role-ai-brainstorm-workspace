import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, RefreshCw, Terminal, Trash2 } from 'lucide-react';
import {
  clearProviderLogs,
  fetchProviderDiagnostics,
  fetchProviderLogs,
  testProvider as runProviderTest
} from '../api/chatApi.js';

function providerTone(provider) {
  if (!provider) {
    return {
      label: 'loading',
      className: 'border-slate-700 bg-slate-900/68 text-slate-300',
      Icon: RefreshCw
    };
  }

  if (provider.ready) {
    return {
      label: 'ready',
      className: 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100',
      Icon: CheckCircle2
    };
  }

  if (provider.status === 'runtime_managed') {
    return {
      label: 'runtime check required',
      className: 'border-amber-300/25 bg-amber-400/10 text-amber-100',
      Icon: AlertCircle
    };
  }

  if (provider.status === 'planned') {
    return {
      label: 'planned integration',
      className: 'border-amber-300/25 bg-amber-400/10 text-amber-100',
      Icon: AlertCircle
    };
  }

  if (!provider.configured || provider.status === 'needs_auth') {
    return {
      label: 'authentication required',
      className: 'border-rose-300/25 bg-rose-400/10 text-rose-100',
      Icon: AlertCircle
    };
  }

  return {
    label: provider.status || 'not ready',
    className: 'border-amber-300/25 bg-amber-400/10 text-amber-100',
    Icon: AlertCircle
  };
}

function checkClassName(status) {
  if (status === 'pass') {
    return 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100';
  }

  if (status === 'fail') {
    return 'border-rose-300/25 bg-rose-400/10 text-rose-100';
  }

  if (status === 'warn') {
    return 'border-amber-300/25 bg-amber-400/10 text-amber-100';
  }

  return 'border-slate-700 bg-slate-900/70 text-slate-300';
}

function summaryClassName(state) {
  if (state === 'ready') {
    return 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100';
  }

  if (state === 'error') {
    return 'border-rose-300/25 bg-rose-400/10 text-rose-100';
  }

  return 'border-amber-300/25 bg-amber-400/10 text-amber-100';
}

function logClassName(level) {
  if (level === 'error') {
    return 'border-rose-300/20 bg-rose-400/10 text-rose-100';
  }

  if (level === 'warn') {
    return 'border-amber-300/20 bg-amber-400/10 text-amber-100';
  }

  return 'border-slate-700 bg-slate-950/78 text-slate-300';
}

function formatCheckedAt(value) {
  if (!value) {
    return 'not checked';
  }

  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export default function ProviderSelector({
  providers,
  provider,
  model,
  onProviderChange,
  onModelChange,
  onRefresh,
  isRefreshing,
  onProviderAuth,
  isAuthenticating
}) {
  const [credentialValue, setCredentialValue] = useState('');
  const [fieldValues, setFieldValues] = useState({});
  const [diagnostics, setDiagnostics] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [providerActionError, setProviderActionError] = useState(null);
  const activeProvider = providers.find((item) => item.id === provider);

  const models = activeProvider?.modelOptions?.length
    ? activeProvider.modelOptions
    : (activeProvider?.models || []).map((item) => ({ id: item, label: item }));
  const tone = providerTone(activeProvider);
  const StatusIcon = tone.Icon;

  useEffect(() => {
    setDiagnostics(null);
    setTestResult(null);
    setProviderActionError(null);
    setLogs([]);
    if (activeProvider) {
      loadProviderLogs(activeProvider.id);
    }
  }, [activeProvider?.id, model]);

  async function loadProviderLogs(providerId = activeProvider?.id) {
    if (!providerId) {
      return;
    }

    setIsLoadingLogs(true);
    try {
      setLogs(await fetchProviderLogs(providerId));
    } catch (error) {
      setProviderActionError(error.response?.data?.error?.message || error.message);
    } finally {
      setIsLoadingLogs(false);
    }
  }

  async function handleClearProviderLogs() {
    if (!activeProvider) {
      return;
    }

    setIsLoadingLogs(true);
    try {
      setLogs(await clearProviderLogs(activeProvider.id));
    } catch (error) {
      setProviderActionError(error.response?.data?.error?.message || error.message);
    } finally {
      setIsLoadingLogs(false);
    }
  }

  async function handleAuthSubmit(event) {
    if (event) event.preventDefault();
    if (!activeProvider?.auth) {
      return;
    }

    if (activeProvider.auth.type === 'api_key') {
      if (!credentialValue.trim()) return;
      await onProviderAuth(activeProvider.id, { apiKey: credentialValue.trim() });
      setCredentialValue('');
    } else {
      await onProviderAuth(activeProvider.id, fieldValues);
    }
  }

  async function handleDiagnostics() {
    if (!activeProvider) {
      return;
    }

    setIsDiagnosing(true);
    setProviderActionError(null);
    try {
      setDiagnostics(await fetchProviderDiagnostics(activeProvider.id, model));
      await loadProviderLogs(activeProvider.id);
    } catch (error) {
      setProviderActionError(error.response?.data?.error?.message || error.message);
    } finally {
      setIsDiagnosing(false);
    }
  }

  async function handleProviderTest() {
    if (!activeProvider) {
      return;
    }

    setIsTesting(true);
    setProviderActionError(null);
    try {
      const result = await runProviderTest(activeProvider.id, model);
      setTestResult(result);
      await loadProviderLogs(activeProvider.id);
      if (result.provider) {
        await onRefresh();
      }
    } catch (error) {
      setProviderActionError(error.response?.data?.error?.message || error.message);
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm font-medium text-slate-300">
          Provider
          <select
            className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
            value={provider}
            onChange={(event) => onProviderChange(event.target.value)}
          >
            {providers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-300">
          Model
          <select
            className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
            value={model}
            onChange={(event) => onModelChange(event.target.value)}
          >
            {models.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label || item.id}{item.sizeLabel ? ` · ${item.sizeLabel}` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${tone.className}`}>
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <StatusIcon size={16} className={isRefreshing ? 'animate-spin' : ''} />
          <div className="min-w-0">
            <div className="font-semibold">{tone.label}</div>
            <div className="truncate opacity-80">
              {activeProvider?.configured ? 'configured' : 'not configured'} / {activeProvider?.status || 'unknown'}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-slate-300 transition hover:border-cyan-300/40 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh providers"
          aria-label="Refresh providers"
        >
          <RefreshCw size={17} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <section className="grid gap-3 rounded-md border border-cyan-300/10 bg-slate-900/48 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-100">Provider diagnostics</h3>
            <p className="text-[11px] text-slate-500">
              Last check: {formatCheckedAt(diagnostics?.checkedAt || testResult?.testedAt)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="h-8 rounded-md border border-slate-700 bg-slate-950 px-2.5 text-[11px] font-semibold text-slate-300 transition hover:border-cyan-300/40 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleDiagnostics}
              disabled={!activeProvider || isDiagnosing || isTesting}
            >
              {isDiagnosing ? 'Checking...' : 'Run diagnostics'}
            </button>
            <button
              type="button"
              className="h-8 rounded-md border border-cyan-300/20 bg-cyan-400/10 px-2.5 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleProviderTest}
              disabled={!activeProvider || isDiagnosing || isTesting}
            >
              {isTesting ? 'Testing...' : 'Test provider'}
            </button>
          </div>
        </div>

        {diagnostics ? (
          <div className="grid gap-2">
            <div className={`rounded-md border px-3 py-2 text-xs ${summaryClassName(diagnostics.summary?.state)}`}>
              <div className="font-semibold">{diagnostics.summary?.message}</div>
              <div className="mt-0.5 opacity-80">{diagnostics.provider?.label || activeProvider?.label} / {diagnostics.model || model}</div>
            </div>
            <div className="grid gap-1.5">
              {(diagnostics.checks || []).map((check) => (
                <div key={check.id} className={`rounded border px-2.5 py-2 text-[11px] ${checkClassName(check.status)}`}>
                  <div className="font-semibold">{check.label}</div>
                  <div className="mt-0.5 leading-4 opacity-85">{check.message}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {testResult ? (
          <div className={`rounded-md border px-3 py-2 text-xs ${testResult.ok ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100' : 'border-rose-300/25 bg-rose-400/10 text-rose-100'}`}>
            <div className="font-semibold">
              {testResult.ok ? 'Execution test passed' : `Execution test failed: ${testResult.category || 'unknown'}`}
            </div>
            <div className="mt-1 leading-5 opacity-85">{testResult.message}</div>
            <div className="mt-1 text-[11px] opacity-70">{testResult.durationMs} ms / {testResult.model}</div>
          </div>
        ) : null}

        {providerActionError ? (
          <div className="rounded-md border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
            {providerActionError}
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 rounded-md border border-cyan-300/10 bg-slate-900/48 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Terminal size={15} className="text-cyan-200" />
            <div>
              <h3 className="text-xs font-semibold text-slate-100">Provider debug log</h3>
              <p className="text-[11px] text-slate-500">Recent diagnostics, tests, and chat execution events</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-slate-300 transition hover:border-cyan-300/40 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => loadProviderLogs(activeProvider?.id)}
              disabled={!activeProvider || isLoadingLogs}
              title="Refresh debug log"
              aria-label="Refresh debug log"
            >
              <RefreshCw size={14} className={isLoadingLogs ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-300/20 bg-rose-950/30 text-rose-300 transition hover:bg-rose-900/50 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleClearProviderLogs}
              disabled={!activeProvider || isLoadingLogs || logs.length === 0}
              title="Clear debug log"
              aria-label="Clear debug log"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-700 bg-slate-950/60 px-3 py-3 text-xs text-slate-500">
            Run diagnostics, test a provider, or send a message to create log entries.
          </div>
        ) : (
          <div className="max-h-56 overflow-y-auto pr-1">
            <div className="grid gap-2">
              {logs.map((entry) => (
                <article key={entry.id} className={`rounded-md border px-3 py-2 text-[11px] ${logClassName(entry.level)}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{entry.event}</div>
                      <div className="mt-0.5 leading-4 opacity-85">{entry.message}</div>
                    </div>
                    <time className="shrink-0 opacity-60">{formatCheckedAt(entry.createdAt)}</time>
                  </div>
                  {entry.details ? (
                    <pre className="mt-2 max-h-24 overflow-auto rounded bg-slate-950/70 p-2 text-[10px] leading-4 text-slate-300">
                      {JSON.stringify(entry.details, null, 2)}
                    </pre>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      {activeProvider?.auth?.type === 'oauth' ? (
        <form className="grid gap-3 rounded-md border border-cyan-300/10 bg-slate-900/48 p-3" onSubmit={handleAuthSubmit}>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
            <KeyRound size={15} />
            {activeProvider.auth.label}
          </div>
          <p className="text-xs leading-5 text-slate-400">{activeProvider.auth.helpText}</p>

          {activeProvider.auth.fields?.map((field) => (
            <div key={field.id} className="grid gap-1.5">
              <label htmlFor={`field-${field.id}`} className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                {field.label}
              </label>
              <input
                id={`field-${field.id}`}
                className="h-9 rounded border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/10"
                type={field.type || 'text'}
                placeholder={field.placeholder}
                value={fieldValues[field.id] || ''}
                onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                required={field.required}
              />
            </div>
          ))}

          <button
            type="submit"
            className="h-9 rounded-md border border-cyan-300/20 bg-cyan-400/10 px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isAuthenticating}
          >
            {isAuthenticating ? 'Redirecting...' : 'Sign in / Connect'}
          </button>
          {activeProvider.note && (
            <p className="text-[10px] leading-4 text-rose-300/70">{activeProvider.note}</p>
          )}
        </form>
      ) : null}

      {activeProvider?.auth?.type === 'oauth_cli' ? (
        <div className="grid gap-3 rounded-md border border-cyan-300/10 bg-slate-900/48 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
            <KeyRound size={15} />
            {activeProvider.auth.label}
          </div>
          <p className="text-xs leading-5 text-slate-400">{activeProvider.auth.helpText}</p>
          <button
            type="button"
            className="h-9 rounded-md border border-cyan-300/20 bg-cyan-400/10 px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleAuthSubmit}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? 'Starting CLI Login...' : 'Sign in via CLI'}
          </button>
          {activeProvider.note && (
            <p className="text-[10px] leading-4 text-cyan-300/70">{activeProvider.note}</p>
          )}
        </div>
      ) : null}

      {activeProvider?.auth?.type === 'api_key' ? (
        <form className="grid gap-2 rounded-md border border-cyan-300/10 bg-slate-900/48 p-3" onSubmit={handleAuthSubmit}>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
            <KeyRound size={15} />
            {activeProvider.auth.label}
          </div>
          <input
            className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
            type="password"
            value={credentialValue}
            onChange={(event) => setCredentialValue(event.target.value)}
            placeholder={activeProvider.auth.placeholder || 'API key'}
            autoComplete="off"
          />
          <p className="text-xs leading-5 text-slate-400">{activeProvider.auth.helpText}</p>
          <button
            type="submit"
            className="h-9 rounded-md border border-cyan-300/20 bg-cyan-400/10 px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isAuthenticating || !credentialValue.trim()}
          >
            {isAuthenticating ? 'Checking...' : 'Connect provider'}
          </button>
        </form>
      ) : null}

      {activeProvider?.auth?.type === 'planned_oauth' ? (
        <div className="rounded-md border border-amber-300/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
          {activeProvider.auth.helpText}
        </div>
      ) : null}
    </div>
  );
}
