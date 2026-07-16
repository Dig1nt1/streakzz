import { useState, useEffect, useMemo } from "react";
import { Home, Trophy, User, Flame, MessageSquare, Swords, Radio } from "lucide-react";
import { FeedView } from "./components/FeedView";
import { LeaderboardView } from "./components/LeaderboardView";
import { ProfileView } from "./components/ProfileView";
import { MessagesView } from "./components/MessagesView";
import { ArenaView } from "./components/ArenaView";
import { SyncView } from "./components/SyncView";
import { HelpSupportView } from "./components/HelpSupportView";
import { CreatePostDialog } from "./components/CreatePostDialog";
import { AuthView } from "./components/AuthView";
import { WelcomeDialog } from "./components/WelcomeDialog";
import { UserMenu } from "./components/UserMenu";
import { DebugAliasManager } from "./components/DebugAliasManager";
import { Post, Comment, StreakDay } from "./components/PostCard";
import { Button } from "./components/ui/button";
import { getSupabaseClient } from "./utils/supabase/client";
import { projectId, publicAnonKey } from "./utils/supabase/info";
import streakzLogo from "figma:asset/0b5993ed4ace0b1938a06682c91bcf77a5cd9292.png";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner@2.0.3";
import backgroundTexture from "figma:asset/6128107800268459dda51dfef463f0e68d789714.png";
import { getNewlyUnlockedAchievements, getUnlockedAchievementIds } from "./utils/achievements";

// Mock data
const mockUsers = [
  {
    id: "1",
    name: "Sarah Chen",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    bio: "Fitness enthusiast | 5am club member | Marathon runner",
    joined: "January 2024",
    totalStreaks: 156,
    longestStreak: 89,
    activeStreaks: 3,
    websiteLinks: ["instagram.com/sarahfitness", "strava.com/athletes/sarahchen", "sarahfitness.com"],
  },
  {
    id: "2",
    name: "Marcus Rodriguez",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
    bio: "Pro gamer | Poker champion | Living the streak life",
    joined: "March 2024",
    totalStreaks: 142,
    longestStreak: 67,
    activeStreaks: 5,
    websiteLinks: ["twitch.tv/marcusrodriguez", "twitter.com/marcusgames", "youtube.com/@marcuspoker"],
  },
  {
    id: "3",
    name: "Emily Watson",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
    bio: "Yoga instructor | Meditation guide | Mindfulness advocate",
    joined: "February 2024",
    totalStreaks: 134,
    longestStreak: 120,
    activeStreaks: 2,
    websiteLinks: ["emilyyoga.com", "instagram.com/emilyyoga"],
  },
  {
    id: "4",
    name: "Alex Kim",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop",
    bio: "Music producer | Guitar enthusiast | Daily practice warrior",
    joined: "December 2023",
    totalStreaks: 128,
    longestStreak: 45,
    activeStreaks: 4,
    websiteLinks: ["soundcloud.com/alexkimmusic", "spotify.com/artist/alexkim", "instagram.com/alexkimmusic", "alexkimmusic.com"],
  },
  {
    id: "5",
    name: "Jordan Taylor",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
    bio: "E-sports athlete | Consistency is key | Never miss a day",
    joined: "April 2024",
    totalStreaks: 98,
    longestStreak: 56,
    activeStreaks: 3,
    websiteLinks: ["youtube.com/@jordantaylorgaming", "twitch.tv/jordangaming"],
  },
];

const mockPosts: Post[] = [
  {
    id: "1",
    userId: "1",
    userName: "Sarah Chen",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    category: "Fitness",
    streakCount: 3,
    title: "5AM Workout Journey 💪",
    description: "Never thought I'd become a morning person, but here we are! Consistency is everything.",
    imageUrl: "https://images.unsplash.com/photo-1756115484694-009466dbaa67?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXRuZXNzJTIwd29ya291dCUyMGd5bXxlbnwxfHx8fDE3NjE1Njc0MjN8MA&ixlib=rb-4.1.0&q=80&w=1080",
    likes: 234,
    comments: [
      {
        id: "c1",
        userId: "2",
        userName: "Marcus Rodriguez",
        userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
        text: "Incredible dedication! Keep it up! 🔥",
        timestamp: "2h ago",
        likes: 5,
        isLiked: false,
      },
    ],
    timestamp: "3 hours ago",
    isParentStreak: true,
    streakDays: [
      {
        dayNumber: 1,
        imageUrl: "https://images.unsplash.com/photo-1756115484694-009466dbaa67?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXRuZXNzJTIwd29ya291dCUyMGd5bXxlbnwxfHx8fDE3NjE1Njc0MjN8MA&ixlib=rb-4.1.0&q=80&w=1080",
        description: "Day 1! Started with a 30-minute cardio session. Woke up at 5AM sharp!",
        postedAt: "2024-01-01T05:30:00Z",
        likes: 89,
        isLiked: false,
      },
      {
        dayNumber: 2,
        imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXRuZXNzJTIwd2VpZ2h0cyUyMGd5bXxlbnwxfHx8fDE3NjE1Njc0MjN8MA&ixlib=rb-4.1.0&q=80&w=1080",
        description: "Day 2! Added some weight training. Feeling stronger already!",
        postedAt: "2024-01-02T05:30:00Z",
        likes: 102,
        isLiked: false,
      },
      {
        dayNumber: 3,
        imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXRuZXNzJTIwY2xhc3MlMjBncm91cHxlbnwxfHx8fDE3NjE1Njc0MjN8MA&ixlib=rb-4.1.0&q=80&w=1080",
        description: "Day 3! Joined the early morning class. The energy is incredible!",
        postedAt: "2024-01-03T05:30:00Z",
        likes: 143,
        isLiked: false,
      },
    ],
  },
  {
    id: "2",
    userId: "2",
    userName: "Marcus Rodriguez",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
    category: "Gaming",
    streakCount: 67,
    title: "67-Day Win Streak in Apex Legends!",
    description: "Finally hit my goal! Rank progression has been insane. Who wants to squad up?",
    imageUrl: "https://images.unsplash.com/photo-1580234811497-9df7fd2f357e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYW1pbmclMjBjb250cm9sbGVyJTIwZXNwb3J0c3xlbnwxfHx8fDE3NjE0ODIwODJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    likes: 189,
    comments: [],
    timestamp: "5 hours ago",
  },
  {
    id: "3",
    userId: "3",
    userName: "Emily Watson",
    userAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
    category: "Goals",
    streakCount: 120,
    title: "120 Days of Morning Meditation 🧘‍♀️",
    description: "Four months of consistent mindfulness practice. My mental clarity has never been better!",
    imageUrl: "https://images.unsplash.com/photo-1592895792095-85fa785192a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpdGF0aW9uJTIweW9nYSUyMG1pbmRmdWxuZXNzfGVufDF8fHx8MTc2MTU3MzkwOXww&ixlib=rb-4.1.0&q=80&w=1080",
    likes: 312,
    comments: [
      {
        id: "c2",
        userId: "1",
        userName: "Sarah Chen",
        userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
        text: "This is so inspiring! How did you stay consistent?",
        timestamp: "1h ago",
        likes: 3,
        isLiked: false,
      },
      {
        id: "c3",
        userId: "3",
        userName: "Emily Watson",
        userAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
        text: "Same time every morning! Making it non-negotiable was key.",
        timestamp: "45m ago",
        likes: 7,
        isLiked: false,
      },
    ],
    timestamp: "7 hours ago",
  },
  {
    id: "4",
    userId: "4",
    userName: "Alex Kim",
    userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop",
    category: "Hobbies",
    streakCount: 45,
    title: "45 Days of Daily Guitar Practice! 🎸",
    description: "From struggling with basic chords to playing full songs. Practice really does make perfect!",
    imageUrl: "https://images.unsplash.com/photo-1760413209533-c65c9e6b538f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxndWl0YXIlMjBtdXNpYyUyMGhvYmJ5fGVufDF8fHx8MTc2MTU3MzkwOXww&ixlib=rb-4.1.0&q=80&w=1080",
    likes: 156,
    comments: [],
    timestamp: "1 day ago",
  },
  {
    id: "5",
    userId: "2",
    userName: "Marcus Rodriguez",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
    category: "Gambling",
    streakCount: 21,
    title: "21-Day Poker Winning Streak! ♠️",
    description: "Read the table, trust the process. Bankroll is looking healthy!",
    imageUrl: "https://images.unsplash.com/photo-1719228159189-148c8c45e634?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb2tlciUyMGNhc2lubyUyMGNhcmRzfGVufDF8fHx8MTc2MTU3MzkwOHww&ixlib=rb-4.1.0&q=80&w=1080",
    likes: 98,
    comments: [],
    timestamp: "2 days ago",
  },
  {
    id: "6",
    userId: "1",
    userName: "Sarah Chen",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    category: "Fitness",
    streakCount: 30,
    title: "30-Day Running Challenge Complete! 🏃‍���️",
    description: "Started with 1 mile, now running 5 miles daily. Marathon training here I come!",
    imageUrl: "https://images.unsplash.com/photo-1596913152332-e56f2cc8165c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxydW5uaW5nJTIwbWFyYXRob24lMjBmaXRuZXNzfGVufDF8fHx8MTc2MTU3MzkwOXww&ixlib=rb-4.1.0&q=80&w=1080",
    likes: 267,
    comments: [],
    timestamp: "3 days ago",
  },
];

type View = "feed" | "leaderboard" | "messages" | "arena" | "sync" | "profile" | "help";

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  userId: string | null;
  userName: string | null;
  isNewUser?: boolean;
}

interface UserProfile {
  name: string;
  alias?: string;
  avatar: string;
  bio: string;
  isPublic: boolean;
  websiteLinks?: string[];
  achievements?: string[];
}

export default function App() {
  const [currentView, setCurrentView] = useState<View>("feed");
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    accessToken: null,
    userId: null,
    userName: null,
    isNewUser: false,
  });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [viewingUserProfile, setViewingUserProfile] = useState<any | null>(null);
  const [messageUserId, setMessageUserId] = useState<string | null>(null);
  const [messageUserInfo, setMessageUserInfo] = useState<{ name: string; avatar: string } | null>(null);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; avatar: string }>>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [backingUserIds, setBackingUserIds] = useState<Set<string>>(new Set());
  const [profileBackingCounts, setProfileBackingCounts] = useState<{ backingCount: number; backerCount: number }>({ backingCount: 0, backerCount: 0 });

  // Users the current user has meaningfully interacted with, sorted by interaction depth
  const interactedUsers = useMemo(() => {
    const myId = authState.userId;
    if (!myId) return [];
    const scores = new Map<string, { user: { id: string; name: string; avatar: string }; score: number }>();

    const bump = (userId: string, name: string, avatar: string, points: number) => {
      if (userId === myId) return;
      const existing = scores.get(userId);
      if (existing) {
        existing.score += points;
      } else {
        scores.set(userId, { user: { id: userId, name, avatar }, score: points });
      }
    };

    // Posts you liked (+2), posts you commented on (+3), authors of posts you replied to (+2)
    posts.forEach(post => {
      if (post.isLiked) bump(post.userId, post.userName, post.userAvatar, 2);
      post.comments.forEach(c => {
        if (c.userId === myId) bump(post.userId, post.userName, post.userAvatar, 3);
        if (c.userId !== myId) {
          // someone commented on your post
          if (post.userId === myId) bump(c.userId, c.userName, c.userAvatar, 2);
          // you replied to their comment
          c.replies?.forEach(r => {
            if (r.userId === myId) bump(c.userId, c.userName, c.userAvatar, 2);
          });
        }
      });
    });

    // People you back (+4) and people who back you (+3)
    backingUserIds.forEach(uid => {
      const u = allUsers.find(x => x.id === uid);
      if (u) bump(u.id, u.name, u.avatar, 4);
    });

    // Also include allUsers who back the current user (backers) — pull from allUsers matched in posts
    posts.forEach(post => {
      if (post.userId !== myId) {
        // if they commented on my posts, already counted above
      }
    });

    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.user);
  }, [posts, backingUserIds, allUsers, authState.userId]);

  // Function to load posts from server
  const loadPosts = async (currentUserId?: string) => {
    const userId = currentUserId || authState.userId;
    try {
      const postsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/posts`,
        {
          headers: {
            "Authorization": `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!postsResponse.ok) {
        setPosts(mockPosts);
        return [];
      }

      const serverPosts = await postsResponse.json();

      if (Array.isArray(serverPosts)) {
        // Hydrate isLiked on each post and each streak day from likedBy arrays
        const hydratedPosts = serverPosts.map((post: any) => ({
          ...post,
          isLiked: userId ? (post.likedBy || []).includes(userId) : false,
          streakDays: post.streakDays?.map((day: any) => ({
            ...day,
            isLiked: userId ? (day.likedBy || []).includes(userId) : false,
          })),
        }));
        setPosts([...hydratedPosts, ...mockPosts]);
        return hydratedPosts;
      } else {
        setPosts(mockPosts);
        return [];
      }
    } catch (err) {
      setPosts(mockPosts);
      return [];
    }
  };

  // Function to manually refresh posts
  const refreshPosts = async () => {
    setIsRefreshing(true);
    await loadPosts();
    setIsRefreshing(false);
  };

  // Function to update user achievements
  const updateAchievements = async () => {
    if (!authState.isAuthenticated || !authState.userId) return;

    try {
      // Get user's posts
      const userPosts = posts.filter(p => p.userId === authState.userId);
      
      // Get current achievements
      const currentAchievements = userProfile?.achievements || [];
      
      // Calculate newly unlocked achievements
      const newAchievements = getNewlyUnlockedAchievements(userPosts, currentAchievements);
      
      if (newAchievements.length > 0) {
        // Get all unlocked achievement IDs
        const allUnlockedIds = getUnlockedAchievementIds(userPosts);
        
        // Update user profile with new achievements
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/user/${authState.userId}`,
          {
            method: 'PUT',
            headers: {
              "Authorization": `Bearer ${authState.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ achievements: allUnlockedIds }),
          }
        );

        if (response.ok) {
          const updatedUser = await response.json();
          setUserProfile({
            name: updatedUser.name || authState.userName || 'User',
            alias: updatedUser.alias,
            avatar: updatedUser.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${authState.userId}`,
            bio: updatedUser.bio || 'Streakz member 🔥',
            isPublic: updatedUser.isPublic ?? true,
            websiteLinks: updatedUser.websiteLinks || [],
            achievements: updatedUser.achievements || [],
          });

          // Show toast notification for new achievements
          newAchievements.forEach(achievementId => {
            const achievementName = achievementId.split('-').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            toast.success(`Achievement Unlocked: ${achievementName}! 🏆`);
          });
        }
      }
    } catch (error) {
      console.error("Error updating achievements:", error);
    }
  };

  // Check for existing session on mount and initialize demo account
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize demo account first and wait for it to complete
        try {
          const demoResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/init-demo`,
            {
              headers: {
                "Authorization": `Bearer ${publicAnonKey}`,
              },
            }
          );
          
          if (demoResponse.ok) {
            const demoResult = await demoResponse.json();
            console.log("Demo initialization result:", demoResult);
          }
        } catch (err) {
          // Silently fail - server may not be deployed yet
        }

        // Check for existing session
        const supabase = getSupabaseClient();
        let sessionUserId: string | null = null;

        try {
          const { data, error } = await supabase.auth.getSession();

          if (error) {
            console.warn("Auth session error, clearing session:", error.message);
            await supabase.auth.signOut();
            setAuthState({
              isAuthenticated: false,
              accessToken: null,
              userId: null,
              userName: null,
              isNewUser: false,
            });
          } else if (data?.session?.access_token && data?.session?.user?.id) {
            sessionUserId = data.session.user.id;
            const userName = data.session.user.user_metadata?.name || data.session.user.email?.split('@')[0] || "User";
            setAuthState({
              isAuthenticated: true,
              accessToken: data.session.access_token,
              userId: sessionUserId,
              userName,
            });
            await loadPosts(sessionUserId);
          }
        } catch (authError: any) {
          if (!authError?.message?.includes("Failed to fetch")) {
            console.warn("Failed to check auth session:", authError);
          }
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            // ignore
          }
          setAuthState({
            isAuthenticated: false,
            accessToken: null,
            userId: null,
            userName: null,
            isNewUser: false,
          });
        }

        // If no session was found, load posts without isLiked hydration
        if (!sessionUserId) await loadPosts();

        // Load all users from server
        try {
          const usersResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/users`,
            {
              headers: {
                "Authorization": `Bearer ${publicAnonKey}`,
              },
            }
          );
          
          if (usersResponse.ok) {
            const serverUsers = await usersResponse.json();
            console.log("Loaded users from server:", serverUsers);
            
            // Combine server users with mock users if serverUsers is an array
            if (Array.isArray(serverUsers)) {
              setAllUsers([...serverUsers, ...mockUsers.map(u => ({ id: u.id, name: u.name, avatar: u.avatar }))]);
            } else {
              setAllUsers(mockUsers.map(u => ({ id: u.id, name: u.name, avatar: u.avatar })));
            }
          } else {
            setAllUsers(mockUsers.map(u => ({ id: u.id, name: u.name, avatar: u.avatar })));
          }
        } catch (err) {
          // Silently fall back to mock users - server may not be deployed yet
          setAllUsers(mockUsers.map(u => ({ id: u.id, name: u.name, avatar: u.avatar })));
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    initializeApp();
  }, []);

  // Refresh posts periodically (every 30 seconds)
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const interval = setInterval(() => {
      loadPosts();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [authState.isAuthenticated]);

  // Refresh posts when app comes back to foreground
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadPosts();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [authState.isAuthenticated]);

  // Load user profile when authenticated
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!authState.isAuthenticated || !authState.userId) return;

      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/user/${authState.userId}`,
          {
            headers: {
              "Authorization": `Bearer ${authState.accessToken || publicAnonKey}`,
            },
          }
        );

        if (response.ok) {
          const profile = await response.json();
          setUserProfile({
            name: profile.name || authState.userName || 'User',
            alias: profile.alias,
            avatar: profile.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${authState.userId}`,
            bio: profile.bio || 'Streakz member 🔥',
            isPublic: true,
            websiteLinks: profile.websiteLinks || [],
            achievements: profile.achievements || [],
          });
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      }
    };

    loadUserProfile();
  }, [authState.isAuthenticated, authState.userId, authState.accessToken]);

  // Check and update achievements when posts change
  useEffect(() => {
    if (authState.isAuthenticated && posts.length > 0 && userProfile) {
      updateAchievements();
    }
  }, [posts.length, authState.isAuthenticated]);

  // Load backing list when authenticated and cleanup mock backing relationships
  useEffect(() => {
    const loadBackingList = async () => {
      if (!authState.isAuthenticated || !authState.accessToken) return;

      try {
        // First cleanup any backing relationships to mock users
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/cleanup-mock-backing`,
          {
            method: 'POST',
            headers: {
              "Authorization": `Bearer ${publicAnonKey}`,
            },
          }
        );
        
        // Try parameterized endpoint first, fall back to static route
        if (!authState.userId) return;
        let ids: string[] = [];
        let resolved = false;

        const r1 = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/users/${authState.userId}/backing-list`,
          { headers: { "Authorization": `Bearer ${authState.accessToken}` } }
        );
        if (r1.status === 401) {
          const supabase = getSupabaseClient();
          await supabase.auth.signOut();
          setAuthState({ isAuthenticated: false, accessToken: null, userId: null, userName: null });
          setBackingUserIds(new Set());
          return;
        }
        if (r1.ok) {
          const d = await r1.json();
          ids = (d.backing || []).map((u: any) => u.id);
          resolved = true;
        }

        if (!resolved) {
          const r2 = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/users/backing`,
            { headers: { "Authorization": `Bearer ${authState.accessToken}` } }
          );
          if (r2.status === 401) {
            const supabase = getSupabaseClient();
            await supabase.auth.signOut();
            setAuthState({ isAuthenticated: false, accessToken: null, userId: null, userName: null });
            setBackingUserIds(new Set());
            return;
          }
          if (r2.ok) {
            const d = await r2.json();
            ids = d.backingUserIds || [];
          }
        }

        setBackingUserIds(new Set(ids));
      } catch (error) {
        console.error("Error loading backing list:", error);
        setBackingUserIds(new Set());
      }
    };

    loadBackingList();
  }, [authState.isAuthenticated, authState.accessToken]);

  // Load backing counts for the profile being viewed
  useEffect(() => {
    const loadBackingCounts = async () => {
      // Determine which user's profile we're viewing
      const targetUserId = viewingUserId || authState.userId;
      if (!targetUserId) return;

      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/users/${targetUserId}/backing-counts`,
          {
            headers: {
              "Authorization": `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setProfileBackingCounts({
            backingCount: data.backingCount || 0,
            backerCount: data.backerCount || 0,
          });
        }
      } catch (error) {
        console.error("Error loading backing counts:", error);
      }
    };

    loadBackingCounts();
  }, [viewingUserId, authState.userId, backingUserIds]); // Reload when profile changes or backing status changes

  // Load viewing user's full profile
  useEffect(() => {
    const loadViewingUserProfile = async () => {
      if (!viewingUserId) {
        setViewingUserProfile(null);
        return;
      }

      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/user/${viewingUserId}`,
          {
            headers: {
              "Authorization": `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (response.ok) {
          const profile = await response.json();
          setViewingUserProfile(profile);
        }
      } catch (error) {
        console.error("Error loading viewing user profile:", error);
      }
    };

    loadViewingUserProfile();
  }, [viewingUserId]);

  const handleBackToggle = async (userId: string) => {
    if (!authState.accessToken) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/users/${userId}/back`,
        {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${authState.accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Update local state
        setBackingUserIds(prev => {
          const newSet = new Set(prev);
          if (data.isBacking) {
            newSet.add(userId);
          } else {
            newSet.delete(userId);
          }
          return newSet;
        });

        // Reload backing counts to reflect the change
        const countsResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/users/${userId}/backing-counts`,
          {
            headers: {
              "Authorization": `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (countsResponse.ok) {
          const countsData = await countsResponse.json();
          setProfileBackingCounts({
            backingCount: countsData.backingCount || 0,
            backerCount: countsData.backerCount || 0,
          });
        }
      } else {
        // Handle error response
        const errorData = await response.json();
        
        // Show user-friendly error message
        if (errorData.error === 'Cannot back demo users') {
          toast.error("Demo users cannot be backed. Try backing a real user!");
        } else if (errorData.error === 'Cannot back yourself') {
          toast.error("You cannot back yourself!");
        } else {
          console.error("Error from server:", errorData.error);
          toast.error(errorData.error || "Failed to update backing status");
        }
      }
    } catch (error) {
      console.error("Error toggling back status:", error);
      toast.error("Network error. Please try again.");
    }
  };

  const handleAuthSuccess = (accessToken: string, userId: string, userName: string, isNewUser: boolean = false) => {
    setAuthState({
      isAuthenticated: true,
      accessToken,
      userId,
      userName,
      isNewUser,
    });
    
    if (isNewUser) {
      setShowWelcome(true);
    }

    // Reload posts with the new userId so isLiked is properly hydrated
    loadPosts(userId);
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient();

      await supabase.auth.signOut();
      setAuthState({
        isAuthenticated: false,
        accessToken: null,
        userId: null,
        userName: null,
      });
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      if (!authState.userId || !authState.accessToken) {
        toast.error("You must be logged in to delete your account");
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/users/${authState.userId}`,
        {
          method: 'DELETE',
          headers: {
            "Authorization": `Bearer ${authState.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Failed to delete account");
        return;
      }

      const result = await response.json();
      
      toast.success("Account deleted successfully. Your username is now available for others.");
      
      // Log out after successful deletion
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      setAuthState({
        isAuthenticated: false,
        accessToken: null,
        userId: null,
        userName: null,
      });
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account. Please try again.");
    }
  };

  // Show loading state while checking auth
  if (isCheckingAuth) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: `url(${backgroundTexture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="text-center">
          <img 
            src={streakzLogo} 
            alt="Streakz Logo" 
            className="h-20 w-20 mx-auto mb-4 animate-pulse"
          />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // TEMPORARY: Show debug manager if URL has ?debug=alias
  if (typeof window !== 'undefined' && window.location.search.includes('debug=alias')) {
    return <DebugAliasManager />;
  }

  // Show auth view if not authenticated
  if (!authState.isAuthenticated) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  const currentUser = {
    id: authState.userId!,
    name: userProfile?.name || authState.userName!,
    avatar: userProfile?.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${authState.userId}`,
    bio: userProfile?.bio || "Streakz member 🔥",
    joined: "October 2024",
    totalStreaks: 0,
    longestStreak: 0,
    activeStreaks: 0,
    isPublic: userProfile?.isPublic ?? true,
    websiteLinks: userProfile?.websiteLinks || [],
    achievements: userProfile?.achievements || [],
  };

  const handleCreatePost = async (newPost: {
    category: string;
    streakCount: number;
    title: string;
    description: string;
    imageUrl: string;
    mediaType?: 'image' | 'video';
  }) => {
    try {
      const postData = {
        category: newPost.category.charAt(0).toUpperCase() + newPost.category.slice(1),
        streakCount: newPost.streakCount,
        title: newPost.title,
        description: newPost.description,
        imageUrl: newPost.imageUrl,
        mediaType: newPost.mediaType || 'image',
        likes: 0,
        comments: [],
        timestamp: "Just now",
        isParentStreak: true,
        streakDays: [{
          dayNumber: newPost.streakCount,
          imageUrl: newPost.imageUrl,
          mediaType: newPost.mediaType || 'image',
          description: newPost.description,
          postedAt: new Date().toISOString(),
          likes: 0,
          isLiked: false,
        }],
      };

      // Save to server
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/posts`,
        {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${authState.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(postData),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      const savedPost = await response.json();
      console.log("Post saved to server:", savedPost);

      // Refresh posts from server to ensure sync across devices
      await loadPosts();
    } catch (error) {
      console.error("Error creating post:", error);
      // Optionally show error to user
    }
  };

  const handleAddToStreak = async (streakId: string, dayData: {
    description: string;
    imageUrl: string;
    mediaType?: 'image' | 'video';
  }) => {
    try {
      const post = posts.find(p => p.id === streakId);
      if (!post) return;

      const currentDays = post.streakDays || [];
      const nextDayNumber = currentDays.length + 1;
      
      const newDay = {
        dayNumber: nextDayNumber,
        imageUrl: dayData.imageUrl,
        mediaType: dayData.mediaType || 'image',
        description: dayData.description,
        postedAt: new Date().toISOString(),
        likes: 0,
        isLiked: false,
      };

      const updatedPost = {
        ...post,
        streakCount: nextDayNumber,
        streakDays: [...currentDays, newDay],
        timestamp: "Just now",
      };

      // Update on server
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/posts/${streakId}`,
        {
          method: 'PUT',
          headers: {
            "Authorization": `Bearer ${authState.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedPost),
        }
      );

      if (response.ok) {
        // Refresh posts from server to ensure sync across devices
        await loadPosts();
      }
    } catch (error) {
      console.error("Error adding to streak:", error);
    }
  };

  const handleLike = async (postId: string) => {
    if (!authState.accessToken) return;

    // Optimistic update
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const isLiked = post.isLiked || false;
        const likedBy: string[] = post.likedBy || [];
        const updatedLikedBy = isLiked
          ? likedBy.filter((id: string) => id !== authState.userId)
          : [...likedBy, authState.userId!];
        return { ...post, isLiked: !isLiked, likes: updatedLikedBy.length, likedBy: updatedLikedBy };
      }
      return post;
    }));

    // Persist to server
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/posts/${postId}/like`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authState.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );
      if (res.ok) {
        const updated = await res.json();
        // Sync server truth (with isLiked hydrated)
        setPosts(prev => prev.map(post =>
          post.id === postId
            ? { ...updated, isLiked: (updated.likedBy || []).includes(authState.userId!) }
            : post
        ));
      }
    } catch {
      // Optimistic update stays; server will sync on next load
    }
  };

  const handleLikeDay = async (postId: string, dayNumber: number) => {
    if (!authState.accessToken) return;

    // Optimistic update
    setPosts(prev => prev.map(post => {
      if (post.id === postId && post.streakDays) {
        return {
          ...post,
          streakDays: post.streakDays.map(day => {
            if (day.dayNumber === dayNumber) {
              const isLiked = day.isLiked || false;
              const likedBy: string[] = day.likedBy || [];
              const updatedLikedBy = isLiked
                ? likedBy.filter((id: string) => id !== authState.userId)
                : [...likedBy, authState.userId!];
              return { ...day, isLiked: !isLiked, likes: updatedLikedBy.length, likedBy: updatedLikedBy };
            }
            return day;
          }),
        };
      }
      return post;
    }));

    // Persist to server
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/posts/${postId}/like`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authState.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ dayNumber }),
        }
      );
      if (res.ok) {
        const updated = await res.json();
        setPosts(prev => prev.map(post => {
          if (post.id !== postId) return post;
          return {
            ...updated,
            isLiked: (updated.likedBy || []).includes(authState.userId!),
            streakDays: updated.streakDays?.map((day: any) => ({
              ...day,
              isLiked: (day.likedBy || []).includes(authState.userId!),
            })),
          };
        }));
      }
    } catch {
      // Optimistic update stays
    }
  };

  const persistPost = async (post: Post) => {
    if (!authState.accessToken) return;
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/posts/${post.id}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${authState.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(post),
        }
      );
    } catch {
      // Silent — local state already updated
    }
  };

  const handleComment = (postId: string, comment: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const newComment: Comment = {
          id: Date.now().toString(),
          userId: authState.userId!,
          userName: userProfile?.name || authState.userName!,
          userAvatar: userProfile?.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${authState.userId}`,
          text: comment,
          timestamp: "Just now",
        };
        const updated = { ...post, comments: [...post.comments, newComment] };
        persistPost(updated);
        return updated;
      }
      return post;
    }));
  };

  const handleDeleteComment = (postId: string, commentId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const isTopLevelComment = post.comments.some(c => c.id === commentId);
        let updated: Post;
        if (isTopLevelComment) {
          updated = { ...post, comments: post.comments.filter(comment => comment.id !== commentId) };
        } else {
          updated = {
            ...post,
            comments: post.comments.map(comment => ({
              ...comment,
              replies: comment.replies?.filter(reply => reply.id !== commentId) || []
            }))
          };
        }
        persistPost(updated);
        return updated;
      }
      return post;
    }));
  };

  const handleCloseStreak = async (postId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id !== postId) return post;
      const updated = { ...post, isClosed: true };
      persistPost(updated);
      return updated;
    }));
    toast.success("Streak marked as ended 🏁");
  };

  const handleDeletePost = async (postId: string) => {
    try {
      // Delete from server first
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/posts/${postId}`,
        {
          method: 'DELETE',
          headers: {
            "Authorization": `Bearer ${authState.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error deleting post from server:", errorData);
        toast.error("Failed to delete post");
        return;
      }

      // Only update local state if server deletion was successful
      setPosts(posts.filter(post => post.id !== postId));
      toast.success("Post deleted successfully");
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  const handleLikeComment = (postId: string, commentId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const updated = {
          ...post,
          comments: post.comments.map(comment => {
            if (comment.id === commentId) {
              const isLiked = comment.isLiked || false;
              const currentLikes = comment.likes || 0;
              return { ...comment, isLiked: !isLiked, likes: isLiked ? currentLikes - 1 : currentLikes + 1 };
            }
            if (comment.replies) {
              return {
                ...comment,
                replies: comment.replies.map(reply => {
                  if (reply.id === commentId) {
                    const isLiked = reply.isLiked || false;
                    const currentLikes = reply.likes || 0;
                    return { ...reply, isLiked: !isLiked, likes: isLiked ? currentLikes - 1 : currentLikes + 1 };
                  }
                  return reply;
                }),
              };
            }
            return comment;
          })
        };
        persistPost(updated);
        return updated;
      }
      return post;
    }));
  };

  const handleReplyToComment = (postId: string, commentId: string, replyText: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const updated = {
          ...post,
          comments: post.comments.map(comment => {
            if (comment.id === commentId) {
              const newReply: Comment = {
                id: Date.now().toString(),
                userId: authState.userId!,
                userName: userProfile?.name || authState.userName!,
                userAvatar: userProfile?.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${authState.userId}`,
                text: replyText,
                timestamp: "Just now",
              };
              return { ...comment, replies: [...(comment.replies || []), newReply] };
            }
            return comment;
          })
        };
        persistPost(updated);
        return updated;
      }
      return post;
    }));
  };

  const handleUpdateProfile = async (updates: {
    name: string;
    avatar: string;
    bio: string;
    isPublic: boolean;
    websiteLinks: string[];
  }) => {
    setUserProfile(updates);
    
    // Update auth state with new name
    setAuthState(prev => ({
      ...prev,
      userName: updates.name,
    }));

    // Update all existing posts from this user
    setPosts(posts.map(post => {
      if (post.userId === authState.userId) {
        return {
          ...post,
          userName: updates.name,
          userAvatar: updates.avatar,
        };
      }
      return post;
    }));

    // Save to backend
    try {
      const userProfile = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/user/${authState.userId}`,
        {
          method: 'PUT',
          headers: {
            "Authorization": `Bearer ${authState.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        }
      );
      
      if (!userProfile.ok) {
        console.error("Failed to update profile on server");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleUserClick = (userId: string) => {
    console.log("handleUserClick called with userId:", userId);
    setViewingUserId(userId);
    setMessageUserId(null); // Clear messageUserId when viewing a profile
    setCurrentView("profile");
  };

  const handleMessageClick = (userId: string, userInfo?: { name: string; avatar: string }) => {
    setMessageUserId(userId);
    setMessageUserInfo(userInfo || null);
    setCurrentView("messages");
  };

  const userPosts = posts.filter(post => post.userId === currentUser.id);

  // Calculate user stats based on posts
  const calculateUserStats = () => {
    const totalStreaks = userPosts.length;
    const longestStreak = userPosts.length > 0 
      ? Math.max(...userPosts.map(post => post.streakCount))
      : 0;
    const activeStreaks = userPosts.length;

    return { totalStreaks, longestStreak, activeStreaks };
  };

  const userStats = calculateUserStats();

  // Update currentUser with calculated stats
  const currentUserWithStats = {
    ...currentUser,
    totalStreaks: userStats.totalStreaks,
    longestStreak: userStats.longestStreak,
    activeStreaks: userStats.activeStreaks,
  };

  // Get the profile user (either viewing another user or own profile)
  const getProfileUser = () => {
    if (!viewingUserId || viewingUserId === currentUserWithStats.id) {
      return currentUserWithStats;
    }
    
    // Find user from mockUsers first
    const mockUser = mockUsers.find(u => u.id === viewingUserId);
    if (mockUser) {
      return mockUser;
    }
    
    // Use the full profile if we have it
    if (viewingUserProfile) {
      // Calculate stats from their posts
      const userPostsFiltered = posts.filter(p => p.userId === viewingUserId);
      const totalStreaks = userPostsFiltered.length;
      const longestStreak = userPostsFiltered.length > 0 
        ? Math.max(...userPostsFiltered.map(post => post.streakCount))
        : 0;
      
      return {
        id: viewingUserProfile.id,
        name: viewingUserProfile.name,
        alias: viewingUserProfile.alias,
        avatar: viewingUserProfile.avatar,
        bio: viewingUserProfile.bio || "Streakz member 🔥",
        joined: viewingUserProfile.joined || "2024",
        totalStreaks,
        longestStreak,
        activeStreaks: totalStreaks,
        isPublic: viewingUserProfile.isPublic ?? true,
        websiteLinks: viewingUserProfile.websiteLinks || [],
        achievements: viewingUserProfile.achievements || [],
      };
    }
    
    // Find user from allUsers (includes server users)
    const serverUser = allUsers.find(u => u.id === viewingUserId);
    if (serverUser) {
      // Calculate stats from their posts
      const userPostsFiltered = posts.filter(p => p.userId === viewingUserId);
      const totalStreaks = userPostsFiltered.length;
      const longestStreak = userPostsFiltered.length > 0 
        ? Math.max(...userPostsFiltered.map(post => post.streakCount))
        : 0;
      
      return {
        id: serverUser.id,
        name: serverUser.name,
        avatar: serverUser.avatar,
        bio: "Streakz member 🔥",
        joined: "2024",
        totalStreaks,
        longestStreak,
        activeStreaks: totalStreaks,
        isPublic: true,
        achievements: [],
      };
    }
    
    // If not in allUsers, create a user object from their posts
    const userPost = posts.find(p => p.userId === viewingUserId);
    if (userPost) {
      const userPostsFiltered = posts.filter(p => p.userId === viewingUserId);
      const totalStreaks = userPostsFiltered.length;
      const longestStreak = userPostsFiltered.length > 0 
        ? Math.max(...userPostsFiltered.map(post => post.streakCount))
        : 0;
      
      return {
        id: viewingUserId,
        name: userPost.userName,
        avatar: userPost.userAvatar,
        bio: "Streakz member 🔥",
        joined: "2024",
        totalStreaks,
        longestStreak,
        activeStreaks: totalStreaks,
        isPublic: true,
        achievements: [],
      };
    }
    
    return currentUserWithStats;
  };

  const profileUser = getProfileUser();
  const profileUserPosts = posts.filter(post => post.userId === profileUser.id);
  const isOwnProfile = !viewingUserId || viewingUserId === currentUserWithStats.id;

  // Calculate leaderboard users with stats - only show real registered users with streaks
  const getLeaderboardUsers = () => {
    const mockUserIds = new Set(mockUsers.map(u => u.id));

    // Build user map from posts directly (catches users not yet in allUsers)
    const userMap = new Map<string, { id: string; name: string; avatar: string }>();
    allUsers.forEach(u => { if (!mockUserIds.has(u.id)) userMap.set(u.id, u); });
    posts.forEach(p => {
      if (!mockUserIds.has(p.userId) && !userMap.has(p.userId)) {
        userMap.set(p.userId, { id: p.userId, name: p.userName, avatar: p.userAvatar });
      }
    });
    const realUsers = Array.from(userMap.values());

    // Calculate stats for each real user based on their posts
    const usersWithStats = realUsers.map(user => {
      const userPostsFiltered = posts.filter(p => p.userId === user.id);
      // Count total streak days across all posts
      const totalStreaks = userPostsFiltered.reduce((sum, post) => {
        if (post.isParentStreak && post.streakDays) {
          return sum + post.streakDays.length;
        }
        return sum + (post.streakCount || 1);
      }, 0);
      const longestStreak = userPostsFiltered.length > 0
        ? Math.max(...userPostsFiltered.map(post => post.streakCount || 1))
        : 0;

      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        totalStreaks,
        longestStreak,
      };
    });

    // Return all users who have at least one streak, sorted by totalStreaks desc
    return usersWithStats
      .filter(user => user.totalStreaks > 0)
      .sort((a, b) => b.totalStreaks - a.totalStreaks);
  };

  const leaderboardUsers = getLeaderboardUsers();

  // Check for debug mode
  const urlParams = new URLSearchParams(window.location.search);
  const debugMode = urlParams.get('debug');
  
  // If debug=alias is in the URL, show the debug manager
  if (debugMode === 'alias') {
    return <DebugAliasManager />;
  }

  return (
    <div 
      className="min-h-screen"
      style={{
        backgroundImage: `url(${backgroundTexture})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-lg">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img 
              src={streakzLogo} 
              alt="Streakz Logo" 
              className="h-8 w-8 sm:h-10 sm:w-10"
            />
            <h1 className="text-[rgb(245,100,29)] hidden sm:block">Streakz</h1>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <CreatePostDialog 
              accessToken={authState.accessToken || undefined}
              onCreatePost={handleCreatePost}
              onAddToStreak={handleAddToStreak}
              userPosts={posts}
              currentUserId={authState.userId}
            />
            <UserMenu
              userName={currentUserWithStats.name}
              userAvatar={currentUserWithStats.avatar}
              onLogout={handleLogout}
              onViewProfile={() => {
                setViewingUserId(null);
                setCurrentView("profile");
              }}
              onViewHelpSupport={() => {
                setCurrentView("help");
              }}
              onDeleteAccount={handleDeleteAccount}
            />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-20 lg:pb-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Desktop Sidebar Navigation */}
          <aside className="hidden lg:block lg:w-64 flex-shrink-0">
            <nav className="sticky top-20 space-y-2">
              <Button
                variant={currentView === "feed" ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 text-[rgb(255,255,255)] hover:text-black" 
                onClick={() => setCurrentView("feed")}
              >
                <Home className="h-5 w-5" />
                Feed
              </Button>
              <Button
                variant={currentView === "leaderboard" ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 text-white hover:text-black" 
                onClick={() => setCurrentView("leaderboard")}
              >
                <Trophy className="h-5 w-5" />
                Leaderboard
              </Button>
              <Button
                variant={currentView === "messages" ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 text-white hover:text-black"
                onClick={() => setCurrentView("messages")}
              >
                <MessageSquare className="h-5 w-5" />
                Messages
              </Button>
              <Button
                variant={currentView === "arena" ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 text-white hover:text-black"
                onClick={() => setCurrentView("arena")}
              >
                <Swords className="h-5 w-5" />
                Arena
              </Button>
              <Button
                variant={currentView === "sync" ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 text-white hover:text-black"
                onClick={() => setCurrentView("sync")}
              >
                <Radio className="h-5 w-5" />
                Sync
              </Button>
              <Button
                variant={currentView === "profile" ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 text-white hover:text-black"
                onClick={() => {
                  setViewingUserId(null);
                  setCurrentView("profile");
                }}
              >
                <User className="h-5 w-5" />
                Profile
              </Button>
            </nav>
          </aside>

          {/* Main Content */}
          <main className={`flex-1 w-full ${currentView === "messages" || currentView === "arena" ? "" : "lg:max-w-2xl"}`}>
            {currentView === "feed" && (
              <FeedView
                posts={posts}
                currentUserId={currentUserWithStats.id}
                onLike={handleLike}
                onLikeDay={handleLikeDay}
                onUserClick={handleUserClick}
                onComment={handleComment}
                onDeleteComment={handleDeleteComment}
                onLikeComment={handleLikeComment}
                onDeletePost={handleDeletePost}
                onCloseStreak={handleCloseStreak}
                onReplyToComment={handleReplyToComment}
                onRefresh={refreshPosts}
                isRefreshing={isRefreshing}
                allUsers={interactedUsers}
              />
            )}
            {currentView === "leaderboard" && (
              <LeaderboardView 
                users={leaderboardUsers} 
                onUserClick={handleUserClick}
              />
            )}
            {currentView === "messages" && (
              <MessagesView 
                currentUserId={currentUserWithStats.id}
                currentUserName={currentUserWithStats.name}
                currentUserAvatar={currentUserWithStats.avatar}
                onUserClick={handleUserClick}
                selectedUserId={messageUserId}
                selectedUserInfo={messageUserInfo}
                onConversationOpened={() => { setMessageUserId(null); setMessageUserInfo(null); }}
                allUsers={(() => {
                  const merged = new Map(allUsers.map(u => [u.id, u]));
                  posts.forEach(p => {
                    if (!merged.has(p.userId)) merged.set(p.userId, { id: p.userId, name: p.userName, avatar: p.userAvatar });
                  });
                  return Array.from(merged.values());
                })()}
                accessToken={authState.accessToken || undefined}
              />
            )}
            {currentView === "arena" && (
              <ArenaView 
                posts={posts}
                currentUserId={currentUserWithStats.id}
                onLike={handleLike}
                onLikeDay={handleLikeDay}
                onComment={handleComment}
                onDeleteComment={handleDeleteComment}
                onLikeComment={handleLikeComment}
                onDeletePost={handleDeletePost}
                onCloseStreak={handleCloseStreak}
                onReplyToComment={handleReplyToComment}
                onUserClick={handleUserClick}
                onRefresh={refreshPosts}
                isRefreshing={isRefreshing}
                allUsers={interactedUsers}
              />
            )}
            {currentView === "sync" && (
              <SyncView 
                currentUserId={currentUserWithStats.id}
                currentUserName={currentUserWithStats.name}
                currentUserAvatar={currentUserWithStats.avatar}
                onUserClick={handleUserClick}
                accessToken={authState.accessToken || undefined}
              />
            )}
            {currentView === "profile" && (
              <ProfileView 
                user={profileUser} 
                posts={profileUserPosts}
                currentUserId={currentUserWithStats.id}
                onLike={handleLike}
                onLikeDay={handleLikeDay}
                onComment={handleComment}
                onDeleteComment={handleDeleteComment}
                onLikeComment={handleLikeComment}
                onDeletePost={handleDeletePost}
                onCloseStreak={handleCloseStreak}
                onUpdateProfile={isOwnProfile ? handleUpdateProfile : undefined}
                isOwnProfile={isOwnProfile}
                onReplyToComment={handleReplyToComment}
                onUserClick={handleUserClick}
                onMessageClick={handleMessageClick}
                isBacking={backingUserIds.has(profileUser.id)}
                onBackToggle={handleBackToggle}
                backingCount={profileBackingCounts.backingCount}
                backerCount={profileBackingCounts.backerCount}
                allUsers={interactedUsers}
              />
            )}
            {currentView === "help" && (
              <HelpSupportView />
            )}
          </main>

          {/* Right Sidebar - Trending */}
          {currentView !== "messages" && currentView !== "arena" && currentView !== "sync" && currentView !== "help" && (
            <aside className="hidden xl:block w-80 flex-shrink-0">
              <div className="sticky top-20 space-y-6">
                <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-md p-4">
                  <h3 className="text-white mb-4">Trending Categories</h3>
                  <div className="space-y-3">
                    {[
                      { name: "Fitness", count: "1.2k active", color: "from-green-500 to-emerald-500" },
                      { name: "Gaming", count: "987 active", color: "from-purple-500 to-pink-500" },
                      { name: "Goals", count: "856 active", color: "from-rose-500 to-red-500" },
                      { name: "Hobbies", count: "654 active", color: "from-blue-500 to-cyan-500" },
                    ].map((category) => (
                      <div key={category.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                        <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${category.color}`} />
                        <div className="flex-1">
                          <p className="text-sm text-white">{category.name}</p>
                          <p className="text-xs text-gray-400">{category.count}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-md p-4">
                  <h3 className="text-white mb-4">Top Streakers This Week</h3>
                  <div className="space-y-3">
                    {mockUsers.slice(0, 3).map((user, index) => (
                      <div 
                        key={user.id} 
                        className="flex items-center gap-3 cursor-pointer hover:bg-white/5 rounded-lg p-2 -m-2 transition-colors"
                        onClick={() => handleUserClick(user.id)}
                      >
                        <span className="text-gray-400 text-sm w-4">{index + 1}</span>
                        <img 
                          src={user.avatar} 
                          alt={user.name}
                          className="h-8 w-8 rounded-full object-cover ring-2 ring-transparent hover:ring-orange-500 transition-all"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate hover:text-orange-500 transition-colors">{user.alias || user.name}</p>
                        </div>
                        <div className="flex items-center gap-1 text-orange-500">
                          <Flame className="h-3 w-3" />
                          <span className="text-xs">{user.totalStreaks}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/80 backdrop-blur-lg">
        <div className="flex items-center justify-around h-16 px-2">
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-1 h-14 px-3 ${
              currentView === "feed" 
                ? "text-[rgb(245,100,29)]" 
                : "text-white/70 hover:text-white"
            }`}
            onClick={() => setCurrentView("feed")}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Feed</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-1 h-14 px-2 ${
              currentView === "arena" 
                ? "text-[rgb(245,100,29)]" 
                : "text-white/70 hover:text-white"
            }`}
            onClick={() => setCurrentView("arena")}
          >
            <Swords className="h-5 w-5" />
            <span className="text-xs">Arena</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-1 h-14 px-2 ${
              currentView === "sync" 
                ? "text-[rgb(245,100,29)]" 
                : "text-white/70 hover:text-white"
            }`}
            onClick={() => setCurrentView("sync")}
          >
            <Radio className="h-5 w-5" />
            <span className="text-xs">Sync</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-1 h-14 px-2 ${
              currentView === "leaderboard" 
                ? "text-[rgb(245,100,29)]" 
                : "text-white/70 hover:text-white"
            }`}
            onClick={() => setCurrentView("leaderboard")}
          >
            <Trophy className="h-5 w-5" />
            <span className="text-xs">Board</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-1 h-14 px-2 ${
              currentView === "messages" 
                ? "text-[rgb(245,100,29)]" 
                : "text-white/70 hover:text-white"
            }`}
            onClick={() => setCurrentView("messages")}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs">Chat</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-1 h-14 px-2 ${
              currentView === "profile" 
                ? "text-[rgb(245,100,29)]" 
                : "text-white/70 hover:text-white"
            }`}
            onClick={() => {
              setViewingUserId(null);
              setCurrentView("profile");
            }}
          >
            <User className="h-5 w-5" />
            <span className="text-xs">Profile</span>
          </Button>
        </div>
      </nav>

      {/* Welcome Dialog for New Users */}
      {showWelcome && authState.userName && (
        <WelcomeDialog
          userName={authState.userName}
          onClose={() => setShowWelcome(false)}
        />
      )}

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}
