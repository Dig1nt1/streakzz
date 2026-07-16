import { Trophy, Flame, TrendingUp } from "lucide-react";
import { Card } from "./ui/card";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";

interface LeaderboardUser {
  id: string;
  name: string;
  avatar: string;
  totalStreaks: number;
  longestStreak: number;
  category?: string;
}

interface LeaderboardViewProps {
  users: LeaderboardUser[];
  onUserClick?: (userId: string) => void;
}

export function LeaderboardView({ users, onUserClick }: LeaderboardViewProps) {
  const sortedUsers = [...users].sort((a, b) => b.totalStreaks - a.totalStreaks);
  
  const getMedalColor = (rank: number) => {
    if (rank === 0) return "from-yellow-500 to-amber-500";
    if (rank === 1) return "from-slate-300 to-slate-400";
    if (rank === 2) return "from-amber-700 to-amber-800";
    return "from-slate-600 to-slate-700";
  };

  const getMedalIcon = (rank: number) => {
    if (rank < 3) {
      return <Trophy className="h-5 w-5 text-white" />;
    }
    return <span className="text-white">{rank + 1}</span>;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
          <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </div>
        <div className="min-w-0">
          <h2 className="text-white text-base sm:text-xl">Leaderboard</h2>
          <p className="text-gray-300 text-xs sm:text-sm hidden sm:block">
            {sortedUsers.length > 0 ? 'Users with the most streaks' : 'No streaks yet'}
          </p>
        </div>
      </div>

      {sortedUsers.length === 0 ? (
        <Card className="p-6 sm:p-8 border-white/10 bg-black/40 backdrop-blur-md text-center">
          <Trophy className="h-12 w-12 sm:h-16 sm:w-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-white text-base sm:text-lg mb-2">No Streaks Yet</h3>
          <p className="text-gray-400 text-sm">
            Be the first to create a streak and claim the top spot! 🔥
          </p>
        </Card>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {sortedUsers.map((user, index) => (
          <Card 
            key={user.id} 
            className="p-3 sm:p-4 border-white/10 bg-black/40 backdrop-blur-md cursor-pointer hover:bg-black/60 transition-colors"
            onClick={() => onUserClick?.(user.id)}
          >
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Rank Badge */}
              <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br ${getMedalColor(index)} flex items-center justify-center flex-shrink-0`}>
                <span className="text-white text-xs sm:text-base">{index < 3 ? <Trophy className="h-4 w-4 sm:h-5 sm:w-5" /> : index + 1}</span>
              </div>

              {/* User Info */}
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 hover:ring-2 hover:ring-orange-500 transition-all">
                <img src={user.avatar} alt={user.name} className="object-cover" />
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-white truncate hover:text-orange-500 transition-colors text-sm sm:text-base">{user.alias || user.name}</h4>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Longest: {user.longestStreak} days
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 sm:gap-6">
                <div className="text-right">
                  <div className="flex items-center gap-1 sm:gap-1.5 text-orange-500">
                    <Flame className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-white text-sm sm:text-base">{user.totalStreaks}</span>
                  </div>
                  <p className="text-gray-400 text-xs">Total Streaks</p>
                </div>
                
                {index < 3 && (
                  <Badge variant="outline" className="bg-gradient-to-r from-orange-500/10 to-red-500/10 text-orange-500 border-orange-500/20">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Top 3
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        ))}
        </div>
      )}
    </div>
  );
}
