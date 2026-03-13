import { X } from 'lucide-react';
import ProviderSelector from './ProviderSelector.jsx';

export default function SettingsPanel({
  isOpen,
  providers,
  provider,
  model,
  onProviderChange,
  onModelChange,
  onRefresh,
  isRefreshing,
  onClose
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="window-no-drag fixed inset-0 z-[100] bg-slate-950/48 backdrop-blur-sm">
      <aside className="absolute right-4 top-14 flex max-h-[calc(100vh-68px)] w-[380px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-lg border border-cyan-300/15 bg-slate-950/92 shadow-2xl shadow-cyan-950/30">
        <div className="flex items-center justify-between gap-3 border-b border-cyan-300/10 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-50">AI Settings</h2>
            <p className="text-xs text-slate-400">Provider and model configuration</p>
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-cyan-300/40 hover:bg-slate-800"
            onClick={onClose}
            title="Close settings"
            aria-label="Close settings"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          <ProviderSelector
            providers={providers}
            provider={provider}
            model={model}
            onProviderChange={onProviderChange}
            onModelChange={onModelChange}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
          />
        </div>
      </aside>
    </div>
  );
}
