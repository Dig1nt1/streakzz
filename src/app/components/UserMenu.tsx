import type React from "react";
import { LogOut, User as UserIcon, Settings, HelpCircle, Trash2 } from "lucide-react";
import { Avatar } from "./ui/avatar";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";

interface UserMenuProps {
  userName: string;
  userAvatar: string;
  onLogout: () => void;
  onViewProfile: () => void;
  onViewHelpSupport?: () => void;
  onDeleteAccount?: () => void;
  /** Replaces the avatar button, e.g. with the "More" icon in the side rail. */
  trigger?: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

export function UserMenu({ userName, userAvatar, onLogout, onViewProfile, onViewHelpSupport, onDeleteAccount, trigger, side = "bottom", align = "end" }: UserMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteAccount = () => {
    setShowDeleteDialog(false);
    if (onDeleteAccount) {
      onDeleteAccount();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger ?? (
            <button className="relative h-10 w-10 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2">
              <img src={userAvatar} alt={userName} className="h-full w-full object-cover" />
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" side={side} align={align} sideOffset={8} forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm leading-none">{userName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                Streakz Member
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onViewProfile}>
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onViewHelpSupport}>
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Help & Support</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {onDeleteAccount && (
            <>
              <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-500">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete Account</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={onLogout} className="text-red-500">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-surface border-rule text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account Permanently?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-text">
              This action cannot be undone. This will permanently delete your account,
              all your posts, streaks, and free up your username for others to use.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-raised border-rule text-white hover:bg-[#363330]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAccount}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
