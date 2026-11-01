import { PostCard, Post } from "./PostCard";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { StreakChain } from "./StreakChain";
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
  const myActiveStreaks = posts
    .filter(post => post.userId === currentUserId && !post.isClosed)
    .sort((a, b) => b.streakCount - a.streakCount);
  const leadStreak = myActiveStreaks[0];

  return (
    <div>
      <PageHeader
        title="Feed"
        subtitle="Latest winning streaks from the community"
        action={onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh feed"
            className="text-muted-text"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      />

      {leadStreak && (
        <section className="mb-[14px] rounded-[20px] bg-surface p-[22px]" aria-labelledby="your-streak">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="your-streak" className="truncate text-base font-semibold text-white">{leadStreak.title}</h2>
              <p className="text-sm text-muted-text">Your longest active streak · {leadStreak.category}</p>
            </div>
            <p className="shrink-0 text-right">
              <span className="block text-[30px] font-semibold leading-9 text-white tabular-nums">{leadStreak.streakCount}</span>
              <span className="text-sm text-faint">days</span>
            </p>
          </div>
          <StreakChain days={leadStreak.streakCount} size="lg" />
          {myActiveStreaks.length > 1 && (
            <p className="mt-3 text-sm text-faint">
              <span className="tabular-nums">{myActiveStreaks.length}</span> active streaks in total
            </p>
          )}
        </section>
      )}

      <div className="space-y-[14px]">
        {posts.length === 0 ? (
          <div className="rounded-[20px] bg-surface py-12 text-center text-muted-text">
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
