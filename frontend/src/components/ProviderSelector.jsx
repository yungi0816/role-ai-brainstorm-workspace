import { RefreshCw } from 'lucide-react';

export default function ProviderSelector({
  providers,
  provider,
  model,
  onProviderChange,
  onModelChange,
  onRefresh,
  isRefreshing
}) {
  const activeProvider = providers.find((item) => item.id === provider);
  const models = activeProvider?.models || [];

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
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md border border-cyan-300/10 bg-slate-900/68 px-3 py-2">
        <div className="text-xs text-slate-400">
          <div className="font-medium text-slate-200">{activeProvider?.status || 'unknown'}</div>
          <div>{activeProvider?.configured ? 'configured' : 'not configured'}</div>
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
    </div>
  );
}
