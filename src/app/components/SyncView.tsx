import { useState, useEffect, useRef } from "react";
import { Users, Flame, Radio, LogOut, TrendingUp, Plus, Lock, Trash2, Send, Search } from "lucide-react";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { toast } from "sonner";
import { CreateSyncRoomDialog } from "./CreateSyncRoomDialog";
import { JoinPrivateRoomDialog } from "./JoinPrivateRoomDialog";

interface SyncRoom {
  id: string;
  name: string;
  category: string;
  description: string;
  activeUsers: ActiveUser[];
  totalUsers: number;
  isPrivate?: boolean;
  isCustom?: boolean;
  createdBy?: string;
  creatorName?: string;
}

interface ActiveUser {
  id: string;
  name: string;
  avatar: string;
  joinedAt: number;
  isActive: boolean;
  currentStreak?: string;
}

interface SyncViewProps {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string;
  onUserClick?: (userId: string) => void;
  accessToken?: string;
}

export function SyncView({
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onUserClick,
  accessToken,
}: SyncViewProps) {
  const [syncRooms, setSyncRooms] = useState<SyncRoom[]>([]);
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedPrivateRoom, setSelectedPrivateRoom] = useState<SyncRoom | null>(null);
  const [roomSearch, setRoomSearch] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string; userId: string; userName: string; userAvatar: string; text: string; timestamp: number;
  }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Default sync rooms
  const defaultRooms: SyncRoom[] = [
    {
      id: "writing",
      name: "Writing Room",
      category: "Writing",
      description: "Authors, bloggers, and content creators writing together",
      activeUsers: [],
      totalUsers: 0,
    },
    {
      id: "fitness",
      name: "Fitness Zone",
      category: "Fitness",
      description: "Get your workout in with others around the globe",
      activeUsers: [],
      totalUsers: 0,
    },
    {
      id: "coding",
      name: "Code Lab",
      category: "Coding",
      description: "Developers building and debugging side by side",
      activeUsers: [],
      totalUsers: 0,
    },
    {
      id: "study",
      name: "Study Hall",
      category: "Study",
      description: "Students and learners focusing together",
      activeUsers: [],
      totalUsers: 0,
    },
    {
      id: "meditation",
      name: "Mindfulness Space",
      category: "Meditation",
      description: "Meditate and practice mindfulness as a community",
      activeUsers: [],
      totalUsers: 0,
    },
    {
      id: "art",
      name: "Creative Studio",
      category: "Art",
      description: "Artists, designers, and creators making magic",
      activeUsers: [],
      totalUsers: 0,
    },
  ];

  // Load sync rooms from server
  const loadSyncRooms = async () => {
    if (!accessToken) {
      setSyncRooms(defaultRooms);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/sync/rooms`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const rooms = await response.json();
        setSyncRooms(rooms);
      } else {
        setSyncRooms(defaultRooms);
      }
    } catch (error) {
      console.error("Error loading sync rooms:", error);
      setSyncRooms(defaultRooms);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a custom sync room
  const handleCreateRoom = async (roomData: {
    name: string;
    description: string;
    category: string;
    isPrivate: boolean;
    password?: string;
  }) => {
    if (!accessToken) {
      toast.error("Please sign in to create a room");
      return;
    }

    try {
      const payload = {
        ...roomData,
        createdBy: currentUserId,
        creatorName: currentUserName,
      };
      console.log('Creating room with payload:', { ...payload, password: payload.password ? '***' : undefined });
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/sync/rooms/create`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(`Room "${roomData.name}" created successfully!`);
        await loadSyncRooms();
        
        // Auto-join the newly created room (pass password if it's private)
        if (data.roomId) {
          const joinPassword = roomData.isPrivate ? roomData.password : undefined;
          console.log('Auto-joining created room:', { roomId: data.roomId, hasPassword: !!joinPassword });
          await handleJoinRoom(data.roomId, joinPassword);
        }
      } else {
        let errorMessage = "Failed to create room";
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          // Response wasn't JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error("Failed to create room. Please try again.");
    }
  };

  // Join a sync room
  const handleJoinRoom = async (roomId: string, password?: string) => {
    if (!accessToken) {
      return;
    }

    // If already in a different room, leave it first
    if (joinedRoom && joinedRoom !== roomId) {
      await handleLeaveRoom();
    }

    try {
      const joinPayload = {
        userId: currentUserId,
        userName: currentUserName,
        userAvatar: currentUserAvatar,
        password,
      };
      console.log('Joining room:', { roomId, hasPassword: !!password, passwordLength: password?.length });
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/sync/rooms/${roomId}/join`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(joinPayload),
        }
      );

      if (response.ok) {
        setJoinedRoom(roomId);
        // Refresh rooms to show updated user list
        await loadSyncRooms();
        
        // Show success toast
        const room = syncRooms.find(r => r.id === roomId);
        const roomName = room?.name || "room";
        toast.success(`Joined ${roomName}! You'll be auto-disconnected when you leave.`);
      } else {
        let errorMessage = "Failed to join room";
        try {
          const error = await response.json();
          if (error.error === "Invalid password") {
            toast.error("Incorrect password");
            throw new Error("Invalid password");
          }
          errorMessage = error.error || errorMessage;
        } catch (parseError: any) {
          if (parseError.message === "Invalid password") throw parseError;
          // Response wasn't JSON (e.g. HTML error page from server)
          errorMessage = response.status === 404 ? "Room feature unavailable" : "Failed to join room";
        }
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      if (!error?.message?.includes("Failed to join")) {
        // Only log unexpected errors; join failures already show toasts
        console.error("Error joining room:", error);
      }
      throw error;
    }
  };

  // Handle room click - check if private
  const handleRoomClick = (room: SyncRoom) => {
    if (room.isPrivate) {
      setSelectedPrivateRoom(room);
      setShowPasswordDialog(true);
    } else {
      handleJoinRoom(room.id).catch(() => {
        // Error already shown via toast in handleJoinRoom
      });
    }
  };

  // Handle join private room with password
  const handleJoinPrivateRoom = async (password: string) => {
    if (!selectedPrivateRoom) return;

    try {
      await handleJoinRoom(selectedPrivateRoom.id, password);
      setShowPasswordDialog(false);
      setSelectedPrivateRoom(null);
    } catch (error) {
      // Error already handled in handleJoinRoom - keep dialog open for retry
    }
  };

  // Delete a custom sync room
  const handleDeleteRoom = async (roomId: string) => {
    if (!accessToken) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/sync/rooms/${roomId}/delete`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        toast.success("Room deleted successfully");
        setJoinedRoom(null);
        await loadSyncRooms();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete room");
      }
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error("Failed to delete room");
    }
  };

  // Leave a sync room
  const handleLeaveRoom = async () => {
    if (!accessToken || !joinedRoom) {
      return;
    }

    const currentRoomId = joinedRoom;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/sync/rooms/${currentRoomId}/leave`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        setJoinedRoom(null);
        await loadSyncRooms();
        toast.info("Left the sync room");
      }
    } catch (error) {
      console.error("Error leaving room:", error);
    }
  };

  // Update active status (heartbeat)
  const sendHeartbeat = async () => {
    if (!accessToken || !joinedRoom) return;

    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/sync/rooms/${joinedRoom}/heartbeat`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    } catch (error) {
      console.error("Error sending heartbeat:", error);
    }
  };

  const loadChatMessages = async (roomId: string) => {
    if (!accessToken) return;
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/sync/rooms/${roomId}/chat`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.ok) {
        const msgs = await res.json();
        setChatMessages(msgs);
      }
    } catch {}
  };

  const sendChatMessage = async () => {
    if (!accessToken || !joinedRoom || !chatInput.trim() || isSendingChat) return;
    const text = chatInput.trim();
    setChatInput("");
    setIsSendingChat(true);
    // Optimistic
    const optimistic = {
      id: `opt-${Date.now()}`,
      userId: currentUserId,
      userName: currentUserName,
      userAvatar: currentUserAvatar,
      text,
      timestamp: Date.now(),
    };
    setChatMessages(prev => [...prev, optimistic]);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/sync/rooms/${joinedRoom}/chat`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ text, userName: currentUserName, userAvatar: currentUserAvatar }),
        }
      );
      if (res.ok) {
        await loadChatMessages(joinedRoom);
      }
    } catch {}
    setIsSendingChat(false);
  };

  // Initial load
  useEffect(() => {
    loadSyncRooms();
  }, [accessToken]);

  // Auto-refresh rooms every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadSyncRooms();
    }, 5000);
    return () => clearInterval(interval);
  }, [accessToken]);

  // Load chat when joining a room and poll every 3 seconds
  useEffect(() => {
    if (!joinedRoom) { setChatMessages([]); return; }
    loadChatMessages(joinedRoom);
    const interval = setInterval(() => loadChatMessages(joinedRoom), 3000);
    return () => clearInterval(interval);
  }, [joinedRoom, accessToken]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Send heartbeat every 10 seconds when in a room
  useEffect(() => {
    if (!joinedRoom) return;

    const interval = setInterval(() => {
      sendHeartbeat();
    }, 10000);

    return () => clearInterval(interval);
  }, [joinedRoom, accessToken]);

  // Leave room on unmount (when navigating away from Sync page)
  useEffect(() => {
    return () => {
      if (joinedRoom && accessToken) {
        // Call leave room API when component unmounts
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/sync/rooms/${joinedRoom}/leave`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        ).catch(error => {
          console.error("Error leaving room on unmount:", error);
        });
      }
    };
  }, [joinedRoom, accessToken]);

  // Leave room on page unload (refresh, close tab, etc.)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (joinedRoom && accessToken) {
        // Use fetch with keepalive flag for reliable delivery during page unload
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/sync/rooms/${joinedRoom}/leave`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            keepalive: true,
          }
        ).catch(error => {
          console.error("Error leaving room on page unload:", error);
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [joinedRoom, accessToken]);

  const currentRoom = syncRooms.find((room) => room.id === joinedRoom);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
          <Radio className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </div>
        <div className="min-w-0">
          <h2 className="text-white text-base sm:text-xl">Sync</h2>
          <p className="text-gray-300 text-xs sm:text-sm">
            Join others working on their streaks live or create your own room
          </p>
        </div>
      </div>

      {/* Joined Room View */}
      {joinedRoom && currentRoom && (
        <Card className="p-4 sm:p-6 border-white/10 bg-black/40 backdrop-blur-md">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 mr-3">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white text-lg sm:text-xl">
                  {currentRoom.name}
                </h3>
                {currentRoom.isPrivate && (
                  <Lock className="h-4 w-4 text-purple-500" />
                )}
                {currentRoom.isCustom && (
                  <Badge variant="outline" className="bg-pink-500/10 border-pink-500/20 text-pink-500 text-xs">
                    Custom
                  </Badge>
                )}
              </div>
              <p className="text-gray-400 text-sm mb-2">{currentRoom.description}</p>
              {currentRoom.isCustom && currentRoom.creatorName && (
                <p className="text-gray-500 text-xs mb-1">
                  Created by {currentRoom.creatorName}
                </p>
              )}
              <p className="text-purple-400 text-xs">
                💡 You'll be automatically disconnected when you leave this page
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {currentRoom.isCustom && currentRoom.createdBy === currentUserId && (
                <Button
                  onClick={async () => {
                    if (confirm(`Are you sure you want to delete "${currentRoom.name}"? This cannot be undone.`)) {
                      await handleDeleteRoom(currentRoom.id);
                    }
                  }}
                  variant="outline"
                  className="bg-gray-500/10 border-gray-500/20 text-gray-400 hover:bg-gray-500/20"
                  title="Delete room"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                onClick={handleLeaveRoom}
                variant="outline"
                className="bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Leave
              </Button>
            </div>
          </div>

          {/* Active Users Count */}
          <div className="flex items-center gap-2 mb-4 text-green-500">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Radio className="h-4 w-4" />
            </motion.div>
            <span className="text-sm">
              {currentRoom.totalUsers}{" "}
              {currentRoom.totalUsers === 1 ? "person" : "people"} streaking now
            </span>
          </div>

          {/* Active Users Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 sm:gap-4">
            <AnimatePresence mode="popLayout">
              {currentRoom.activeUsers.map((user) => (
                <motion.div
                  key={user.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="flex flex-col items-center gap-2 cursor-pointer"
                  onClick={() => onUserClick?.(user.id)}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 sm:h-14 sm:w-14">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="object-cover"
                      />
                    </Avatar>
                    {user.isActive && (
                      <motion.div
                        className="absolute -inset-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 -z-10"
                        animate={{
                          opacity: [0.5, 1, 0.5],
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    )}
                    <div
                      className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-black/40 ${
                        user.isActive ? "bg-green-500" : "bg-gray-500"
                      }`}
                    />
                  </div>
                  <p className="text-white text-xs text-center truncate w-full">
                    {(user.alias || user.name).split(" ")[0]}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Room Chat */}
          <div className="mt-5 border-t border-white/10 pt-4">
            <h4 className="text-white text-sm mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-500 inline-block" />
              Room Chat
            </h4>
            <div className="h-52 overflow-y-auto space-y-2 mb-3 pr-1 scrollbar-thin">
              {chatMessages.length === 0 ? (
                <p className="text-gray-500 text-xs text-center mt-16">No messages yet. Say something!</p>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.userId === currentUserId;
                  return (
                    <div key={msg.id} className={`flex items-start gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <img src={msg.userAvatar} alt={msg.userName} className="object-cover" />
                      </Avatar>
                      <div className={`max-w-[75%] min-w-0 w-fit ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                        {!isMe && (
                          <span className="text-purple-400 text-xs">{msg.userName.split(" ")[0]}</span>
                        )}
                        <div className={`px-3 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap overflow-wrap-anywhere w-full ${
                          isMe
                            ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-tr-sm"
                            : "bg-white/10 text-white rounded-tl-sm"
                        }`}>
                          {msg.text.split(/(\s+)/).map((part, i) => {
                            try {
                              const url = new URL(part);
                              if (url.protocol === "http:" || url.protocol === "https:") {
                                return (
                                  <a
                                    key={i}
                                    href={part}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline underline-offset-2 opacity-90 hover:opacity-100 break-all"
                                  >
                                    {part}
                                  </a>
                                );
                              }
                            } catch {}
                            return part;
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Say something..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendChatMessage(); }}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 text-sm"
              />
              <Button
                onClick={sendChatMessage}
                disabled={!chatInput.trim() || isSendingChat}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white flex-shrink-0"
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Available Rooms */}
      {!joinedRoom && (
        <>
          {/* Create Room Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Room
            </Button>
          </div>

          {/* Default Rooms */}
          {syncRooms.filter(r => !r.isCustom).length > 0 && (
            <>
              <h3 className="text-white text-lg">Official Rooms</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {syncRooms.filter(r => !r.isCustom).map((room) => (
                  <Card
                    key={room.id}
                    className="p-4 sm:p-5 border-white/10 bg-black/40 backdrop-blur-md hover:bg-black/60 transition-colors cursor-pointer group"
                    onClick={() => handleRoomClick(room)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white text-base sm:text-lg group-hover:text-purple-500 transition-colors">
                            {room.name}
                          </h3>
                        </div>
                        <p className="text-gray-400 text-xs sm:text-sm">
                          {room.description}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-purple-500/10 border-purple-500/20 text-purple-500"
                      >
                        {room.category}
                      </Badge>
                    </div>

                    {/* User Count */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-300 text-sm">
                          {room.totalUsers}{" "}
                          {room.totalUsers === 1 ? "person" : "people"}
                        </span>
                      </div>

                      {room.totalUsers > 0 && (
                        <div className="flex items-center gap-1 text-green-500">
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Flame className="h-3 w-3" />
                          </motion.div>
                          <span className="text-xs">Live</span>
                        </div>
                      )}

                      {room.totalUsers > 10 && (
                        <Badge
                          variant="outline"
                          className="bg-orange-500/10 border-orange-500/20 text-orange-500"
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                    </div>

                    {/* User Avatars Preview */}
                    {room.activeUsers.length > 0 && (
                      <div className="flex items-center gap-1 mt-3">
                        <div className="flex -space-x-2">
                          {room.activeUsers.slice(0, 5).map((user, index) => (
                            <Avatar
                              key={user.id}
                              className="h-6 w-6 border-2 border-black/40"
                              style={{ zIndex: 5 - index }}
                            >
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className="object-cover"
                              />
                            </Avatar>
                          ))}
                        </div>
                        {room.activeUsers.length > 5 && (
                          <span className="text-gray-400 text-xs ml-1">
                            +{room.activeUsers.length - 5} more
                          </span>
                        )}
                      </div>
                    )}

                    <Button
                      className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRoomClick(room);
                      }}
                    >
                      Join Room
                    </Button>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Custom Rooms */}
          {syncRooms.filter(r => r.isCustom).length > 0 && (
            <>
              <div className="flex items-center justify-between mt-4 mb-1 gap-3">
                <h3 className="text-white text-lg flex-shrink-0">Community Rooms</h3>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    placeholder="Search rooms..."
                    value={roomSearch}
                    onChange={(e) => setRoomSearch(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 text-sm pl-9 h-8"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {syncRooms.filter(r => r.isCustom && (
                  !roomSearch.trim() ||
                  (r.name || "").toLowerCase().includes(roomSearch.toLowerCase()) ||
                  (r.description || "").toLowerCase().includes(roomSearch.toLowerCase()) ||
                  (r.category || "").toLowerCase().includes(roomSearch.toLowerCase())
                )).map((room) => (
              <Card
                key={room.id}
                className="p-4 sm:p-5 border-white/10 bg-black/40 backdrop-blur-md hover:bg-black/60 transition-colors cursor-pointer group"
                onClick={() => handleRoomClick(room)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white text-base sm:text-lg group-hover:text-purple-500 transition-colors">
                        {room.name}
                      </h3>
                      {room.isPrivate && (
                        <Lock className="h-4 w-4 text-purple-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-gray-400 text-xs sm:text-sm">
                      {room.description}
                    </p>
                    {room.isCustom && room.creatorName && (
                      <p className="text-gray-500 text-xs mt-1">
                        Created by {room.creatorName}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge
                      variant="outline"
                      className="bg-purple-500/10 border-purple-500/20 text-purple-500"
                    >
                      {room.category}
                    </Badge>
                    {room.isCustom && (
                      <Badge
                        variant="outline"
                        className="bg-pink-500/10 border-pink-500/20 text-pink-500 text-xs"
                      >
                        Custom
                      </Badge>
                    )}
                  </div>
                </div>

              {/* User Count */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-300 text-sm">
                    {room.totalUsers}{" "}
                    {room.totalUsers === 1 ? "person" : "people"}
                  </span>
                </div>

                {room.totalUsers > 0 && (
                  <div className="flex items-center gap-1 text-green-500">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Flame className="h-3 w-3" />
                    </motion.div>
                    <span className="text-xs">Live</span>
                  </div>
                )}

                {room.totalUsers > 10 && (
                  <Badge
                    variant="outline"
                    className="bg-orange-500/10 border-orange-500/20 text-orange-500"
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Popular
                  </Badge>
                )}
              </div>

              {/* User Avatars Preview */}
              {room.activeUsers.length > 0 && (
                <div className="flex items-center gap-1 mt-3">
                  <div className="flex -space-x-2">
                    {room.activeUsers.slice(0, 5).map((user, index) => (
                      <Avatar
                        key={user.id}
                        className="h-6 w-6 border-2 border-black/40"
                        style={{ zIndex: 5 - index }}
                      >
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="object-cover"
                        />
                      </Avatar>
                    ))}
                  </div>
                  {room.activeUsers.length > 5 && (
                    <span className="text-gray-400 text-xs ml-1">
                      +{room.activeUsers.length - 5} more
                    </span>
                  )}
                </div>
              )}

              <Button
                className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRoomClick(room);
                }}
              >
                {room.isPrivate ? (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Join Private Room
                  </>
                ) : (
                  "Join Room"
                )}
              </Button>
            </Card>
          ))}
              </div>
            </>
          )}
        </>
      )}

      {isLoading && !joinedRoom && (
        <div className="text-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            <Radio className="h-8 w-8 text-purple-500" />
          </motion.div>
          <p className="text-gray-400 mt-4">Loading sync rooms...</p>
        </div>
      )}

      {/* Create Room Dialog */}
      <CreateSyncRoomDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateRoom={handleCreateRoom}
      />

      {/* Join Private Room Dialog */}
      <JoinPrivateRoomDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        roomName={selectedPrivateRoom?.name || ""}
        onJoin={handleJoinPrivateRoom}
      />
    </div>
  );
}
