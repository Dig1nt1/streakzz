import { PostCard, Post } from "./PostCard";
import { TrendingUp, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

interface FeedViewProps {
  posts: Post[];
  currentUserId?: string;
  onLike?: (postId: string) => void;
  onLikeDay?: (postId: string, dayNumber: number) => void;
  onComment?: (postId: string, comment: string) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
  onLikeComment?: (postId: string, commentId: string) => void;
  onDeletePost?: (postId: string) => void;
  onReplyToComment?: (postId: string, commentId: string, replyText: string) => void;
  onUserClick?: (userId: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onCloseStreak?: (postId: string) => void;
  allUsers?: Array<{ id: string; name: string; avatar: string }>;
}

export function FeedView({ posts, currentUserId, onLike, onLikeDay, onComment, onDeleteComment, onLikeComment, onDeletePost, onReplyToComment, onUserClick, onRefresh, isRefreshing, onCloseStreak, allUsers }: FeedViewProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-white text-base sm:text-xl">Feed</h2>
            <p className="text-gray-300 text-xs sm:text-sm hidden sm:block">Latest winning streaks from the community</p>
          </div>
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="bg-white/5 border-white/10 hover:bg-white/10 text-white flex-shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>

      <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
        {posts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No posts yet
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onLike={onLike}
              onLikeDay={onLikeDay}
              onComment={onComment}
              onDeleteComment={onDeleteComment}
              onLikeComment={onLikeComment}
              onDeletePost={onDeletePost}
              onReplyToComment={onReplyToComment}
              onUserClick={onUserClick}
              onCloseStreak={onCloseStreak}
              allUsers={allUsers}
            />
          ))
        )}
      </div>
    </div>
  );
}
