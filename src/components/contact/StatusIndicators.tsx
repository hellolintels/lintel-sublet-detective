
import { AlertCircle, Loader2 } from "lucide-react";

interface SetupStatusProps {
  isSettingUp: boolean;
  setupComplete: boolean;
}

export function SetupStatusIndicator({ isSettingUp, setupComplete }: SetupStatusProps) {
  if (isSettingUp) {
    return (
      <div className="bg-blue-500/10 border border-blue-800 rounded p-3 flex items-center gap-2">
        <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
        <div className="text-blue-500 text-sm">Setting up storage system...</div>
      </div>
    );
  }
  
  if (!setupComplete) {
    return (
      <div className="bg-red-500/10 border border-red-800 rounded p-3 flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="text-red-500 text-sm">Storage setup failed. Please try again later.</div>
      </div>
    );
  }
  
  return null;
}

interface ErrorIndicatorProps {
  error: string | null;
}

export function ErrorIndicator({ error }: ErrorIndicatorProps) {
  if (!error) return null;
  
  return (
    <div className="bg-red-500/10 border border-red-800 rounded p-3 flex items-start gap-2">
      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="text-red-500 text-sm">{error}</div>
    </div>
  );
}
