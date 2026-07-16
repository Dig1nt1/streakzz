import { Post } from "../components/PostCard";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export const ACHIEVEMENT_DEFINITIONS = [
  {
    id: "first-streak",
    name: "First Streak",
    description: "Create your first streak",
    icon: "🔥",
    criteria: (posts: Post[]) => posts.length >= 1,
  },
  {
    id: "week-warrior",
    name: "Week Warrior",
    description: "Maintain a 7-day streak",
    icon: "⚔️",
    criteria: (posts: Post[]) => {
      return posts.some(post => {
        if (post.isParentStreak && post.streakDays) {
          return post.streakDays.length >= 7;
        }
        return post.streakCount >= 7;
      });
    },
  },
  {
    id: "month-master",
    name: "Month Master",
    description: "Maintain a 30-day streak",
    icon: "📅",
    criteria: (posts: Post[]) => {
      return posts.some(post => {
        if (post.isParentStreak && post.streakDays) {
          return post.streakDays.length >= 30;
        }
        return post.streakCount >= 30;
      });
    },
  },
  {
    id: "year-champion",
    name: "Year Champion",
    description: "Maintain a 365-day streak",
    icon: "👑",
    criteria: (posts: Post[]) => {
      return posts.some(post => {
        if (post.isParentStreak && post.streakDays) {
          return post.streakDays.length >= 365;
        }
        return post.streakCount >= 365;
      });
    },
  },
  {
    id: "consistency-king",
    name: "Consistency King",
    description: "Have 3 active streaks simultaneously",
    icon: "⭐",
    criteria: (posts: Post[]) => {
      const activeParentStreaks = posts.filter(post => post.isParentStreak);
      return activeParentStreaks.length >= 3;
    },
  },
  {
    id: "multi-category",
    name: "Multi-Category",
    description: "Create streaks in 3 different categories",
    icon: "🎯",
    criteria: (posts: Post[]) => {
      const categories = new Set(posts.map(post => post.category));
      return categories.size >= 3;
    },
  },
  {
    id: "100-likes",
    name: "100 Likes",
    description: "Receive 100 total likes across all posts",
    icon: "❤️",
    criteria: (posts: Post[]) => {
      const totalLikes = posts.reduce((sum, post) => {
        if (post.isParentStreak && post.streakDays) {
          return sum + post.streakDays.reduce((daySum, day) => daySum + (day.likes || 0), 0);
        }
        return sum + (post.likes || 0);
      }, 0);
      return totalLikes >= 100;
    },
  },
  {
    id: "social-star",
    name: "Social Star",
    description: "Receive 50 comments across all posts",
    icon: "💬",
    criteria: (posts: Post[]) => {
      const totalComments = posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0);
      return totalComments >= 50;
    },
  },
];

/**
 * Calculate which achievements a user has unlocked based on their posts
 */
export function calculateAchievements(posts: Post[], existingAchievements: string[] = []): Achievement[] {
  const achievements: Achievement[] = ACHIEVEMENT_DEFINITIONS.map(def => {
    const isUnlocked = def.criteria(posts);
    const wasAlreadyUnlocked = existingAchievements.includes(def.id);
    
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      unlocked: isUnlocked,
      unlockedAt: wasAlreadyUnlocked ? undefined : (isUnlocked ? new Date().toISOString() : undefined),
    };
  });

  return achievements;
}

/**
 * Get list of newly unlocked achievement IDs
 */
export function getNewlyUnlockedAchievements(
  posts: Post[], 
  existingAchievementIds: string[]
): string[] {
  const currentAchievements = calculateAchievements(posts, existingAchievementIds);
  const newlyUnlocked = currentAchievements
    .filter(a => a.unlocked && !existingAchievementIds.includes(a.id))
    .map(a => a.id);
  
  return newlyUnlocked;
}

/**
 * Get all unlocked achievement IDs
 */
export function getUnlockedAchievementIds(posts: Post[]): string[] {
  const achievements = calculateAchievements(posts);
  return achievements.filter(a => a.unlocked).map(a => a.id);
}
