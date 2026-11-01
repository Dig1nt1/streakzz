import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Lock } from "lucide-react";

interface JoinPrivateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomName: string;
  onJoin: (password: string) => Promise<void>;
}

export function JoinPrivateRoomDialog({
  open,
  onOpenChange,
  roomName,
  onJoin,
}: JoinPrivateRoomDialogProps) {
  const [password, setPassword] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Input doesn't forward refs (React 18), so focus it through its wrapper
  const fieldRef = useRef<HTMLDivElement>(null);

  // Clear the typed password and any error whenever the dialog closes
  useEffect(() => {
    if (!open) {
      setPassword("");
      setError(null);
    }
  }, [open]);

  const handleJoin = async () => {
    if (!password.trim() || isJoining) {
      return;
    }

    setIsJoining(true);
    setError(null);
    try {
      await onJoin(password.trim());
      setPassword("");
      onOpenChange(false);
    } catch (err: any) {
      // Keep the dialog open so the user can retry
      setError(err?.message === "Invalid password" ? "Wrong password" : err?.message || "Failed to join room");
      setTimeout(() => {
        const input = fieldRef.current?.querySelector("input");
        input?.focus();
        input?.select();
      }, 0);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-surface border-rule text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-white" />
            Private Room
          </DialogTitle>
          <DialogDescription className="text-muted-text">
            Enter password to join "{roomName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div ref={fieldRef} className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter room password"
              className="bg-surface border-rule text-white"
              onKeyDown={(e) => {
                if (e.key === "Enter" && password.trim()) {
                  handleJoin();
                }
              }}
              autoFocus
              aria-invalid={!!error}
            />
            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setPassword("");
              onOpenChange(false);
            }}
            className="bg-surface border-rule text-white hover:bg-raised"
          >
            Cancel
          </Button>
          <Button
            onClick={handleJoin}
            disabled={isJoining || !password.trim()}
            className="bg-white text-black hover:bg-[#e6e3df]"
          >
            {isJoining ? "Joining..." : "Join Room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
