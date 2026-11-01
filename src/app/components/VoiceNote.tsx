import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { toast } from "sonner";

export interface VoiceRecording {
  blob: Blob;
  duration: number; // seconds
}

export const formatSeconds = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// Records from the microphone as compressed audio (Opus in Chrome and Firefox, AAC in Safari),
// about 32 kbps, so a minute is roughly 250 KB. Calls onLimit when maxSeconds is reached.
export function useVoiceRecorder(maxSeconds: number, onLimit: () => void) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onLimitRef = useRef(onLimit);
  onLimitRef.current = onLimit;

  const releaseMicrophone = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    releaseMicrophone();
  }, []);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("This browser can't record voice messages");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Allow microphone access to send a voice message");
      return;
    }
    const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, { ...(mimeType && { mimeType }), audioBitsPerSecond: 32000 });
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    streamRef.current = stream;
    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    setElapsed(0);
    recorder.start(250);
    setRecording(true);
    timerRef.current = setInterval(() => {
      const seconds = (Date.now() - startedAtRef.current) / 1000;
      setElapsed(seconds);
      if (seconds >= maxSeconds) onLimitRef.current();
    }, 200);
  };

  // keep = false throws the recording away
  const stop = (keep: boolean) =>
    new Promise<VoiceRecording | null>((resolve) => {
      const recorder = recorderRef.current;
      setRecording(false);
      if (!recorder || recorder.state === "inactive") {
        releaseMicrophone();
        resolve(null);
        return;
      }
      const duration = Math.min(maxSeconds, (Date.now() - startedAtRef.current) / 1000);
      recorder.onstop = () => {
        releaseMicrophone();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        recorderRef.current = null;
        resolve(keep && duration >= 0.5 && blob.size > 0 ? { blob, duration } : null);
      };
      recorder.stop();
    });

  return { recording, elapsed, start, stop };
}

// A voice message inside a chat bubble: play/pause, a seekable track and the time
export function VoiceNotePlayer({ src, duration, mine }: { src: string; duration?: number; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [length, setLength] = useState(duration || 0);

  // Recordings from Chrome report an unknown length until played through, so prefer the stored one
  const totalLength = () => {
    const reported = audioRef.current?.duration;
    return reported && Number.isFinite(reported) ? reported : length;
  };

  const toggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      document.querySelectorAll("audio").forEach((other) => other !== audio && other.pause());
      audio.play().catch(() => toast.error("Couldn't play this voice message"));
    } else {
      audio.pause();
    }
  };

  const seek = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const audio = audioRef.current;
    const total = totalLength();
    if (!audio || !total) return;
    const rect = event.currentTarget.getBoundingClientRect();
    audio.currentTime = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) * total;
  };

  const total = totalLength();
  const progress = total ? Math.min(1, position / total) : 0;

  return (
    <div className="flex w-[220px] max-w-full items-center gap-2.5 sm:w-[260px]">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setPosition(0); }}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => { if (Number.isFinite(e.currentTarget.duration)) setLength(e.currentTarget.duration); }}
      />
      <button
        onClick={toggle}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${mine ? "bg-[#0e0d0c] text-white" : "bg-white text-[#0e0d0c]"}`}
      >
        {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
      </button>
      <div
        onClick={seek}
        role="slider"
        aria-label="Voice message position"
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(position)}
        className="flex h-8 flex-1 cursor-pointer items-center"
      >
        <div className={`h-1 w-full overflow-hidden rounded-full ${mine ? "bg-[#0e0d0c]/15" : "bg-white/15"}`}>
          <div className={`h-full rounded-full ${mine ? "bg-[#0e0d0c]" : "bg-white"}`} style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      <span className={`w-9 shrink-0 text-right text-xs tabular-nums ${mine ? "text-[#0e0d0c]/70" : "text-muted-text"}`}>
        {formatSeconds(playing || position > 0 ? position : total)}
      </span>
    </div>
  );
}
