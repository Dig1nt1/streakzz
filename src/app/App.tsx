import { useState, useEffect, useMemo } from "react";
import { Home, Trophy, User, Send, Swords, Radio, Plus, Menu } from "lucide-react";
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
import { Post, Comment, StreakDay } from "./components/PostCard";
import { Button } from "./components/ui/button";
import { getSupabaseClient } from "./utils/supabase/client";
import { projectId, publicAnonKey } from "./utils/supabase/info";
import streakzLogo from "figma:asset/0b5993ed4ace0b1938a06682c91bcf77a5cd9292.png";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
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
        const markComment = (comment: any): any => ({
          ...comment,
          isLiked: userId ? (comment.likedBy || []).includes(userId) : !!comment.isLiked,
          replies: (comment.replies || []).map(markComment),
        });
        const hydratedPosts = serverPosts.map((post: any) => ({
          ...post,
          isLiked: userId ? (post.likedBy || []).includes(userId) : false,
          comments: (post.comments || []).map(markComment),
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
            bio: updatedUser.bio || 'Streakz member',
            isPublic: updatedUser.isPublic ?? true,
            websiteLinks: updatedUser.websiteLinks || [],
            achievements: updatedUser.achievements || [],
          });

          // Show toast notification for new achievements
          newAchievements.forEach(achievementId => {
            const achievementName = achievementId.split('-').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            toast.success(`Achievement unlocked: ${achievementName}`);
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
            bio: profile.bio || 'Streakz member',
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
      <div className="min-h-screen flex items-center justify-center bg-ground">
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


  // Show auth view if not authenticated
  if (!authState.isAuthenticated) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  const currentUser = {
    id: authState.userId!,
    name: userProfile?.name || authState.userName!,
    avatar: userProfile?.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${authState.userId}`,
    bio: userProfile?.bio || "Streakz member",
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

  // Comments, replies and comment likes go through their own endpoints; the server
  // decides who wrote what and returns the whole post, which replaces the local copy.
  const hydratePost = (post: any): Post => {
    const userId = authState.userId;
    const markComment = (comment: any): Comment => ({
      ...comment,
      isLiked: userId ? (comment.likedBy || []).includes(userId) : false,
      replies: (comment.replies || []).map(markComment),
    });
    return {
      ...post,
      isLiked: userId ? (post.likedBy || []).includes(userId) : false,
      comments: (post.comments || []).map(markComment),
      streakDays: post.streakDays?.map((day: any) => ({
        ...day,
        isLiked: userId ? (day.likedBy || []).includes(userId) : false,
      })),
    };
  };

  const commentRequest = async (postId: string, path: string, method: "POST" | "DELETE", body?: object) => {
    if (!authState.accessToken) return;
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/posts/${encodeURIComponent(postId)}/comments${path}`,
        {
          method,
          headers: { "Authorization": `Bearer ${authState.accessToken}`, "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        }
      );
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const updated = hydratePost(await response.json());
      setPosts(prev => prev.map(post => (post.id === postId ? updated : post)));
    } catch (error) {
      console.error("Comment request failed:", error);
      toast.error("That didn't save. Please try again.");
    }
  };

  const handleComment = (postId: string, comment: string) => {
    commentRequest(postId, "", "POST", { text: comment });
  };

  const handleDeleteComment = (postId: string, commentId: string) => {
    commentRequest(postId, `/${encodeURIComponent(commentId)}`, "DELETE");
  };

  const handleCloseStreak = async (postId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/posts/${encodeURIComponent(postId)}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${authState.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ isClosed: true }),
        }
      );
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      setPosts(prev => prev.map(post => (post.id === postId ? { ...post, isClosed: true } : post)));
      toast.success("Streak marked as ended");
    } catch (error) {
      console.error("Error closing streak:", error);
      toast.error("Couldn't end the streak. Please try again.");
    }
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
    commentRequest(postId, `/${encodeURIComponent(commentId)}/like`, "POST");
  };

  const handleReplyToComment = (postId: string, commentId: string, replyText: string) => {
    commentRequest(postId, "", "POST", { text: replyText, parentId: commentId });
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
        bio: viewingUserProfile.bio || "Streakz member",
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
        bio: "Streakz member",
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
        bio: "Streakz member",
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


  const navItems: Array<{ view: View; label: string; short: string; icon: typeof Home }> = [
    { view: "feed", label: "Feed", short: "Feed", icon: Home },
    { view: "arena", label: "Arena", short: "Arena", icon: Swords },
    { view: "sync", label: "Sync", short: "Sync", icon: Radio },
    { view: "leaderboard", label: "Leaderboard", short: "Board", icon: Trophy },
    { view: "messages", label: "Messages", short: "Chat", icon: Send },
    { view: "profile", label: "Profile", short: "Profile", icon: User },
  ];
  const goTo = (view: View) => {
    if (view === "profile") setViewingUserId(null);
    setCurrentView(view);
  };
  // Instagram-style rail order; Post streak and Profile follow these.
  const railItems = navItems.filter(item => item.view !== "profile");
  const railLabel =
    "pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-raised px-2.5 py-1.5 text-[13px] font-medium text-white opacity-0 shadow-[0_8px_24px_rgba(0,0,0,.45)] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100";
  const showRail = currentView === "feed" || currentView === "leaderboard" || currentView === "profile";
  const trendingCategories = [
    { name: "Fitness", active: 1200 },
    { name: "Gaming", active: 987 },
    { name: "Goals", active: 856 },
    { name: "Hobbies", active: 654 },
  ];

  return (
    <div className="min-h-screen bg-ground">
      {/* Desktop: an icon rail on the left, Instagram-style; each name appears on hover or focus */}
      <aside
        aria-label="Main"
        className="fixed inset-y-0 left-0 z-50 hidden w-[72px] flex-col items-center border-r border-rule bg-ground py-6 lg:flex"
      >
        <button onClick={() => goTo("feed")} aria-label="Streakz home" className="group relative grid h-12 w-12 place-items-center rounded-xl hover:bg-raised">
          <img src={streakzLogo} alt="" className="h-8 w-8" />
          <span className={railLabel}>Streakz</span>
        </button>

        <nav className="mt-auto mb-auto flex flex-col items-center gap-2">
          {railItems.map(item => {
            const Icon = item.icon;
            const active = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => goTo(item.view)}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={`group relative grid h-12 w-12 place-items-center rounded-xl transition-colors hover:bg-raised ${active ? "text-white" : "text-[#d6d3cf] hover:text-white"}`}
              >
                <Icon className="h-6 w-6" strokeWidth={active ? 2.6 : 1.8} />
                <span className={railLabel}>{item.label}</span>
              </button>
            );
          })}

          <CreatePostDialog
            accessToken={authState.accessToken || undefined}
            onCreatePost={handleCreatePost}
            onAddToStreak={handleAddToStreak}
            userPosts={posts}
            currentUserId={authState.userId}
            trigger={
              <button aria-label="Post streak" className="group relative grid h-12 w-12 place-items-center rounded-xl text-[#d6d3cf] transition-colors hover:bg-raised hover:text-white">
                <Plus className="h-6 w-6" strokeWidth={1.8} />
                <span className={railLabel}>Post streak</span>
              </button>
            }
          />

          <button
            onClick={() => goTo("profile")}
            aria-label="Profile"
            aria-current={currentView === "profile" && !viewingUserId ? "page" : undefined}
            className="group relative grid h-12 w-12 place-items-center rounded-xl hover:bg-raised"
          >
            <img
              src={currentUserWithStats.avatar}
              alt=""
              className={`h-7 w-7 rounded-full object-cover ${currentView === "profile" && !viewingUserId ? "ring-2 ring-white ring-offset-2 ring-offset-ground" : ""}`}
            />
            <span className={railLabel}>Profile</span>
          </button>
        </nav>

        <UserMenu
          userName={currentUserWithStats.name}
          userAvatar={currentUserWithStats.avatar}
          onLogout={handleLogout}
          onViewProfile={() => goTo("profile")}
          onViewHelpSupport={() => setCurrentView("help")}
          onDeleteAccount={handleDeleteAccount}
          side="right"
          align="end"
          trigger={
            <button aria-label="More" className="group relative grid h-12 w-12 place-items-center rounded-xl text-[#d6d3cf] transition-colors hover:bg-raised hover:text-white">
              <Menu className="h-6 w-6" strokeWidth={1.8} />
              <span className={railLabel}>More</span>
            </button>
          }
        />
      </aside>

      {/* Phone and tablet: a slim top bar; the destinations live in the bottom bar */}
      <header className="sticky top-0 z-50 border-b border-rule bg-ground lg:hidden">
        <div className="px-4 sm:px-6 h-14 flex items-center gap-3">
          <button onClick={() => goTo("feed")} className="flex items-center gap-2 shrink-0" aria-label="Streakz home">
            <img src={streakzLogo} alt="" className="h-7 w-7" />
            <span className="text-[17px] font-semibold tracking-tight text-white">Streakz</span>
          </button>
          <div className="ml-auto flex items-center gap-2">
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
              onViewProfile={() => goTo("profile")}
              onViewHelpSupport={() => {
                setCurrentView("help");
              }}
              onDeleteAccount={handleDeleteAccount}
            />
          </div>
        </div>
      </header>

      <div className="lg:pl-[72px]">
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6 pt-6 pb-24 lg:pt-8 lg:pb-10">
        <div className={showRail ? "grid items-start gap-[14px] xl:grid-cols-[minmax(0,1fr)_320px]" : ""}>
          <main className="min-w-0">
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

          {/* Right rail: who leads this week, and where people are active */}
          {showRail && (
            <aside className="hidden xl:flex flex-col gap-[14px] sticky top-20">
              <section className="rounded-[20px] bg-surface p-[22px]">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-white">Top streakers this week</h2>
                  <button onClick={() => goTo("leaderboard")} className="text-[13px] font-medium text-muted-text hover:text-white">View board</button>
                </div>
                {mockUsers.slice(0, 3).map((user, index) => (
                  <button
                    key={user.id}
                    className="grid w-full grid-cols-[18px_32px_minmax(0,1fr)_auto] items-center gap-2.5 h-11 -mx-2 px-2 rounded-[10px] text-left hover:bg-raised transition-colors"
                    style={{ width: "calc(100% + 16px)" }}
                    onClick={() => handleUserClick(user.id)}
                  >
                    <span className="text-faint text-sm tabular-nums">{index + 1}</span>
                    <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                    <span className="truncate text-sm font-medium text-white">{user.alias || user.name}</span>
                    <span className="text-sm text-white tabular-nums">{user.totalStreaks}<span className="ml-1 text-faint">streaks</span></span>
                  </button>
                ))}
              </section>

              <section className="rounded-[20px] bg-surface p-[22px]">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-semibold text-white">Trending categories</h2>
                  <span className="text-xs text-faint">Active this week</span>
                </div>
                {trendingCategories.map((category, index) => (
                  <div key={category.name} className="py-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-white">{category.name}</span>
                      <span className="text-muted-text tabular-nums">{category.active.toLocaleString("en-US")}</span>
                    </div>
                    <div className="mt-2 h-0.5 bg-raised">
                      <div
                        className={index === 0 ? "h-full bg-white" : "h-full bg-[#6b6b6b]"}
                        style={{ width: `${Math.round((category.active / trendingCategories[0].active) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </section>
            </aside>
          )}
        </div>
      </div>

      </div>

      {/* Mobile bottom navigation */}
      <nav aria-label="Main" className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-rule bg-ground">
        <div className="grid grid-cols-6 h-16 px-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => goTo(item.view)}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  active ? "text-white" : "text-faint hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
                {item.short}
              </button>
            );
          })}
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
