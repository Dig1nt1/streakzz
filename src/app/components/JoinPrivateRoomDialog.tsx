import { useState } from "react";
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

  const handleJoin = async () => {
    if (!password.trim()) {
      return;
    }

    setIsJoining(true);
    try {
      await onJoin(password.trim());
      setPassword("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error joining room:", error);
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
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter room password"
              className="bg-surface border-rule text-white"
              onKeyDown={(e) => {
                if (e.key === "Enter" && password.trim()) {
                  handleJoin();
                }
              }}
              autoFocus
            />
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
