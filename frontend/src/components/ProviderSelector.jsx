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
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Provider
          <select
            className="h-10 min-w-48 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
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

        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Model
          <select
            className="h-10 min-w-56 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
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

      <div className="flex items-center gap-3">
        <div className="text-right text-xs text-slate-500">
          <div className="font-medium text-slate-700">{activeProvider?.status || 'unknown'}</div>
          <div>{activeProvider?.configured ? 'configured' : 'not configured'}</div>
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
