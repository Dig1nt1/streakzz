import type React from "react";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Plus, Loader2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { StreakChain } from "./StreakChain";
import { Post } from "./PostCard";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface CreatePostDialogProps {
  accessToken?: string;
  onCreatePost: (post: {
    category: string;
    streakCount: number;
    title: string;
    description: string;
    imageUrl: string;
    mediaType?: 'image' | 'video';
  }) => void;
  onAddToStreak?: (streakId: string, dayData: {
    description: string;
    imageUrl: string;
    mediaType?: 'image' | 'video';
  }) => void;
  userPosts?: Post[];
  currentUserId?: string;
  /** Replaces the default "Post Streak" button, e.g. with an icon in the side rail. */
  trigger?: React.ReactNode;
}

export function CreatePostDialog({ accessToken, onCreatePost, onAddToStreak, userPosts = [], currentUserId, trigger }: CreatePostDialogProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [streakCount, setStreakCount] = useState("1");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedStreakId, setSelectedStreakId] = useState<string>("");

  // Get user's active parent streaks
  const activeStreaks = useMemo(() => {
    return userPosts.filter(post =>
      post.userId === currentUserId &&
      !post.isClosed &&
      (post.isParentStreak || !post.streakDays)
    );
  }, [userPosts, currentUserId]);

  const handleSubmit = () => {
    if (!isUploading && category && streakCount && title && description && imageUrl) {
      onCreatePost({
        category,
        streakCount: parseInt(streakCount),
        title,
        description,
        imageUrl,
        mediaType,
      });
      
      resetForm();
    }
  };

  const handleAddToStreak = () => {
    if (!isUploading && selectedStreakId && description && imageUrl && onAddToStreak) {
      onAddToStreak(selectedStreakId, {
        description,
        imageUrl,
        mediaType,
      });
      
      resetForm();
    }
  };

  const resetForm = () => {
    setCategory("");
    setStreakCount("1");
    setTitle("");
    setDescription("");
    setImageUrl("");
    setMediaType('image');
    setSelectedStreakId("");
    setOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) uploadFile(file);
  };

  const uploadFile = async (file: File) => {

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      toast.error('Please select an image or video file');
      return;
    }

    // Validate file size (max 50MB for videos, 5MB for images)
    const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(isVideo ? 'Video size must be less than 50MB' : 'Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Upload to Supabase Storage via server
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/upload-media`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken || publicAnonKey}`,
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
      // Set url and type together so they never disagree
      setImageUrl(url);
      setMediaType(isVideo ? 'video' : 'image');
    } catch (error) {
      console.error('Upload error:', error);
      setImageUrl("");
      setMediaType('image');
      toast.error(isVideo ? 'Failed to upload video' : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const categories = [
    { value: "Fitness", label: "Fitness" },
    { value: "Gaming", label: "Gaming" },
    { value: "Work", label: "Work & Productivity" },
    { value: "Hobbies", label: "Hobbies" },
    { value: "Goals", label: "Personal Growth" },
    { value: "Social", label: "Social & Fun" },
    { value: "Finance", label: "Finance & Lifestyle" },
  ];
  const nextDayOf = (streak: Post) => {
    const days = streak.streakDays || [];
    return (days.length ? Math.max(...days.map(d => d.dayNumber || 0)) : streak.streakCount || 0) + 1;
  };
  const selectedStreak = activeStreaks.find(s => s.id === selectedStreakId);
  const fieldClass = "h-11 rounded-xl border-transparent bg-raised px-3.5 text-[15px] text-white placeholder:text-faint focus-visible:border-[#6a6460]";
  const areaClass = "min-h-[96px] rounded-xl border-transparent bg-raised px-3.5 py-3 text-[15px] leading-[22px] text-white placeholder:text-faint focus-visible:border-[#6a6460] focus-visible:ring-0";

  // The photo or video for this day: a drop area that becomes the preview once uploaded
  const mediaPicker = (id: string) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm text-white">Photo or video</Label>
      <label
        htmlFor={id}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file && !isUploading) uploadFile(file); }}
        className={`group relative flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-[16px] bg-raised transition-colors [&:has(:focus-visible)]:ring-2 [&:has(:focus-visible)]:ring-white ${imageUrl ? "aspect-[16/10]" : "h-36 border border-dashed border-[#4a4643] hover:border-[#8a837d]"}`}
      >
        {imageUrl ? (
          mediaType === "video"
            ? <video src={imageUrl} className="h-full w-full object-cover" muted playsInline />
            : <img src={imageUrl} alt="Selected photo" className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 px-6 text-center">
            <span className="mb-1 grid h-10 w-10 place-items-center rounded-full bg-[#363330] text-white">
              <ImagePlus className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-white">Add a photo or video</span>
            <span className="text-xs text-faint">Click or drop a file here</span>
          </span>
        )}
        {imageUrl && !isUploading && (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white">Replace</span>
        )}
        {isUploading && (
          <span className="absolute inset-0 grid place-items-center bg-black/60 text-sm font-medium text-white">
            <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Uploading {mediaType}…</span>
          </span>
        )}
        <input
          id={id}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="sr-only"
          aria-describedby={`${id}-limit`}
        />
      </label>
      <div className="flex items-center justify-between">
        <p id={`${id}-limit`} className="text-xs text-faint">Images up to 5 MB, videos up to 50 MB</p>
        {imageUrl && !isUploading && (
          <button type="button" onClick={() => { setImageUrl(""); setMediaType("image"); }} className="inline-flex items-center gap-1 text-xs font-medium text-muted-text hover:text-white">
            <X className="h-3.5 w-3.5" />Remove
          </button>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Post Streak
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]">
        <Tabs defaultValue="new" className="flex min-h-0 flex-1 flex-col gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 text-left">
            <DialogTitle className="text-xl font-semibold">Share your streak</DialogTitle>
            <DialogDescription className="text-muted-text">Start something new, or log today on a streak you're keeping.</DialogDescription>
            <TabsList className="mt-4 grid h-10 w-full grid-cols-2 bg-ground">
              <TabsTrigger value="new">New streak</TabsTrigger>
              <TabsTrigger value="continue">Add a day</TabsTrigger>
            </TabsList>
          </DialogHeader>

          {/* New streak */}
          <TabsContent value="new" className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-6">
              {mediaPicker("new-media")}

              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm text-white">Title</Label>
                <Input id="title" placeholder="e.g. Morning Meditation Journey" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className={fieldClass} />
              </div>

              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium text-white">Category</legend>
                <div className="flex flex-wrap gap-2" role="radiogroup">
                  {categories.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      role="radio"
                      aria-checked={category === c.value}
                      onClick={() => setCategory(c.value)}
                      className={`h-9 rounded-full px-3.5 text-sm font-medium transition-colors ${category === c.value ? "bg-white text-black" : "bg-raised text-[#d6d3cf] hover:bg-[#363330] hover:text-white"}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm text-white">Day 1: what did you do today?</Label>
                <Textarea id="description" placeholder="Ran 3 km before work, felt great." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={areaClass} />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-rule px-6 py-4">
              <span className="hidden text-xs text-faint sm:block">Starts at day 1</span>
              <div className="ml-auto flex gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)} className="text-muted-text">Cancel</Button>
                <Button onClick={handleSubmit} disabled={isUploading || !category || !streakCount || !title || !description || !imageUrl}>
                  Create streak
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Add a day to an active streak */}
          <TabsContent value="continue" className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-6">
              {activeStreaks.length === 0 ? (
                <div className="rounded-[16px] bg-raised px-5 py-8 text-center">
                  <p className="text-sm font-medium text-white">No active streaks yet</p>
                  <p className="mt-1 text-sm text-muted-text">Start one in New streak, then come back here each day.</p>
                </div>
              ) : (
                <>
                  <fieldset className="space-y-2">
                    <legend className="mb-2 text-sm font-medium text-white">Which streak?</legend>
                    <div className="max-h-[240px] space-y-2 overflow-y-auto" role="radiogroup">
                      {activeStreaks.map(streak => {
                        const selected = selectedStreakId === streak.id;
                        const next = nextDayOf(streak);
                        return (
                          <button
                            key={streak.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setSelectedStreakId(streak.id)}
                            className={`flex w-full items-center gap-3 rounded-[14px] border-[1.5px] p-2.5 text-left transition-colors ${selected ? "border-white bg-raised" : "border-transparent bg-raised hover:bg-[#363330]"}`}
                          >
                            <img src={streak.streakDays?.[0]?.imageUrl || streak.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-[10px] object-cover" />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline justify-between gap-2">
                                <span className="truncate text-sm font-semibold text-white">{streak.title}</span>
                                <span className="shrink-0 text-xs tabular-nums text-faint">Day {next - 1}</span>
                              </span>
                              <StreakChain days={selected ? next : next - 1} activeIndex={selected ? next - 1 : undefined} className="mt-2" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  {selectedStreak && (
                    <>
                      {mediaPicker("continue-media")}
                      <div className="space-y-2">
                        <Label htmlFor="continue-description" className="text-sm text-white">Day {nextDayOf(selectedStreak)}: what did you do today?</Label>
                        <Textarea id="continue-description" placeholder="What did you accomplish today?" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={areaClass} />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-rule px-6 py-4">
              <span className="hidden text-xs text-faint sm:block">
                {selectedStreak ? `Adds day ${nextDayOf(selectedStreak)} to ${selectedStreak.title}` : "Pick a streak to continue"}
              </span>
              <div className="ml-auto flex gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)} className="text-muted-text">Cancel</Button>
                <Button onClick={handleAddToStreak} disabled={isUploading || !selectedStreakId || !description || !imageUrl}>
                  {selectedStreak ? `Add day ${nextDayOf(selectedStreak)}` : "Add day"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
