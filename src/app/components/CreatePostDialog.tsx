import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Plus, Upload, Loader2, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
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
}

export function CreatePostDialog({ accessToken, onCreatePost, onAddToStreak, userPosts = [], currentUserId }: CreatePostDialogProps) {
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
    if (category && streakCount && title && description && imageUrl) {
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
    if (selectedStreakId && description && imageUrl && onAddToStreak) {
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
    setStreakCount("");
    setTitle("");
    setDescription("");
    setImageUrl("");
    setMediaType('image');
    setSelectedStreakId("");
    setOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    setMediaType(isVideo ? 'video' : 'image');

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
      setImageUrl(url);
      toast.success(isVideo ? 'Video uploaded successfully!' : 'Image uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(isVideo ? 'Failed to upload video' : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
          <Plus className="h-4 w-4" />
          Post Streak
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-black/90 border-white/10 text-white backdrop-blur-md">
        <DialogHeader>
          <DialogTitle>Share Your Streak</DialogTitle>
          <DialogDescription>
            Create a new streak or add to an existing one
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/10">
            <TabsTrigger value="new">New Streak</TabsTrigger>
            <TabsTrigger value="continue">Continue Streak</TabsTrigger>
          </TabsList>

          {/* New Streak Tab */}
          <TabsContent value="new" className="space-y-4 py-4">
            <div className="space-y-2 bg-transparent">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category"
                   className="bg-[rgba(255,255,255,0.1)] text-white border border-white/20 rounded-md">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gaming">Gaming</SelectItem>
                  <SelectItem value="Work">Work & Productivity</SelectItem>
                  <SelectItem value="Fitness">Fitness</SelectItem>
                  <SelectItem value="Hobbies">Hobbies</SelectItem>
                  <SelectItem value="Goals">Personal Growth</SelectItem>
                  <SelectItem value="Social">Social & Fun</SelectItem>
                  <SelectItem value="Finance">Finance & Lifestyle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="streak">Starting Day</Label>
              <Input
                id="streak"
                type="number"
                value={streakCount}
                readOnly
                className="text-black bg-gray-100 cursor-not-allowed focus:ring-0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Streak Title</Label>
              <Input
                id="title"
                placeholder="e.g., Morning Meditation Journey"
                value={title}
                onChange={(e) => setTitle(e.target.value)} 
                className="text-[rgb(0,0,0)]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Day 1 Description</Label>
              <Textarea
                id="description"
                placeholder="What did you accomplish today?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3} 
                className="text-[rgb(0,0,0)]"
              />
            </div>

            <div className="space-y-2 bg-[rgba(217,213,213,0)]">
              <Label htmlFor="image">Media</Label>
              <div>
                <label className="block">
                  <Input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="cursor-pointer file:mr-4 file:px-2 file:py-1 file:rounded-md file:border-0 file:bg-orange-500 file:text-white file:cursor-pointer hover:file:bg-orange-600 text-[rgb(0,0,0)]"
                  />
                </label>
                <p className="text-xs text-gray-300 mt-2">
                  {isUploading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Uploading {mediaType}...
                    </span>
                  ) : (
                    'Upload an image (max 5MB) or video (max 50MB)'
                  )}
                </p>
              </div>
              {imageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border border-white/10 bg-black">
                  {mediaType === 'video' ? (
                    <video src={imageUrl} className="w-full h-48 object-contain" controls />
                  ) : (
                    <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover" />
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!category || !streakCount || !title || !description || !imageUrl}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                Create Streak
              </Button>
            </div>
          </TabsContent>

          {/* Continue Streak Tab */}
          <TabsContent value="continue" className="space-y-4 py-4">
            {activeStreaks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">You don't have any active streaks yet.</p>
                <p className="text-gray-400 text-sm mt-2">Create a new streak to get started!</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Select Streak</Label>
                  <div className="grid gap-2 max-h-[200px] overflow-y-auto">
                    {activeStreaks.map((streak) => (
                      <Card
                        key={streak.id}
                        onClick={() => setSelectedStreakId(streak.id)}
                        className={`p-3 cursor-pointer transition-all ${
                          selectedStreakId === streak.id
                            ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img 
                            src={streak.streakDays?.[0]?.imageUrl || streak.imageUrl} 
                            alt={streak.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1">
                            <h4 className="text-white text-sm">{streak.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {streak.category}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                Day {streak.streakDays?.length || 1}
                              </span>
                            </div>
                          </div>
                          {selectedStreakId === streak.id && (
                            <div className="h-2 w-2 bg-orange-500 rounded-full" />
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {selectedStreakId && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="continue-description">
                        Day {(activeStreaks.find(s => s.id === selectedStreakId)?.streakDays?.length || 0) + 1} Description
                      </Label>
                      <Textarea
                        id="continue-description"
                        placeholder="What did you accomplish today?"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="text-[rgb(0,0,0)]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="continue-media">Media</Label>
                      <div>
                        <label className="block">
                          <Input
                            type="file"
                            accept="image/*,video/*"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                            className="cursor-pointer file:mr-4 file:px-2 file:py-1 file:rounded-md file:border-0 file:bg-orange-500 file:text-white file:cursor-pointer hover:file:bg-orange-600 text-[rgb(0,0,0)]"
                          />
                        </label>
                        <p className="text-xs text-gray-300 mt-2">
                          {isUploading ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Uploading {mediaType}...
                            </span>
                          ) : (
                            'Upload an image (max 5MB) or video (max 50MB)'
                          )}
                        </p>
                      </div>
                      {imageUrl && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-white/10 bg-black">
                          {mediaType === 'video' ? (
                            <video src={imageUrl} className="w-full h-48 object-contain" controls />
                          ) : (
                            <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover" />
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={handleAddToStreak}
                    disabled={!selectedStreakId || !description || !imageUrl}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Day
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
