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
      <DialogContent className="sm:max-w-[500px] bg-surface border-rule text-white">
        <DialogHeader>
          <DialogTitle>Create Custom Sync Room</DialogTitle>
          <DialogDescription className="text-muted-text">
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
              className="bg-surface border-rule text-white"
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
              className="bg-surface border-rule text-white"
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
              className="bg-surface border-rule text-white resize-none"
              rows={3}
              maxLength={150}
            />
          </div>

          {/* Room Type */}
          <div className="space-y-3">
            <Label>Room Type</Label>
            <RadioGroup value={roomType} onValueChange={(value) => setRoomType(value as "public" | "private")}>
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-rule bg-raised">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Unlock className="h-4 w-4 text-positive" />
                    <div>
                      <p className="text-white">Public</p>
                      <p className="text-xs text-muted-text">Anyone can join this room</p>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-lg border border-rule bg-raised">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-white" />
                    <div>
                      <p className="text-white">Private</p>
                      <p className="text-xs text-muted-text">Requires password to join</p>
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
                className="bg-surface border-rule text-white"
                maxLength={50}
              />
              <p className="text-xs text-muted-text">
                Share this password with people you want to invite
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-surface border-rule text-white hover:bg-raised"
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
            className="bg-white text-black hover:bg-[#e6e3df]"
          >
            {isCreating ? "Creating..." : "Create Room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
