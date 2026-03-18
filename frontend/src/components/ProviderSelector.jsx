import { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, RefreshCw } from 'lucide-react';

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
  const activeProvider = providers.find((item) => item.id === provider);
  const models = activeProvider?.modelOptions?.length
    ? activeProvider.modelOptions
    : (activeProvider?.models || []).map((item) => ({ id: item, label: item }));
  const tone = providerTone(activeProvider);
  const StatusIcon = tone.Icon;

  async function handleAuthSubmit(event) {
    event.preventDefault();
    if (!activeProvider?.auth || !credentialValue.trim()) {
      return;
    }

    await onProviderAuth(activeProvider.id, { apiKey: credentialValue.trim() });
    setCredentialValue('');
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
