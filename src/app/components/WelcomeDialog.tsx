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
    },
    {
      icon: Users,
      title: "Join the Community",
      description: "Connect with others and share your progress",
    },
    {
      icon: Trophy,
      title: "Compete & Win",
      description: "Climb the leaderboards and earn recognition",
    },
    {
      icon: TrendingUp,
      title: "Stay Motivated",
      description: "Get inspired by others' achievements",
    },
  ];

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-surface border-rule text-white">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Flame className="h-7 w-7 text-flame" />
            <DialogTitle className="text-xl font-semibold">Welcome to Streakz, {userName}!</DialogTitle>
          </div>
          <DialogDescription>
            Join our community and start tracking your winning streaks
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-body">
            You're now part of a community that celebrates consistency, dedication, and achievement.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="p-4 rounded-[12px] bg-raised"
                >
                  <div className="mb-2 text-muted-text">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <h4 className="text-sm text-white mb-1">{feature.title}</h4>
                  <p className="text-xs text-body">{feature.description}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-raised rounded-[12px] p-4">
            <p className="text-sm">
              <span className="text-white">Pro tip:</span>{" "}
              <span className="text-body">
                Start by posting your first streak! Click the "Post Streak" button to share your achievements.
              </span>
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleClose}
            className="bg-white text-black hover:bg-[#e6e3df]"
          >
            Let's Get Started!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
