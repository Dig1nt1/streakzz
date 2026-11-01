import { Trophy } from "lucide-react";
import { PageHeader } from "./PageHeader";

interface LeaderboardUser {
  id: string;
  name: string;
  alias?: string;
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
  const leader = sortedUsers[0];
  const runnerUp = sortedUsers[1];

  return (
    <div>
      <PageHeader
        title="Leaderboard"
        subtitle={
          leader && runnerUp
            ? <>{leader.alias || leader.name} leads with <span className="tabular-nums text-white">{leader.totalStreaks}</span> streaks, <span className="tabular-nums">{leader.totalStreaks - runnerUp.totalStreaks}</span> ahead of second place.</>
            : sortedUsers.length > 0 ? "Users with the most streaks" : "No streaks yet"
        }
      />

      {sortedUsers.length === 0 ? (
        <section className="rounded-[20px] bg-surface p-8 text-center">
          <Trophy className="mx-auto mb-4 h-10 w-10 text-faint" strokeWidth={1.5} />
          <h2 className="mb-1 text-base font-semibold text-white">No streaks yet</h2>
          <p className="text-sm text-muted-text">Be the first to create a streak and claim the top spot.</p>
        </section>
      ) : (
        <section className="rounded-[20px] bg-surface px-[22px] py-3" aria-label="Ranking">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-xs text-faint">
                <th className="h-10 w-10 font-normal">Rank</th>
                <th className="font-normal">Streaker</th>
                <th className="text-right font-normal">Longest</th>
                <th className="w-24 text-right font-normal">Streaks</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user, index) => (
                <tr
                  key={user.id}
                  className="cursor-pointer border-t border-rule transition-colors hover:bg-[#1f1d1b]"
                  onClick={() => onUserClick?.(user.id)}
                >
                  <td className="h-[60px] text-sm text-faint tabular-nums">{index + 1}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <img src={user.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{user.alias || user.name}</p>
                        {user.alias && <p className="truncate text-xs text-faint">{user.name}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="text-right text-sm text-muted-text tabular-nums">{user.longestStreak} days</td>
                  <td className="text-right text-sm tabular-nums">
                    <span className={index === 0 ? "font-semibold text-flame" : "text-white"}>{user.totalStreaks}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
