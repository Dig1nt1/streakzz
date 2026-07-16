import { Heart, MessageCircle, Trophy, Flame, Trash2, X, ChevronLeft, ChevronRight, CheckCircle2, FlagOff, AtSign } from "lucide-react";
import { Card } from "./ui/card";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import React, { useState, useEffect, useRef } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";

interface MentionUser { id: string; name: string; avatar: string; }

function MentionInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className,
  users,
  onUserClick,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  className: string;
  users: MentionUser[];
  onUserClick?: (userId: string) => void;
  autoFocus?: boolean;
}) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = mentionQuery !== null
    ? users.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
    : [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;
    // find last @ before cursor
    const before = val.slice(0, cursor);
    const atIdx = before.lastIndexOf("@");
    if (atIdx !== -1 && !before.slice(atIdx + 1).includes(" ")) {
      setMentionQuery(before.slice(atIdx + 1));
      setMentionStart(atIdx);
      setFocusedIdx(0);
    } else {
      setMentionQuery(null);
    }
    onChange(val);
  };

  const insertMention = (user: MentionUser) => {
    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + 1 + (mentionQuery?.length ?? 0));
    const newVal = `${before}@${user.name}${after.startsWith(" ") ? "" : " "}${after}`;
    onChange(newVal);
    setMentionQuery(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filtered.length > 0 && mentionQuery !== null) {
      if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIdx(i => Math.min(i + 1, filtered.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setFocusedIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(filtered[focusedIdx]); return; }
      if (e.key === "Escape") { setMentionQuery(null); return; }
    }
    onKeyDown?.(e);
  };

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={className}
        autoFocus={autoFocus}
      />
      {mentionQuery !== null && (
        <div className="absolute bottom-full mb-1 left-0 w-60 bg-gray-900 border border-white/15 rounded-lg shadow-xl z-50 overflow-hidden">
          {filtered.length > 0 ? filtered.map((user, idx) => (
            <button
              key={user.id}
              type="button"
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${idx === focusedIdx ? "bg-orange-500/20 text-white" : "text-gray-300 hover:bg-white/5"}`}
              onMouseDown={(e) => { e.preventDefault(); insertMention(user); }}
            >
              <img src={user.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${user.id}`} alt={user.name} className="h-6 w-6 rounded-full object-cover flex-shrink-0" />
              <span className="truncate font-medium">@{user.name}</span>
            </button>
          )) : (
            <p className="px-3 py-2 text-xs text-gray-500">No interactions yet — like, comment, or back someone first</p>
          )}
        </div>
      )}
    </div>
  );
}

function renderTextWithMentions(text: string, onUserClick?: (userId: string) => void, users: MentionUser[] = []) {
  const parts = text.split(/(@[\w][\w\s]*[\w]|@[\w]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      const name = part.slice(1).trim();
      const user = users.find(u => u.name.toLowerCase() === name.toLowerCase());
      return (
        <span
          key={i}
          className={`text-orange-400 font-medium ${user ? "cursor-pointer hover:text-orange-300" : ""}`}
          onClick={() => user && onUserClick?.(user.id)}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export interface StreakDay {
  dayNumber: number;
  imageUrl: string;
  mediaType?: 'image' | 'video';
  description: string;
  postedAt: string;
  likes: number;
  isLiked?: boolean;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  category: string;
  streakCount: number;
  title: string;
  description: string;
  imageUrl: string;
  mediaType?: 'image' | 'video';
  likes: number;
  comments: Comment[];
  timestamp: string;
  isLiked?: boolean;
  streakDays?: StreakDay[];
  isParentStreak?: boolean;
  isClosed?: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: string;
  likes?: number;
  isLiked?: boolean;
  replies?: Comment[];
}

interface PostCardProps {
  post: Post;
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
  allUsers?: MentionUser[];
}

const categoryColors: Record<string, string> = {
  gaming: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  gambling: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  fitness: "bg-green-500/10 text-green-500 border-green-500/20",
  hobbies: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  goals: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

export function PostCard({ post, currentUserId, onLike, onLikeDay, onComment, onDeleteComment, onLikeComment, onDeletePost, onCloseStreak, onReplyToComment, onUserClick, allUsers = [] }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showRepliesFor, setShowRepliesFor] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<any>(null);
  
  // Sync local state when post prop changes (e.g. after server update)
  useEffect(() => {
    setIsLiked(post.isLiked || false);
    setLikesCount(post.isParentStreak && post.streakDays
      ? post.streakDays.reduce((sum, day) => sum + day.likes, 0)
      : post.likes);
  }, [post.isLiked, post.likes, post.streakDays, post.isParentStreak]);

  // Calculate total likes for parent streak
  const totalLikes = post.isParentStreak && post.streakDays
    ? post.streakDays.reduce((sum, day) => sum + day.likes, 0)
    : post.likes;

  // Track carousel slide changes
  React.useEffect(() => {
    if (!carouselApi) return;
    
    const onSelect = () => {
      setCurrentDayIndex(carouselApi.selectedScrollSnap());
    };
    
    carouselApi.on('select', onSelect);
    return () => {
      carouselApi.off('select', onSelect);
    };
  }, [carouselApi]);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    onLike?.(post.id);
  };

  const handleDoubleClick = () => {
    if (!isLiked) {
      setIsLiked(true);
      setLikesCount(likesCount + 1);
      onLike?.(post.id);
    }
  };

  const handleComment = () => {
    if (commentText.trim()) {
      onComment?.(post.id, commentText);
      setCommentText("");
    }
  };

  const handleReply = (commentId: string) => {
    if (replyText.trim()) {
      onReplyToComment?.(post.id, commentId, replyText);
      setReplyText("");
      setReplyingTo(null);
    }
  };

  const toggleReplies = (commentId: string) => {
    setShowRepliesFor(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  return (
    <Card className="overflow-hidden border-white/10 bg-black/40 backdrop-blur-md group/post">
      {/* User Header */}
      <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 pb-2 sm:pb-3">
        <Avatar 
          className="h-9 w-9 sm:h-10 sm:w-10 cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all"
          onClick={() => onUserClick?.(post.userId)}
        >
          <img src={post.userAvatar} alt={post.userName} className="object-cover" />
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 
              className="text-white cursor-pointer hover:text-orange-500 transition-colors text-sm sm:text-base truncate"
              onClick={() => onUserClick?.(post.userId)}
            >
              {post.userName}
            </h3>
            <Badge variant="outline" className={`${categoryColors[post.category.toLowerCase()]} text-xs`}>
              {post.category}
            </Badge>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm">{post.timestamp}</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-orange-500 to-red-500 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full flex-shrink-0">
          <Flame className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
          <span className="text-white text-xs sm:text-sm">{post.streakCount}</span>
        </div>
        {currentUserId === post.userId && !post.isClosed && onCloseStreak && (
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover/post:opacity-100 transition-opacity h-8 w-8 p-0 text-gray-400 hover:text-amber-500 hidden sm:flex"
            title="End this streak"
            onClick={() => setShowCloseConfirm(true)}
          >
            <FlagOff className="h-4 w-4" />
          </Button>
        )}
        {currentUserId === post.userId && onDeletePost && (
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover/post:opacity-100 transition-opacity h-8 w-8 p-0 text-gray-400 hover:text-red-500 hidden sm:flex"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        {post.isClosed && (
          <Badge className="bg-amber-500/15 border-amber-500/30 text-amber-400 border text-xs gap-1 px-2 py-0.5">
            <CheckCircle2 className="h-3 w-3" />
            Streak Ended
          </Badge>
        )}
      </div>

      {/* Post Content */}
      <div className="px-3 sm:px-4 pb-2 sm:pb-3">
        <h4 className="text-white mb-1 text-sm sm:text-base">{post.title}</h4>
        <p className="text-gray-300 text-xs sm:text-sm">{post.description}</p>
      </div>

      {/* Media (Image or Video) - Carousel for multi-day streaks */}
      {post.isParentStreak && post.streakDays && post.streakDays.length > 0 ? (
        <Carousel className="w-full" setApi={setCarouselApi}>
          <CarouselContent>
            {post.streakDays.map((day, index) => (
              <CarouselItem key={index}>
                <div 
                  className="relative aspect-[4/3] bg-black/20 cursor-pointer select-none"
                  onDoubleClick={() => {
                    if (!day.isLiked && onLikeDay) {
                      onLikeDay(post.id, day.dayNumber);
                    }
                  }}
                >
                  {day.mediaType === 'video' ? (
                    <video 
                      src={day.imageUrl} 
                      className="w-full h-full object-contain bg-black"
                      controls
                      loop
                    />
                  ) : (
                    <img 
                      src={day.imageUrl} 
                      alt={`Day ${day.dayNumber}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Day indicator */}
                  <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-black/70 backdrop-blur-sm px-2 py-1 sm:px-3 sm:py-1.5 rounded-full">
                    <span className="text-white text-xs sm:text-sm">Day {day.dayNumber}</span>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </Carousel>
      ) : (
        <div 
          className="relative aspect-[4/3] bg-black/20 cursor-pointer select-none"
          onDoubleClick={handleDoubleClick}
        >
          {post.mediaType === 'video' ? (
            <video 
              src={post.imageUrl} 
              className="w-full h-full object-contain bg-black"
              controls
              loop
            />
          ) : (
            <img 
              src={post.imageUrl} 
              alt={post.title}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-3 sm:p-4">
        <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
          {post.isParentStreak && post.streakDays && post.streakDays.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 transition-all duration-300 ${
                post.streakDays[currentDayIndex]?.isLiked 
                  ? 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]' 
                  : 'text-gray-300 hover:text-white'
              }`}
              onClick={() => onLikeDay?.(post.id, post.streakDays![currentDayIndex].dayNumber)}
            >
              <Flame 
                className={`h-5 w-5 transition-all duration-300 ${
                  post.streakDays[currentDayIndex]?.isLiked 
                    ? 'fill-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.8)] scale-110' 
                    : 'fill-none'
                }`} 
              />
              <span className="text-[rgb(247,167,7)]">{post.streakDays[currentDayIndex]?.likes || 0}</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 transition-all duration-300 ${
                isLiked 
                  ? 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]' 
                  : 'text-gray-300 hover:text-white'
              }`}
              onClick={handleLike}
            >
              <Flame 
                className={`h-5 w-5 transition-all duration-300 ${
                  isLiked 
                    ? 'fill-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.8)] scale-110' 
                    : 'fill-none'
                }`} 
              />
              <span className="text-[rgb(247,167,7)]">{likesCount}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-gray-300 hover:text-white"
            onClick={() => setIsDialogOpen(true)}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-[rgb(255,191,0)]">{post.comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0)}</span>
          </Button>
        </div>

      </div>

      {/* Comments Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[500px] h-[80vh] p-0 bg-black/95 border-white/10 flex flex-col">
          <DialogTitle className="sr-only">{post.title}</DialogTitle>
          <DialogDescription className="sr-only">
            View post details, comments, and interact with the post
          </DialogDescription>
          <div className="flex flex-col flex-1 min-h-0">
              {/* Post Header */}
              <div className="p-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <img src={post.userAvatar} alt={post.userName} className="object-cover" />
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white">{post.userName}</h3>
                      <Badge variant="outline" className={categoryColors[post.category.toLowerCase()]}>
                        {post.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Flame className="h-3 w-3" />
                      <span>{post.streakCount} day streak</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <h4 className="text-white mb-1">{post.title}</h4>
                  <p className="text-gray-300 text-sm">{post.description}</p>
                </div>
              </div>

              {/* Comments List */}
              <ScrollArea className="flex-1 min-h-0 p-4">
                <div className="space-y-4">
                  {post.comments.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No comments yet</p>
                  ) : (
                    post.comments.map((comment) => (
                      <div key={comment.id}>
                        <div className="flex gap-2 group">
                          <Avatar 
                            className="h-8 w-8 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all"
                            onClick={() => onUserClick?.(comment.userId)}
                          >
                            <img src={comment.userAvatar} alt={comment.userName} className="object-cover" />
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="bg-white/5 rounded-lg p-2">
                              <p className="text-sm mb-1">
                                <span 
                                  className="text-white cursor-pointer hover:text-orange-500 transition-colors"
                                  onClick={() => onUserClick?.(comment.userId)}
                                >
                                  {comment.userName}
                                </span>{" "}
                                <span className="text-gray-300">{renderTextWithMentions(comment.text, onUserClick, allUsers)}</span>
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-400">
                                <span>{comment.timestamp}</span>
                                <button
                                  onClick={() => onLikeComment?.(post.id, comment.id)}
                                  className={`flex items-center gap-1 transition-colors ${
                                    comment.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
                                  }`}
                                >
                                  <Heart className={`h-3 w-3 ${comment.isLiked ? 'fill-red-500' : ''}`} />
                                  {comment.likes ? comment.likes : 0}
                                </button>
                                <button
                                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                  className="text-gray-400 hover:text-white transition-colors"
                                >
                                  Reply
                                </button>
                              </div>
                            </div>

                            {/* Reply Input */}
                            {replyingTo === comment.id && (
                              <div className="mt-2 flex gap-2">
                                <MentionInput
                                  value={replyText}
                                  onChange={setReplyText}
                                  onKeyDown={(e) => e.key === 'Enter' && handleReply(comment.id)}
                                  placeholder="Write a reply..."
                                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                  users={allUsers}
                                  onUserClick={onUserClick}
                                  autoFocus
                                />
                                <Button size="sm" className="h-7 text-xs flex-shrink-0" onClick={() => handleReply(comment.id)}>
                                  Reply
                                </Button>
                              </div>
                            )}

                            {/* Show/Hide Replies Button */}
                            {comment.replies && comment.replies.length > 0 && (
                              <button
                                onClick={() => toggleReplies(comment.id)}
                                className="mt-2 text-xs text-gray-400 hover:text-white transition-colors"
                              >
                                {showRepliesFor.has(comment.id) 
                                  ? `Hide replies (${comment.replies.length})` 
                                  : `Show replies (${comment.replies.length})`}
                              </button>
                            )}

                            {/* Nested Replies */}
                            {showRepliesFor.has(comment.id) && comment.replies && comment.replies.length > 0 && (
                              <div className="mt-2 space-y-2 pl-4 border-l-2 border-white/10">
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} className="flex gap-2 group/reply">
                                    <Avatar 
                                      className="h-6 w-6 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all"
                                      onClick={() => onUserClick?.(reply.userId)}
                                    >
                                      <img src={reply.userAvatar} alt={reply.userName} className="object-cover" />
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="bg-white/5 rounded-lg p-2">
                                        <p className="text-xs mb-1">
                                          <span 
                                            className="text-white cursor-pointer hover:text-orange-500 transition-colors"
                                            onClick={() => onUserClick?.(reply.userId)}
                                          >
                                            {reply.userName}
                                          </span>{" "}
                                          <span className="text-gray-300">{renderTextWithMentions(reply.text, onUserClick, allUsers)}</span>
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                          <span>{reply.timestamp}</span>
                                          <button
                                            onClick={() => onLikeComment?.(post.id, reply.id)}
                                            className={`flex items-center gap-1 transition-colors ${
                                              reply.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
                                            }`}
                                          >
                                            <Heart className={`h-3 w-3 ${reply.isLiked ? 'fill-red-500' : ''}`} />
                                            {reply.likes ? reply.likes : 0}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                    {currentUserId === reply.userId && onDeleteComment && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="opacity-0 group-hover/reply:opacity-100 transition-opacity h-6 w-6 p-0 text-gray-400 hover:text-red-500 flex-shrink-0"
                                        onClick={() => onDeleteComment(post.id, reply.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {currentUserId === comment.userId && onDeleteComment && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-gray-400 hover:text-red-500 flex-shrink-0"
                              onClick={() => onDeleteComment(post.id, comment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

            {/* Add Comment Section */}
            <div className="p-4 border-t border-white/10 flex-shrink-0">
              <div className="flex items-center gap-4 mb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`gap-2 transition-all duration-300 ${
                    isLiked 
                      ? 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                  onClick={handleLike}
                >
                  <Flame 
                    className={`h-5 w-5 transition-all duration-300 ${
                      isLiked 
                        ? 'fill-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.8)] scale-110' 
                        : 'fill-none'
                    }`} 
                  />
                  <span className="text-[rgb(247,167,7)]">{likesCount}</span>
                </Button>
              </div>
              <div className="flex gap-2">
                <MentionInput
                  value={commentText}
                  onChange={setCommentText}
                  onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                  placeholder="Add a comment... (@ to mention)"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  users={allUsers}
                  onUserClick={onUserClick}
                />
                <Button size="sm" className="flex-shrink-0" onClick={handleComment}>Post</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* End Streak Confirmation Dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent className="bg-black/95 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <FlagOff className="h-5 w-5 text-amber-500" />
              End This Streak?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              This marks the streak as officially over. No more days can be added. The post stays visible to everyone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white hover:bg-white/20 border-white/10">
              Keep Going
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-500 text-white hover:bg-amber-600"
              onClick={() => {
                onCloseStreak?.(post.id);
                setShowCloseConfirm(false);
              }}
            >
              End Streak
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-black/95 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Post</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white hover:bg-white/20 border-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={() => {
                onDeletePost(post.id);
                setShowDeleteConfirm(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
