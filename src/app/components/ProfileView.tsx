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
import { StreakChain } from "./StreakChain";
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

  const plural = (n: number, word: string) => `${word}${n === 1 ? "" : "s"}`;
  const activePosts = posts.filter(p => !p.isClosed).sort((a, b) => b.streakCount - a.streakCount);
  const active = activePosts.length;
  const longest = Number(user.longestStreak) || 0;
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  // Days this person posted, from every streak day's timestamp
  const DAY = 86400000;
  const dayStart = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const postedDays = new Set<number>();
  posts.forEach(post => {
    const stamps = post.streakDays?.length ? post.streakDays.map(d => d.postedAt) : [(post as any).createdAt];
    stamps.forEach(stamp => {
      const t = stamp ? Date.parse(stamp) : NaN;
      if (!Number.isNaN(t)) postedDays.add(dayStart(t));
    });
  });
  const today = dayStart(Date.now());
  const WEEKS = 52;
  const firstDay = today - (((new Date(today).getDay() + 6) % 7) + (WEEKS - 1) * 7) * DAY; // a Monday
  const heatCells = Array.from({ length: WEEKS * 7 }, (_, i) => firstDay + i * DAY);
  const last30 = heatCells.filter(t => t > today - 30 * DAY && t <= today && postedDays.has(t)).length;
  let run = 0;
  for (let t = postedDays.has(today) ? today : today - DAY; postedDays.has(t); t -= DAY) run++;
  const monthLabels = heatCells
    .filter((t, i) => i % 7 === 0 && new Date(t).getDate() <= 7 && i / 7 <= WEEKS - 3)
    .map(t => ({ col: Math.round((t - firstDay) / DAY / 7), label: new Date(t).toLocaleDateString("en-US", { month: "short" }) }));

  const joinedText = (() => {
    const t = Date.parse(user.joined);
    return Number.isNaN(t) ? user.joined : new Date(t).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  })();
  const finding = posts.length === 0
    ? (isOwnProfile ? "No streaks yet. Post your first one to start your chain." : "No streaks yet.")
    : run > 0
      ? `On a ${run}-${plural(run, "day").replace(/s$/, "")} run · posted on ${last30} of the last 30 days`
      : `Posted on ${last30} of the last 30 days`;

  const actionsBlock = isOwnProfile ? (
    onUpdateProfile && <EditProfileDialog user={user} onUpdateProfile={onUpdateProfile} accessToken={accessToken ?? undefined} />
  ) : (
    <div className="flex items-center gap-2">
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
  );

  const openPost = (id: string) => setSelectedPostId(id);
  const postThumb = (post: Post) => {
    const image = post.streakDays?.[0]?.imageUrl || post.imageUrl;
    const isVideo = (post.streakDays?.[0]?.mediaType || post.mediaType) === "video";
    return isVideo
      ? <video src={image} className="h-full w-full object-cover" muted playsInline />
      : <img src={image} alt="" className="h-full w-full object-cover" />;
  };

  return (
    <div className="space-y-[14px]">
      {/* Object header: the person, one line of facts, their bio, and the actions */}
      <Card className="gap-0 bg-surface p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <div className={`shrink-0 rounded-full p-[2.5px] ${active > 0 ? "bg-flame" : "bg-raised"}`}>
            <img src={user.avatar} alt="" className="h-16 w-16 rounded-full border-[3px] border-surface object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold text-white">{user.alias || user.name}</h1>
              {!user.isPublic && user.isPublic !== undefined && (
                <Badge variant="secondary" className="gap-1 text-xs"><Lock className="h-3 w-3" />Private</Badge>
              )}
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-text">
              {user.alias && user.alias !== user.name && <><span>{user.name}</span><span aria-hidden>·</span></>}
              <span>Joined {joinedText}</span>
              {user.websiteLinks && user.websiteLinks.length > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <a
                    href={user.websiteLinks[0].startsWith("http") ? user.websiteLinks[0] : `https://${user.websiteLinks[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-white underline decoration-[#6a6460] underline-offset-4 hover:decoration-white"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {user.websiteLinks[0].replace(/^https?:\/\//, "")}
                  </a>
                  {user.websiteLinks.length > 1 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="hover:text-white">+{user.websiteLinks.length - 1}</button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 border-rule bg-raised text-white">
                        <div className="space-y-2">
                          {user.websiteLinks.map((link, index) => (
                            <a key={index} href={link.startsWith("http") ? link : `https://${link}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-white underline decoration-[#6a6460] underline-offset-4 hover:decoration-white">
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              <span className="truncate">{link.replace(/^https?:\/\//, "")}</span>
                            </a>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </>
              )}
            </p>
            <p className="mt-2 text-[15px] leading-[22px] text-body">{user.bio || "No bio yet"}</p>
          </div>
          <div className="hidden shrink-0 sm:block">{actionsBlock}</div>
        </div>
        <div className="mt-4 sm:hidden [&_button]:w-full [&>div]:grid [&>div]:grid-cols-2">{actionsBlock}</div>
      </Card>

      <Tabs defaultValue="overview" className="w-full gap-0">
        <TabsList className="h-auto w-full justify-start gap-6 rounded-none border-b border-rule bg-transparent p-0">
          {[["overview", "Overview"], ["posts", `Posts ${posts.length}`], ["achievements", `Achievements ${unlockedCount}/${achievements.length}`]].map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="relative h-10 flex-none rounded-none border-0 bg-transparent px-0 text-sm font-medium text-[#bbbbbb] after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 hover:text-white data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:after:bg-white"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview: a six-column grid whose spans change by row and share the same edges */}
        <TabsContent value="overview" className="mt-[14px]">
          <div className="grid grid-cols-3 gap-[10px] sm:grid-cols-6 sm:gap-[14px]">
            <section className="rounded-[16px] bg-surface p-3 sm:rounded-[20px] sm:p-5 sm:col-span-2">
              <p className="text-xs text-muted-text sm:text-[13px]">Active streaks</p>
              <p className={`mt-1 text-[30px] font-semibold leading-9 tabular-nums ${active > 0 ? "text-flame" : "text-white"}`}>{active}</p>
              <p className="mt-1 hidden text-xs text-faint sm:block">{posts.length - active} ended · {posts.length} in total</p>
            </section>
            <section className="rounded-[16px] bg-surface p-3 sm:rounded-[20px] sm:p-5 sm:col-span-2">
              <p className="text-xs text-muted-text sm:text-[13px]">Longest streak</p>
              <p className="mt-1 text-2xl font-medium leading-9 tabular-nums text-white">{longest}<span className="ml-1 text-sm font-normal text-faint">{plural(longest, "day")}</span></p>
              <p className="mt-1 hidden text-xs text-faint sm:block">{run > 0 ? `Current run ${run} ${plural(run, "day")}` : "No current run"}</p>
            </section>
            <section className="rounded-[16px] bg-surface p-3 sm:rounded-[20px] sm:p-5 sm:col-span-2">
              <p className="text-xs text-muted-text sm:text-[13px]">Backers</p>
              <button onClick={() => handleOpenBackingDialog('backers')} className="mt-1 block text-2xl font-medium leading-9 tabular-nums text-white hover:underline underline-offset-4">{backerCount}</button>
              <button onClick={() => handleOpenBackingDialog('backing')} className="mt-1 hidden text-xs text-faint hover:text-white sm:inline">Backing <span className="tabular-nums">{backingCount}</span></button>
            </section>

            <section className="rounded-[20px] bg-surface p-5 col-span-3 sm:col-span-6" aria-labelledby="activity-h">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="activity-h" className="text-base font-semibold text-white">Streak activity</h2>
                <span className="text-xs text-faint">Last 12 months</span>
              </div>
              <p className="mb-4 text-sm text-body">{finding}</p>
              <div className="overflow-x-auto" ref={el => { if (el) el.scrollLeft = el.scrollWidth; }}>
                <div className="min-w-[680px]">
                  <div className="grid gap-[3px]" style={{ gridTemplateRows: "repeat(7, 12px)", gridAutoFlow: "column", gridAutoColumns: "minmax(0, 1fr)" }} role="img" aria-label={`Posted on ${postedDays.size} days`}>
                    {heatCells.map(t => (
                      <span
                        key={t}
                        title={new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        className={`rounded-[3px] ${t > today ? "bg-transparent" : postedDays.has(t) ? "bg-flame" : "bg-raised"} `}
                      />
                    ))}
                  </div>
                  <div className="relative mt-2 h-4 text-xs text-faint">
                    {monthLabels.map(m => (
                      <span key={m.col} className="absolute" style={{ left: `${(m.col / WEEKS) * 100}%` }}>{m.label}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-4 text-xs text-faint">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px] bg-flame" />Posted</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px] bg-raised" />No post</span>
              </div>
            </section>

            <section className="flex flex-col rounded-[20px] bg-surface p-5 col-span-3 sm:col-span-3" aria-labelledby="active-h">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 id="active-h" className="text-base font-semibold text-white">Active streaks</h2>
                <span className="text-xs tabular-nums text-faint">{active}</span>
              </div>
              {activePosts.length === 0 ? (
                <p className="text-sm text-muted-text">{isOwnProfile ? "Nothing running. Start a streak with the + button." : "No active streaks."}</p>
              ) : (
                <ul className="divide-y divide-rule">
                  {activePosts.slice(0, 3).map(post => (
                    <li key={post.id}>
                      <button onClick={() => openPost(post.id)} className="group w-full py-3 text-left">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-sm font-medium text-white underline-offset-4 group-hover:underline">{post.title}</span>
                          <span className="shrink-0 text-[13px] tabular-nums text-faint">Day {post.streakCount}</span>
                        </span>
                        <StreakChain days={post.streakCount} className="mt-2" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {activePosts.length > 3 && (
                <p className="mt-auto pt-2 text-xs text-faint">+{activePosts.length - 3} more in Posts</p>
              )}
            </section>

            <section className="flex flex-col rounded-[20px] bg-surface p-5 col-span-3 sm:col-span-3" aria-labelledby="ach-h">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 id="ach-h" className="text-base font-semibold text-white">Achievements</h2>
                <span className="text-xs tabular-nums text-faint">{unlockedCount} of {achievements.length}</span>
              </div>
              <div className="h-2 rounded-full bg-raised" role="progressbar" aria-valuemin={0} aria-valuemax={achievements.length} aria-valuenow={unlockedCount} aria-label="Achievements unlocked">
                <div className="h-full rounded-full bg-white" style={{ width: `${achievements.length ? (unlockedCount / achievements.length) * 100 : 0}%` }} />
              </div>
              <p className="mt-4 text-[13px] text-muted-text">{unlockedCount === achievements.length ? "Every achievement unlocked." : "Up next"}</p>
              <ul className="divide-y divide-rule">
                {achievements.filter(x => !x.unlocked).slice(0, 2).map(item => (
                  <li key={item.id} className="py-2.5">
                    <span className="block text-sm font-medium text-white">{item.name}</span>
                    <span className="block text-[13px] text-faint">{item.description}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[20px] bg-surface p-5 col-span-3 sm:col-span-6" aria-labelledby="recent-h">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 id="recent-h" className="text-base font-semibold text-white">Recent posts</h2>
                <span className="text-xs tabular-nums text-faint">{posts.length} {plural(posts.length, "streak")}</span>
              </div>
              {posts.length === 0 ? (
                <p className="text-sm text-muted-text">No posts yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-[14px] sm:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]" style={{ ["--cols" as any]: Math.max(2, Math.min(posts.length, 4)) }}>
                  {posts.slice(0, 4).map(post => (
                    <button key={post.id} onClick={() => openPost(post.id)} className="group text-left">
                      <span className="block aspect-[4/3] overflow-hidden rounded-[14px] bg-raised">{postThumb(post)}</span>
                      <span className="mt-2 block truncate text-sm font-medium text-white group-hover:underline underline-offset-4">{post.title}</span>
                      <span className="block text-xs text-faint">{post.streakCount} {plural(post.streakCount, "day")} · {post.isClosed ? "Ended" : post.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </TabsContent>

        <TabsContent value="posts" className="mt-[14px]">
          {posts.length === 0 ? (
            <section className="rounded-[20px] bg-surface p-8 text-center text-muted-text">No posts yet</section>
          ) : (
            <div className="grid grid-cols-2 gap-[14px] sm:grid-cols-3">
              {posts.map(post => {
                const totalLikes = post.isParentStreak && post.streakDays?.length
                  ? post.streakDays.reduce((sum, day) => sum + (day.likes || 0), 0)
                  : (post.likes || 0);
                return (
                  <button key={post.id} onClick={() => openPost(post.id)} className="group rounded-[20px] bg-surface p-2 text-left hover:bg-[#1f1d1b]">
                    <span className="block aspect-[4/3] overflow-hidden rounded-[14px] bg-raised">{postThumb(post)}</span>
                    <span className="block px-2 pt-2.5 pb-1.5">
                      <span className="block truncate text-sm font-medium text-white">{post.title}</span>
                      <span className="mt-0.5 flex items-center gap-3 text-xs text-faint">
                        <span className="tabular-nums">{post.streakCount} {plural(post.streakCount, "day")}</span>
                        <span className="inline-flex items-center gap-1 tabular-nums"><Flame className="h-3 w-3" />{totalLikes}</span>
                        <span className="inline-flex items-center gap-1 tabular-nums"><MessageCircle className="h-3 w-3" />{post.comments.length}</span>
                        {post.isClosed && <span className="ml-auto rounded-full bg-raised px-2 py-0.5 text-[11px] text-muted-text">Ended</span>}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="achievements" className="mt-[14px]">
          <section className="rounded-[20px] bg-surface p-5">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-white">Achievements</h2>
              <span className="text-xs tabular-nums text-faint">{unlockedCount} of {achievements.length} unlocked</span>
            </div>
            <ul className="grid gap-x-10 sm:grid-cols-2">
              {achievements.map(achievement => (
                <li key={achievement.id} className="flex items-center justify-between gap-4 border-t border-rule py-3.5 first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
                  <span className="min-w-0">
                    <span className={`block text-sm font-semibold ${achievement.unlocked ? "text-white" : "text-muted-text"}`}>{achievement.name}</span>
                    <span className="block text-[13px] text-faint">{achievement.description}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${achievement.unlocked ? "bg-positive-tint text-positive" : "bg-raised text-muted-text"}`}>
                    {achievement.unlocked ? "Unlocked" : "Locked"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
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
