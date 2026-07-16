import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Avatar } from "./ui/avatar";
import { Edit2, Upload, Loader2, X, Plus } from "lucide-react";
import { toast } from "sonner@2.0.3";

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
}

export function EditProfileDialog({ user, onUpdateProfile }: EditProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [avatar, setAvatar] = useState(user.avatar);
  const [isPublic, setIsPublic] = useState(user.isPublic ?? true);
  const [websiteLinks, setWebsiteLinks] = useState<string[]>(
    user.websiteLinks && user.websiteLinks.length > 0 ? user.websiteLinks : [""]
  );
  const [isUploading, setIsUploading] = useState(false);

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

    toast.success("Profile updated successfully!");
    setOpen(false);
  };

  const handleCancel = () => {
    // Reset to original values
    setName(user.name);
    setBio(user.bio);
    setAvatar(user.avatar);
    setIsPublic(user.isPublic ?? true);
    setWebsiteLinks(user.websiteLinks && user.websiteLinks.length > 0 ? user.websiteLinks : [""]);
    setOpen(false);
  };

  const handleAvatarUrlChange = (url: string) => {
    setAvatar(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Convert to data URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result as string);
      setIsUploading(false);
      toast.success('Image uploaded successfully!');
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Edit2 className="h-4 w-4" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-black/90 border-white/10 text-white backdrop-blur-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information and privacy settings
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <img src={avatar} alt={name} className="object-cover" />
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <label className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="cursor-pointer file:mr-4 file:px-2 file:py-1 file:rounded-md file:border-0 file:bg-orange-500 file:text-white file:cursor-pointer hover:file:bg-orange-600 text-[rgb(0,0,0)]"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-300">
                  {isUploading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Uploading image...
                    </span>
                  ) : (
                    'Upload an image (max 5MB)'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50} className="text-[rgb(0,0,0)]"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="edit-bio">Bio</Label>
            <Textarea
              id="edit-bio"
              placeholder="Tell us about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={200} className="text-[rgb(0,0,0)]"
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/200
            </p>
          </div>

          {/* Website Links */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Website Links</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addLink}
                className="h-8 gap-1 text-orange-400 hover:text-orange-300 hover:bg-white/5"
                disabled={websiteLinks.length >= 5}
              >
                <Plus className="h-4 w-4" />
                Add Link
              </Button>
            </div>
            <div className="space-y-2">
              {websiteLinks.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://yourwebsite.com"
                    value={link}
                    onChange={(e) => handleLinkChange(index, e.target.value)}
                    className="text-[rgb(0,0,0)] flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLink(index)}
                    className="h-10 w-10 text-gray-400 hover:text-red-400 hover:bg-white/5"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-300">
              Add up to 5 links (website, portfolio, or social media)
            </p>
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4 bg-[rgba(255,255,255,0.05)]">
            <div className="space-y-0.5">
              <Label htmlFor="privacy-toggle" className="cursor-pointer text-white">
                Profile Status
              </Label>
              <p className="text-sm text-gray-300">
                {isPublic 
                  ? "Your profile is visible to everyone" 
                  : "Your profile is private"}
              </p>
            </div>
            <Switch
              id="privacy-toggle"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
