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
import { Textarea } from "./ui/textarea";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Lock, Unlock } from "lucide-react";

interface CreateSyncRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateRoom: (roomData: {
    name: string;
    description: string;
    category: string;
    isPrivate: boolean;
    password?: string;
  }) => Promise<void>;
}

export function CreateSyncRoomDialog({
  open,
  onOpenChange,
  onCreateRoom,
}: CreateSyncRoomDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [roomType, setRoomType] = useState<"public" | "private">("public");
  const [password, setPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !description.trim() || !category.trim()) {
      return;
    }

    if (roomType === "private" && !password.trim()) {
      return;
    }

    setIsCreating(true);
    try {
      await onCreateRoom({
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        isPrivate: roomType === "private",
        password: roomType === "private" ? password.trim() : undefined,
      });

      // Reset form
      setName("");
      setDescription("");
      setCategory("");
      setRoomType("public");
      setPassword("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating room:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-black/95 backdrop-blur-md border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Create Custom Sync Room</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create your own sync room and invite others to work together
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Room Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Room Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning Grind, Late Night Code"
              className="bg-black/40 border-white/10 text-white"
              maxLength={50}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Coding, Writing, Study"
              className="bg-black/40 border-white/10 text-white"
              maxLength={30}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this sync room is for..."
              className="bg-black/40 border-white/10 text-white resize-none"
              rows={3}
              maxLength={150}
            />
          </div>

          {/* Room Type */}
          <div className="space-y-3">
            <Label>Room Type</Label>
            <RadioGroup value={roomType} onValueChange={(value) => setRoomType(value as "public" | "private")}>
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-white/10 bg-black/20">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Unlock className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-white">Public</p>
                      <p className="text-xs text-gray-400">Anyone can join this room</p>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-lg border border-white/10 bg-black/20">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-white">Private</p>
                      <p className="text-xs text-gray-400">Requires password to join</p>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Password (for private rooms) */}
          {roomType === "private" && (
            <div className="space-y-2">
              <Label htmlFor="password">Room Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a password for this room"
                className="bg-black/40 border-white/10 text-white"
                maxLength={50}
              />
              <p className="text-xs text-gray-400">
                Share this password with people you want to invite
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-black/40 border-white/10 text-white hover:bg-black/60"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              isCreating ||
              !name.trim() ||
              !description.trim() ||
              !category.trim() ||
              (roomType === "private" && !password.trim())
            }
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {isCreating ? "Creating..." : "Create Room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
