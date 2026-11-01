import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";
import { Button } from "./ui/button";

const DISMISS_KEY = "streakz-install-dismissed-at";
const DISMISS_DAYS = 30;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isInstalled = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const wasDismissedRecently = () => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86400000;
  } catch {
    return false;
  }
};

// Offers to install Streakz on the home screen: the browser's own prompt where it exists
// (Android, desktop Chrome and Edge), and the Share > Add to Home Screen steps on iPhone and iPad.
export function InstallAppBanner({ className = "" }: { className?: string }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSSteps, setShowIOSSteps] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isInstalled() || wasDismissedRecently()) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setHidden(false);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (isIOS()) {
      setShowIOSSteps(true);
      setHidden(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Private mode: the banner simply comes back next visit
    }
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    setPromptEvent(null);
    if (outcome === "accepted") setHidden(true);
  };

  if (hidden || (!promptEvent && !showIOSSteps)) return null;

  return (
    <div
      role="region"
      aria-label="Install the Streakz app"
      className={`flex items-center gap-3 rounded-[16px] bg-raised p-3 shadow-[0_12px_32px_rgba(0,0,0,.45)] ${className}`}
    >
      <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-[12px]" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">Get the Streakz app</p>
        {promptEvent ? (
          <p className="text-xs text-muted-text">Opens full screen from your home screen.</p>
        ) : (
          <p className="text-xs text-muted-text">
            Tap <Share className="inline h-3.5 w-3.5 -translate-y-px" aria-label="Share" /> then “Add to Home Screen”.
          </p>
        )}
      </div>
      {promptEvent && (
        <Button size="sm" onClick={install}>
          Install
        </Button>
      )}
      <button
        onClick={dismiss}
        aria-label="Not now"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-faint hover:bg-[#363330] hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
