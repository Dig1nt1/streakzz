import { useState, useMemo, useEffect, useRef } from "react";
import { Flame, Trophy, Award, Lock, Heart, MessageCircle, ExternalLink, LockIcon, UserPlus, UserCheck } from "lucide-react";
import { motion } from "motion/react";
import { Card } from "./ui/card";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { PostCard, Post } from "./PostCard";
import { EditProfileDialog } from "./EditProfileDialog";
import { calculateAchievements } from "../utils/achievements";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface ProfileViewProps {
  user: {
    id: string;
    name: string;
    alias?: string;
    avatar: string;
    bio: string;
    joined: string;
    totalStreaks: number;
    longestStreak: number;
    activeStreaks: number;
    isPublic?: boolean;
    websiteLinks?: string[];
    achievements?: string[];
  };
  posts: Post[];
  currentUserId?: string;
  onLike?: (postId: string) => void;
  onLikeDay?: (postId: string, dayNumber: number) => void;
  onComment?: (postId: string, comment: string) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
  onLikeComment?: (postId: string, commentId: string) => void;
  onDeletePost?: (postId: string) => void;
  onCloseStreak?: (postId: string) => void;
  onUpdateProfile?: (updates: {
    name: string;
    avatar: string;
    bio: string;
    isPublic: boolean;
    websiteLinks: string[];
  }) => void;
  isOwnProfile?: boolean;
  onReplyToComment?: (postId: string, commentId: string, replyText: string) => void;
  onUserClick?: (userId: string) => void;
  onMessageClick?: (userId: string, userInfo?: { name: string; avatar: string }) => void;
  isBacking?: boolean;
  onBackToggle?: (userId: string) => void;
  backingCount?: number;
  backerCount?: number;
  allUsers?: Array<{ id: string; name: string; avatar: string }>;
  /** Signed-in user's access token, used by EditProfileDialog to upload the avatar. */
  accessToken?: string | null;
}

interface BackingUser {
  id: string;
  name: string;
  avatar: string;
  bio: string;
}

export function ProfileView({ user, posts, currentUserId, onLike, onLikeDay, onComment, onDeleteComment, onLikeComment, onDeletePost, onCloseStreak, onUpdateProfile, isOwnProfile = true, onReplyToComment, onUserClick, onMessageClick, isBacking = false, onBackToggle, backingCount = 0, backerCount = 0, allUsers = [], accessToken }: ProfileViewProps) {
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showBackingDialog, setShowBackingDialog] = useState(false);
  const [backingDialogTab, setBackingDialogTab] = useState<'backers' | 'backing'>('backers');
  const [backersList, setBackersList] = useState<BackingUser[]>([]);
  const [backingList, setBackingList] = useState<BackingUser[]>([]);
  const [loadingBackers, setLoadingBackers] = useState(false);
  const [loadingBacking, setLoadingBacking] = useState(false);
  // Tracks which profile is currently shown so late responses for a previous profile are ignored
  const activeUserIdRef = useRef(user.id);
  const backersRequestRef = useRef(0);
  const backingRequestRef = useRef(0);

  // Clear lists when switching to a different profile
  useEffect(() => {
    activeUserIdRef.current = user.id;
    backersRequestRef.current++;
    backingRequestRef.current++;
    setBackersList([]);
    setBackingList([]);
    setLoadingBackers(false);
    setLoadingBacking(false);
  }, [user.id]);
  
  // Always get the latest post data from the posts array
  const selectedPost = selectedPostId ? posts.find(p => p.id === selectedPostId) || null : null;

  // Calculate achievements based on user's posts
  const achievements = useMemo(() => {
    return calculateAchievements(posts, user.achievements || []);
  }, [posts, user.achievements]);

  // Fetch backers list
  const fetchBackers = async () => {
    const requestedUserId = user.id;
    const requestId = ++backersRequestRef.current;
    const isStale = () => requestId !== backersRequestRef.current || requestedUserId !== activeUserIdRef.current;
    setLoadingBackers(true);
    try {
      console.log('Fetching backers for user:', requestedUserId);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/users/${requestedUserId}/backers-list`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const data = await response.json();
      if (isStale()) return;
      console.log('Backers response:', data);
      if (data.backers) {
        setBackersList(data.backers);
        console.log('Backers list set:', data.backers);
      } else if (data.error) {
        console.error('Error from server:', data.error);
      }
    } catch (error) {
      console.error('Error fetching backers:', error);
    } finally {
      if (!isStale()) setLoadingBackers(false);
    }
  };

  // Fetch backing list
  const fetchBacking = async () => {
    const requestedUserId = user.id;
    const requestId = ++backingRequestRef.current;
    const isStale = () => requestId !== backingRequestRef.current || requestedUserId !== activeUserIdRef.current;
    setLoadingBacking(true);
    try {
      console.log('Fetching backing list for user:', requestedUserId);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/users/${requestedUserId}/backing-list`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const data = await response.json();
      if (isStale()) return;
      console.log('Backing response:', data);
      if (data.backing) {
        setBackingList(data.backing);
        console.log('Backing list set:', data.backing);
      } else if (data.error) {
        console.error('Error from server:', data.error);
      }
    } catch (error) {
      console.error('Error fetching backing:', error);
    } finally {
      if (!isStale()) setLoadingBacking(false);
    }
  };

  // Load data when dialog opens
  useEffect(() => {
    if (showBackingDialog) {
      if (backingDialogTab === 'backers') {
        fetchBackers();
      } else {
        fetchBacking();
      }
    }
  }, [showBackingDialog, backingDialogTab, user.id]);

  const handleOpenBackingDialog = (tab: 'backers' | 'backing') => {
    setBackingDialogTab(tab);
    setShowBackingDialog(true);
  };

  const stats = [
    {
      icon: Flame,
      label: "Total Streaks",
      value: user.totalStreaks,
    },
    {
      icon: Trophy,
      label: "Longest Streak",
      value: `${user.longestStreak} days`,
    },
    {
      icon: Award,
      label: "Active Streaks",
      value: user.activeStreaks,
    },
  ];

  return (
    <div className="space-y-[14px]">
      {/* Profile Header */}
      <Card className="p-[22px] gap-0 bg-surface">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <Avatar className="h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0">
            <img src={user.avatar} alt={user.name} className="object-cover" />
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <div className="flex flex-col">
                    <h1 className="text-lg font-semibold text-white">{user.alias || user.name}</h1>
                    {user.alias && user.alias !== user.name && (
                      <p className="text-muted-text text-sm">{user.name}</p>
                    )}
                  </div>
                  {!user.isPublic && user.isPublic !== undefined && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Lock className="h-3 w-3" />
                      Private
                    </Badge>
                  )}
                  {!isOwnProfile && (
                    <div className="ml-2 flex items-center gap-2">
                      {onBackToggle && (
                        <motion.button
                          onClick={() => onBackToggle(user.id)}
                          className={`relative inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full transition-colors text-sm font-semibold ${
                            isBacking 
                              ? 'bg-flame-tint text-flame' 
                              : 'bg-white text-black hover:bg-[#e6e3df]'
                          }`}
                        >
                          {isBacking && (
                            <motion.div 
                              className="absolute inset-0 rounded-[13px] bg-flame-tint text-flame hidden"
                              animate={{
                                scale: [1, 1.1, 1],
                                opacity: [0.5, 0.7, 0.5],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            />
                          )}
                          <span className="relative z-10 inline-flex items-center gap-1.5">
                            {isBacking ? (
                              <>
                                <Flame className="h-4 w-4 fill-current" />
                                Backing
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4" />
                                Back
                              </>
                            )}
                          </span>
                        </motion.button>
                      )}
                      {onMessageClick && (
                        <button
                          onClick={() => onMessageClick(user.id, { name: user.alias || user.name, avatar: user.avatar })}
                          className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border border-[#6a6460] text-white hover:bg-raised transition-colors text-sm font-semibold"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Message
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Backing/Backer Counts - Instagram style */}
                <div className="flex items-center gap-4 mb-2">
                    <button 
                      onClick={() => handleOpenBackingDialog('backers')}
                      className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <span className="text-white">{backerCount}</span>
                      <span className="text-muted-text text-sm">{backerCount === 1 ? 'backer' : 'backers'}</span>
                    </button>
                    <button 
                      onClick={() => handleOpenBackingDialog('backing')}
                      className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <span className="text-white">{backingCount}</span>
                      <span className="text-muted-text text-sm">backing</span>
                    </button>
                </div>

                {user.websiteLinks && user.websiteLinks.length > 0 && (
                  <div className="flex items-center gap-2 text-muted-text text-sm mt-1">
                    <ExternalLink className="h-4 w-4" />
                    <div className="flex items-center gap-1">
                      <a 
                        href={user.websiteLinks[0].startsWith('http') ? user.websiteLinks[0] : `https://${user.websiteLinks[0]}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-white underline underline-offset-4 decoration-[#6a6460] hover:decoration-white"
                      >
                        {user.websiteLinks[0].replace(/^https?:\/\//, '')}
                      </a>
                      {user.websiteLinks.length > 1 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="text-muted-text hover:text-white transition-colors cursor-pointer ml-1">
                              and {user.websiteLinks.length - 1} other{user.websiteLinks.length - 1 > 1 ? 's' : ''}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 bg-surface border-rule text-white">
                            <div className="space-y-2">
                              <h4 className="font-medium mb-3">All Links</h4>
                              {user.websiteLinks.map((link, index) => (
                                <a
                                  key={index}
                                  href={link.startsWith('http') ? link : `https://${link}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-white underline underline-offset-4 decoration-[#6a6460] hover:decoration-white text-sm"
                                >
                                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{link.replace(/^https?:\/\//, '')}</span>
                                </a>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {isOwnProfile && onUpdateProfile && (
                <EditProfileDialog user={user} onUpdateProfile={onUpdateProfile} accessToken={accessToken ?? undefined} />
              )}
            </div>
            <p className="text-body mb-4">{user.bio || "No bio yet"}</p>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-3">
              {stats.map((stat, index) => (
                <div key={stat.label} className={index === 0 ? "pr-4" : "border-l border-rule px-4"}>
                  <div className="text-[13px] text-muted-text">{stat.label}</div>
                  <div className={`mt-0.5 text-2xl font-medium tabular-nums ${index === 0 && Number(user.totalStreaks) > 0 ? "text-flame" : "text-white"}`}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Posts Section */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-6">
          {posts.length === 0 ? (
            <Card className="p-8 text-center border-rule bg-surface">
              <p className="text-body">No posts yet</p>
            </Card>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post) => {
                const displayImage = post.streakDays?.[0]?.imageUrl || post.imageUrl;
                const displayMediaType = post.streakDays?.[0]?.mediaType || post.mediaType;
                // Calculate total likes for parent streaks
                const totalLikes = post.isParentStreak && post.streakDays && post.streakDays.length > 0
                  ? post.streakDays.reduce((sum, day) => sum + (day.likes || 0), 0)
                  : (post.likes || 0);
                return (
                <div 
                  key={post.id} 
                  className="relative aspect-square group cursor-pointer overflow-hidden bg-raised"
                  onClick={() => setSelectedPostId(post.id)}
                >
                  {displayMediaType === 'video' ? (
                    <video 
                      src={displayImage} 
                      className="w-full h-full object-contain bg-black"
                      muted
                      playsInline
                    />
                  ) : (
                    <img 
                      src={displayImage} 
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Multi-day indicator */}
                  {post.isParentStreak && post.streakDays && post.streakDays.length > 1 && (
                    <div className="absolute top-2 right-2 bg-surface px-2 py-1 rounded-full">
                      <span className="text-white text-xs tabular-nums">{post.streakDays.length} days</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-surface opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1 text-white">
                      <Flame className="h-5 w-5 fill-white" />
                      <span className="font-semibold">{totalLikes}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white">
                      <MessageCircle className="h-5 w-5 fill-white" />
                      <span className="font-semibold">{post.comments.length}</span>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="achievements" className="mt-6">
          {achievements.filter(a => a.unlocked).length === 0 ? (
            <Card className="p-8 text-center border-rule bg-surface">
              <Trophy className="h-12 w-12 mx-auto mb-3 text-faint" />
              <p className="text-body mb-2">No achievements yet</p>
              <p className="text-muted-text text-sm">Complete streaks and engage with the community to unlock achievements!</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {achievements.map((achievement) => (
                <Card 
                  key={achievement.id} 
                  className={`p-4 text-center border-rule transition-all ${
                    achievement.unlocked 
                      ? 'bg-surface hover:bg-raised' 
                      : 'bg-raised opacity-60'
                  }`}
                >
                  <div className={`h-12 w-12 mx-auto mb-2 rounded-full flex items-center justify-center text-2xl ${
                    achievement.unlocked 
                      ? 'bg-raised' 
                      : 'bg-gray-700'
                  }`}>
                    {achievement.unlocked ? (
                      <span>{achievement.icon}</span>
                    ) : (
                      <LockIcon className="h-6 w-6 text-muted-text" />
                    )}
                  </div>
                  <p className={`text-sm mb-1 ${achievement.unlocked ? 'text-white' : 'text-faint'}`}>
                    {achievement.name}
                  </p>
                  <p className={`text-xs ${achievement.unlocked ? 'text-muted-text' : 'text-faint'}`}>
                    {achievement.description}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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

      {/* Backers/Backing Dialog */}
      <Dialog open={showBackingDialog} onOpenChange={setShowBackingDialog}>
        <DialogContent className="max-w-md max-h-[80vh] bg-surface border-rule text-white">
          <DialogTitle className="text-xl mb-4">{user.alias || user.name}</DialogTitle>
          <DialogDescription className="sr-only">
            View backers and backing lists
          </DialogDescription>
          
          <Tabs value={backingDialogTab} onValueChange={(value) => setBackingDialogTab(value as 'backers' | 'backing')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="backers">
                {backerCount} {backerCount === 1 ? 'Backer' : 'Backers'}
              </TabsTrigger>
              <TabsTrigger value="backing">
                {backingCount} Backing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="backers" className="mt-4">
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {loadingBackers ? (
                  <div className="text-center text-muted-text py-8">Loading...</div>
                ) : backersList.length === 0 ? (
                  <div className="text-center text-muted-text py-8">No backers yet</div>
                ) : (
                  backersList.map((backer) => (
                    <div 
                      key={backer.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-surface hover:bg-raised transition-colors cursor-pointer"
                      onClick={() => {
                        onUserClick?.(backer.id);
                        setShowBackingDialog(false);
                      }}
                    >
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <img src={backer.avatar} alt={backer.name} className="object-cover" />
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-white truncate">{backer.name}</p>
                        <p className="text-muted-text text-sm truncate">{backer.bio}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="backing" className="mt-4">
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {loadingBacking ? (
                  <div className="text-center text-muted-text py-8">Loading...</div>
                ) : backingList.length === 0 ? (
                  <div className="text-center text-muted-text py-8">Not backing anyone yet</div>
                ) : (
                  backingList.map((backingUser) => (
                    <div 
                      key={backingUser.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-surface hover:bg-raised transition-colors cursor-pointer"
                      onClick={() => {
                        onUserClick?.(backingUser.id);
                        setShowBackingDialog(false);
                      }}
                    >
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <img src={backingUser.avatar} alt={backingUser.name} className="object-cover" />
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-white truncate">{backingUser.alias || backingUser.name}</p>
                        <p className="text-muted-text text-sm truncate">{backingUser.bio}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
