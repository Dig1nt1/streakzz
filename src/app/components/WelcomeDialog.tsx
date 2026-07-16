import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Flame, Trophy, Users, TrendingUp } from "lucide-react";

interface WelcomeDialogProps {
  userName: string;
  onClose: () => void;
}

export function WelcomeDialog({ userName, onClose }: WelcomeDialogProps) {
  const [open, setOpen] = useState(true);

  const features = [
    {
      icon: Flame,
      title: "Track Your Streaks",
      description: "Log your daily wins and build momentum",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: Users,
      title: "Join the Community",
      description: "Connect with others and share your progress",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: Trophy,
      title: "Compete & Win",
      description: "Climb the leaderboards and earn recognition",
      color: "from-yellow-500 to-amber-500",
    },
    {
      icon: TrendingUp,
      title: "Stay Motivated",
      description: "Get inspired by others' achievements",
      color: "from-green-500 to-emerald-500",
    },
  ];

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-black/90 border-white/10 text-white backdrop-blur-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Flame className="h-7 w-7 text-white" />
            </div>
            <DialogTitle className="text-2xl">Welcome to Streakz, {userName}! 🎉</DialogTitle>
          </div>
          <DialogDescription>
            Join our community and start tracking your winning streaks
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-gray-300">
            You're now part of a community that celebrates consistency, dedication, and achievement.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="p-4 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm"
                >
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${feature.color} mb-3`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="text-sm text-white mb-1">{feature.title}</h4>
                  <p className="text-xs text-gray-300">{feature.description}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg p-4">
            <p className="text-sm">
              <span className="text-white">Pro tip:</span>{" "}
              <span className="text-gray-300">
                Start by posting your first streak! Click the "Post Streak" button to share your achievements.
              </span>
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleClose}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          >
            Let's Get Started!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
