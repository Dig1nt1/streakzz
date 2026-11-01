import { useState, useMemo, useRef, useEffect } from "react";
import { Swords, Heart, MessageCircle, Flame, X, Search, RefreshCw } from "lucide-react";
import { Post } from "./PostCard";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { PostCard } from "./PostCard";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

interface ArenaViewProps {
  posts: Post[];
  currentUserId?: string;
  onLike?: (postId: string) => void;
  onLikeDay?: (postId: string, dayNumber: number) => void;
  onComment?: (postId: string, comment: string) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
  onLikeComment?: (postId: string, commentId: string) => void;
  onDeletePost?: (postId: string) => void;
  onCloseStreak?: (postId: string) => void;
  onReplyToComment?: (postId: string, commentId: string, replyText: string) => void;
  onUserClick?: (userId: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const categories = ["All", "Fitness", "Gaming", "Goals", "Hobbies", "Gambling"];

export function ArenaView({
  posts,
  currentUserId,
  onLike,
  onLikeDay,
  onComment,
  onDeleteComment,
  onLikeComment,
  onDeletePost,
  onCloseStreak,
  onReplyToComment,
  onUserClick,
  onRefresh,
  isRefreshing
}: ArenaViewProps) {
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; avatar: string } | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  // Always get the latest post data from the posts array
  const selectedPost = selectedPostId ? posts.find(p => p.id === selectedPostId) || null : null;

  // Get unique users from posts
  const allUsers = useMemo(() => {
    const userMap = new Map();
    posts.forEach(post => {
      if (!userMap.has(post.userId)) {
        userMap.set(post.userId, {
          id: post.userId,
          name: post.userName,
          avatar: post.userAvatar
        });
      }
    });
    return Array.from(userMap.values());
  }, [posts]);

  // Filter users based on search query
  const matchingUsers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return allUsers.filter(user =>
      (user.alias || user.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5); // Limit to 5 results
  }, [searchQuery, allUsers]);

  // Filter posts based on search, category, and selected user
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      // Filter by selected user
      if (selectedUser && post.userId !== selectedUser.id) {
        return false;
      }

      // Filter by category
      const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
      
      // If there's a selected user, don't filter by search query (already filtered by user)
      if (selectedUser) {
        return matchesCategory;
      }

      // Filter by search query for posts
      const query = searchQuery.toLowerCase();
      const authorAlias = (post as { userAlias?: string }).userAlias;
      const matchesSearch = searchQuery.trim() === "" || 
        post.title.toLowerCase().includes(query) ||
        post.description.toLowerCase().includes(query) ||
        post.category.toLowerCase().includes(query) ||
        (post.userName || "").toLowerCase().includes(query) ||
        (!!authorAlias && authorAlias.toLowerCase().includes(query));

      return matchesSearch && matchesCategory;
    });
  }, [posts, searchQuery, selectedCategory, selectedUser]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowUserDropdown(value.trim().length > 0);
  };

  const handleUserSelect = (user: { id: string; name: string; avatar: string }) => {
    setSelectedUser(user);
    setSearchQuery("");
    setShowUserDropdown(false);
  };

  const handleClearUserFilter = () => {
    setSelectedUser(null);
    setSearchQuery("");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold leading-7 text-white">Arena</h1>
            <p className="mt-0.5 text-sm text-muted-text">Battle for the top spot with your streaks</p>
          </div>
        </div>
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh"
            className="text-muted-text flex-shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>

      {/* Search Bar with Dropdown */}
      <div className="space-y-4">
        <div className="relative" ref={searchContainerRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-text" />
            <Input
              type="text"
              placeholder="Search posts, users, or categories..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchQuery.trim().length > 0 && setShowUserDropdown(true)}
              className="bg-surface border-rule text-white placeholder:text-muted-text pl-10"
            />
          </div>

          {/* User Search Dropdown */}
          {showUserDropdown && matchingUsers.length > 0 && (
            <Card className="absolute z-10 w-full mt-2 border-rule bg-surface overflow-hidden">
              <div className="py-2">
                <div className="px-3 py-2 text-xs text-faint">
                  Users
                </div>
                {matchingUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-raised transition-colors text-left"
                  >
                    <Avatar className="h-8 w-8">
                      <img src={user.avatar} alt={user.name} className="object-cover" />
                    </Avatar>
                    <span className="text-white">{user.alias || user.name}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Selected User Filter Badge */}
        {selectedUser && (
          <div className="flex items-center gap-2">
            <Badge className="bg-[#f2efe9] text-[#0e0d0c] border-0 gap-2 px-3 py-2">
              <Avatar className="h-5 w-5">
                <img src={selectedUser.avatar} alt={selectedUser.name} className="object-cover" />
              </Avatar>
              <span>Showing posts by {selectedUser.alias || selectedUser.name}</span>
              <button
                onClick={handleClearUserFilter}
                className="ml-1 hover:bg-[#363330] rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </div>
        )}
      </div>

      {/* Grid of Posts */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-12 text-muted-text">
          {selectedUser ? `No posts found by ${selectedUser.alias || selectedUser.name}` : "No posts found"}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2">
          {filteredPosts.map((post) => {
            const displayImage = post.streakDays?.[0]?.imageUrl || post.imageUrl;
            const displayMediaType = post.streakDays?.[0]?.mediaType || post.mediaType;
            const totalLikes = post.isParentStreak && post.streakDays && post.streakDays.length > 0
              ? post.streakDays.reduce((sum, day) => sum + (day.likes || 0), 0)
              : (post.likes || 0);
            const totalComments = post.comments.reduce(
              (sum, c) => sum + 1 + (c.replies?.length || 0), 0
            );
            return (
            <div
              key={post.id}
              className="relative group cursor-pointer overflow-hidden bg-raised aspect-square rounded-lg"
              onClick={() => setSelectedPostId(post.id)}
            >
              {displayMediaType === 'video' ? (
                <video
                  src={displayImage}
                  className="w-full h-full object-contain bg-black transition-transform group-hover:scale-110 rounded-lg"
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={displayImage}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110 rounded-lg"
                />
              )}
              
              {/* Multi-day indicator */}
              {post.isParentStreak && post.streakDays && post.streakDays.length > 1 && (
                <div className="absolute top-2 right-2 bg-surface px-2 py-1 rounded-full">
                  <span className="text-white text-xs tabular-nums">{post.streakDays.length} days</span>
                </div>
              )}
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-surface opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4 rounded-lg">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-white">
                    <Heart className="h-6 w-6 fill-white" />
                    <span className="font-semibold">{totalLikes}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <MessageCircle className="h-6 w-6 fill-white" />
                    <span className="font-semibold">{totalComments}</span>
                  </div>
                </div>
                
                {/* Streak Badge */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-flame-tint text-flame">
                  <Flame className="h-4 w-4 text-white" />
                  <span className="text-white font-semibold">{post.streakCount} days</span>
                </div>
              </div>

              {/* Category Badge */}
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Badge className="bg-surface text-white border-0">
                  {post.category}
                </Badge>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Post Detail Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPostId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-surface border-rule text-white">
          <DialogTitle className="sr-only">
            {selectedPost?.title || "Post Details"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            View and interact with this post
          </DialogDescription>
          {selectedPost && (
            <PostCard
              post={selectedPost}
              currentUserId={currentUserId}
              onLike={onLike}
              onLikeDay={onLikeDay}
              onComment={onComment}
              onDeleteComment={onDeleteComment}
              onLikeComment={onLikeComment}
              onDeletePost={(postId) => {
                onDeletePost?.(postId);
                setSelectedPostId(null);
              }}
              onCloseStreak={onCloseStreak}
              onReplyToComment={onReplyToComment}
              onUserClick={onUserClick}
              allUsers={allUsers}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
