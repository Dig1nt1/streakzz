import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Edit2, Loader2, X, Plus, Camera, Link as LinkIcon, Globe, Lock } from "lucide-react";
import { toast } from "sonner";
import { projectId } from "../utils/supabase/info";

interface EditProfileDialogProps {
  user: {
    id: string;
    name: string;
    avatar: string;
    bio: string;
    isPublic?: boolean;
    websiteLinks?: string[];
  };
  onUpdateProfile: (updates: {
    name: string;
    avatar: string;
    bio: string;
    isPublic: boolean;
    websiteLinks: string[];
  }) => void;
  /** Signed-in user's access token; when present the avatar is uploaded via /upload-media instead of inlined as a data URL. */
  accessToken?: string;
}

export function EditProfileDialog({ user, onUpdateProfile, accessToken }: EditProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [avatar, setAvatar] = useState(user.avatar);
  const [isPublic, setIsPublic] = useState(user.isPublic ?? true);
  const [websiteLinks, setWebsiteLinks] = useState<string[]>(
    user.websiteLinks && user.websiteLinks.length > 0 ? user.websiteLinks : [""]
  );
  const [isUploading, setIsUploading] = useState(false);

  const resetFromUser = () => {
    setName(user.name);
    setBio(user.bio);
    setAvatar(user.avatar);
    setIsPublic(user.isPublic ?? true);
    setWebsiteLinks(user.websiteLinks && user.websiteLinks.length > 0 ? user.websiteLinks : [""]);
  };

  const handleOpen = () => {
    // Re-initialise from the latest profile every time the dialog opens
    resetFromUser();
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    // Filter out empty links
    const filteredLinks = websiteLinks.filter(link => link.trim() !== "");

    onUpdateProfile({
      name: name.trim(),
      avatar,
      bio: bio.trim(),
      isPublic,
      websiteLinks: filteredLinks,
    });

    setOpen(false);
  };

  const handleCancel = () => {
    // Reset to original values
    resetFromUser();
    setOpen(false);
  };

  const handleAvatarUrlChange = (url: string) => {
    setAvatar(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);

    if (accessToken) {
      // Upload to storage via server (same request shape as CreatePostDialog)
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/upload-media`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error('Failed to upload file');
        }

        const { url } = await response.json();
        if (!url) {
          throw new Error('Upload response missing url');
        }
        setAvatar(url);
      } catch (error) {
        console.error('Avatar upload error:', error);
        toast.error('Failed to upload image');
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
      return;
    }

    // No access token: fall back to a data URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result as string);
      setIsUploading(false);
      
    };
    reader.onerror = () => {
      toast.error('Failed to upload image');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...websiteLinks];
    newLinks[index] = value;
    setWebsiteLinks(newLinks);
  };

  const addLink = () => {
    if (websiteLinks.length < 5) {
      setWebsiteLinks([...websiteLinks, ""]);
    } else {
      toast.error("Maximum 5 links allowed");
    }
  };

  const removeLink = (index: number) => {
    if (websiteLinks.length > 1) {
      const newLinks = websiteLinks.filter((_, i) => i !== index);
      setWebsiteLinks(newLinks);
    } else {
      // If it's the last link, just clear it
      setWebsiteLinks([""]);
    }
  };

  const fieldClass =
    "h-11 rounded-xl border-transparent bg-raised px-3.5 text-[15px] text-white placeholder:text-faint focus-visible:border-[#6a6460]";

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? handleOpen() : handleCancel())}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Edit2 className="h-4 w-4" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[520px]">
        <DialogHeader className="px-6 pt-6 pb-4 text-left">
          <DialogTitle className="text-xl font-semibold">Edit profile</DialogTitle>
          <DialogDescription className="text-muted-text">
            Click your photo to change it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-6">
          {/* The photo is the upload button */}
          <div className="flex justify-center pt-1">
            <label
              className="group relative h-24 w-24 cursor-pointer rounded-full [&:has(:focus-visible)]:ring-2 [&:has(:focus-visible)]:ring-white [&:has(:focus-visible)]:ring-offset-4 [&:has(:focus-visible)]:ring-offset-surface"
              title="Change photo (images up to 5 MB)"
            >
              <img src={avatar} alt="" className="h-full w-full rounded-full object-cover" />
              <span className="absolute inset-0 grid place-items-center rounded-full bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-6 w-6 text-white" />
              </span>
              {isUploading && (
                <span className="absolute inset-0 grid place-items-center rounded-full bg-black/55">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </span>
              )}
              <span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full border-[3px] border-surface bg-white text-black">
                <Camera className="h-3.5 w-3.5" />
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="sr-only"
                aria-label="Change profile photo (images up to 5 MB)"
              />
            </label>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="edit-name" className="text-sm text-white">Name</Label>
              <span className="text-xs text-faint tabular-nums">{name.length}/50</span>
            </div>
            <Input
              id="edit-name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              className={fieldClass}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="edit-bio" className="text-sm text-white">Bio</Label>
              <span className={`text-xs tabular-nums ${bio.length >= 190 ? "text-flame" : "text-faint"}`}>{bio.length}/200</span>
            </div>
            <Textarea
              id="edit-bio"
              placeholder="What are you building a streak in?"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={200}
              className="min-h-[88px] rounded-xl border-transparent bg-raised px-3.5 py-3 text-[15px] leading-[22px] text-white placeholder:text-faint focus-visible:border-[#6a6460] focus-visible:ring-0"
            />
          </div>

          {/* Website Links */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label className="text-sm text-white">Links</Label>
              <span className="text-xs text-faint tabular-nums">{websiteLinks.length} of 5</span>
            </div>
            <div className="space-y-2">
              {websiteLinks.map((link, index) => (
                <div key={index} className="relative">
                  <LinkIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                  <Input
                    type="url"
                    placeholder="yourwebsite.com"
                    value={link}
                    onChange={(e) => handleLinkChange(index, e.target.value)}
                    aria-label={`Link ${index + 1}`}
                    className={`${fieldClass} pl-10 pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => removeLink(index)}
                    aria-label={`Remove link ${index + 1}`}
                    className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-faint transition-colors hover:bg-[#363330] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            {websiteLinks.length < 5 && (
              <button
                type="button"
                onClick={addLink}
                className="inline-flex items-center gap-1.5 rounded-full px-1 py-1 text-sm font-medium text-muted-text transition-colors hover:text-white"
              >
                <Plus className="h-4 w-4" />
                Add a link
              </button>
            )}
          </div>

          {/* Visibility */}
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium text-white">Who can see your profile</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: true, label: "Public", hint: "Anyone on Streakz", Icon: Globe },
                { value: false, label: "Private", hint: "Hidden from public view", Icon: Lock },
              ].map(({ value, label, hint, Icon }) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={isPublic === value}
                  onClick={() => setIsPublic(value)}
                  className={`rounded-xl border-[1.5px] p-3 text-left transition-colors ${
                    isPublic === value ? "border-white bg-raised" : "border-transparent bg-raised/60 hover:bg-raised"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Icon className="h-4 w-4" />
                    {label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-text">{hint}</span>
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="flex justify-end gap-2 border-t border-rule px-6 py-4">
          <Button variant="ghost" onClick={handleCancel} className="text-muted-text">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isUploading || !name.trim()}>
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
