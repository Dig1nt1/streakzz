import { useState, useEffect, useRef } from "react";
import { Radio, LogOut, Plus, Lock, Trash2, Send, Search } from "lucide-react";
import { Input } from "./ui/input";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { motion } from "motion/react";
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
  const [roomPanel, setRoomPanel] = useState<"chat" | "people">("chat");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastChatMessageIdRef = useRef<string | null>(null);
  // Current joined room and when it was joined, so a room list fetched after joining
  // can detect that the room no longer exists
  const joinedRoomRef = useRef<string | null>(null);
  const joinedAtRef = useRef(0);

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

    const fetchStartedAt = Date.now();
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

        // If the joined room is gone (e.g. deleted), stop treating it as joined
        const currentJoined = joinedRoomRef.current;
        if (
          currentJoined &&
          Array.isArray(rooms) &&
          fetchStartedAt >= joinedAtRef.current &&
          !rooms.some((r: SyncRoom) => r.id === currentJoined)
        ) {
          joinedRoomRef.current = null;
          setJoinedRoom(null);
          toast.info("This room is no longer available");
        }
      } else {
        // Keep the previous list (if any) so a transient failure doesn't drop the joined room
        setSyncRooms(prev => (prev.length > 0 ? prev : defaultRooms));
      }
    } catch (error) {
      console.error("Error loading sync rooms:", error);
      setSyncRooms(prev => (prev.length > 0 ? prev : defaultRooms));
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
      throw new Error("Not signed in");
    }

    let created = false;
    let errorToasted = false;
    try {
      const payload = {
        ...roomData,
        createdBy: currentUserId,
        creatorName: currentUserName,
      };

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
        created = true;
        toast.success(`Room "${roomData.name}" created successfully!`);
        await loadSyncRooms();

        // Auto-join the newly created room (pass password if it's private).
        // A join failure is already toasted by handleJoinRoom; the room itself was created.
        if (data.roomId) {
          const joinPassword = roomData.isPrivate ? roomData.password : undefined;
          try {
            await handleJoinRoom(data.roomId, joinPassword);
          } catch {
            // Room exists; user can join it from the list
          }
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
        errorToasted = true;
        // Throw so the create dialog stays open with the user's input
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      if (created) return;
      if (!errorToasted) {
        console.error("Error creating room:", error);
        toast.error("Failed to create room. Please try again.");
      }
      throw error;
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
        joinedRoomRef.current = roomId;
        joinedAtRef.current = Date.now();
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
            // Shown inline by the password dialog
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
      if (!error?.message?.includes("Failed to join") && error?.message !== "Invalid password") {
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
    if (!selectedPrivateRoom) throw new Error("No room selected");

    // Errors propagate so JoinPrivateRoomDialog stays open and shows them
    await handleJoinRoom(selectedPrivateRoom.id, password);
    setShowPasswordDialog(false);
    setSelectedPrivateRoom(null);
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
        if (joinedRoomRef.current === roomId) {
          joinedRoomRef.current = null;
          setJoinedRoom(null);
        }
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
        joinedRoomRef.current = null;
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

  // Auto-scroll chat to bottom only when a new message arrives (scroll the chat box, not the page)
  useEffect(() => {
    const lastId = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1].id : null;
    if (lastId === lastChatMessageIdRef.current) return;
    lastChatMessageIdRef.current = lastId;
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
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
  const myJoinedAt = currentRoom?.activeUsers.find(u => u.id === currentUserId)?.joinedAt;

  // How long someone has been in the room, refreshed every 30 seconds
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    if (!joinedRoom) return;
    const tick = setInterval(() => setClock(Date.now()), 30000);
    return () => clearInterval(tick);
  }, [joinedRoom]);
  const sessionLength = (since?: number) => {
    if (!since) return "just now";
    const minutes = Math.max(0, Math.floor((clock - since) / 60000));
    if (minutes < 1) return "under a minute";
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  };

  // Rooms list filters: counts above, live rooms first, then by name
  const [roomFilter, setRoomFilter] = useState<"all" | "live" | "official" | "community">("all");
  const peopleLive = syncRooms.reduce((sum, room) => sum + room.totalUsers, 0);
  const liveRooms = syncRooms.filter((room) => room.totalUsers > 0).length;
  const roomFilters = [
    { id: "all" as const, label: "All rooms", count: syncRooms.length },
    { id: "live" as const, label: "Live now", count: liveRooms },
    { id: "official" as const, label: "Official", count: syncRooms.filter((room) => !room.isCustom).length },
    { id: "community" as const, label: "Community", count: syncRooms.filter((room) => room.isCustom).length },
  ];
  const query = roomSearch.trim().toLowerCase();
  const visibleRooms = syncRooms
    .filter((room) =>
      roomFilter === "live" ? room.totalUsers > 0 :
      roomFilter === "official" ? !room.isCustom :
      roomFilter === "community" ? room.isCustom : true
    )
    .filter((room) => !query || [room.name, room.description, room.category, room.creatorName].some((field) => (field || "").toLowerCase().includes(query)))
    .sort((a, b) => b.totalUsers - a.totalUsers || a.name.localeCompare(b.name));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-7 text-white">Sync</h1>
          <p className="mt-0.5 text-sm text-muted-text">
            {joinedRoom || isLoading
              ? "Work on your streak alongside other people, live"
              : peopleLive > 0
                ? `${peopleLive} ${peopleLive === 1 ? "person is" : "people are"} working in ${liveRooms} ${liveRooms === 1 ? "room" : "rooms"} right now`
                : "Nobody is in a room right now. Start one and others can join you."}
          </p>
        </div>
        {!joinedRoom && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4" />
            Create room
          </Button>
        )}
      </div>

      {/* Joined room: the room as an object header, then the chat beside who is here */}
      {joinedRoom && currentRoom && (
        <div className="space-y-[14px]">
          <section className="flex flex-col gap-4 rounded-[20px] bg-surface p-4 sm:flex-row sm:items-start sm:p-5" aria-labelledby="room-title">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-positive-tint px-2.5 text-xs font-medium text-positive">
                  <span className="h-1.5 w-1.5 rounded-full bg-positive" />Live
                </span>
                <h2 id="room-title" className="truncate text-lg font-semibold text-white">{currentRoom.name}</h2>
                {currentRoom.isPrivate && <Lock className="h-4 w-4 text-muted-text" aria-label="Private room" />}
              </div>
              <p className="mt-1 flex flex-wrap gap-x-1.5 text-[13px] text-muted-text">
                <span>{currentRoom.category}</span>
                {currentRoom.isCustom && currentRoom.creatorName && (<><span aria-hidden>·</span><span>Created by {currentRoom.creatorName}</span></>)}
                <span aria-hidden>·</span>
                <span className="tabular-nums">{currentRoom.totalUsers} here now</span>
              </p>
              {currentRoom.description && <p className="mt-2 text-[15px] leading-[22px] text-body">{currentRoom.description}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
              <p className="mr-auto text-sm text-white sm:mr-0" aria-live="off">
                <span className="text-muted-text">You've been here </span>
                <span className="font-semibold tabular-nums">{sessionLength(myJoinedAt)}</span>
              </p>
              <div className="flex gap-2">
                {currentRoom.isCustom && currentRoom.createdBy === currentUserId && (
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Delete room"
                    onClick={async () => {
                      if (confirm(`Delete "${currentRoom.name}"? This can't be undone.`)) await handleDeleteRoom(currentRoom.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="outline" onClick={handleLeaveRoom}>
                  <LogOut className="h-4 w-4" />
                  Leave room
                </Button>
              </div>
            </div>
          </section>

          {/* Phones: one panel at a time */}
          <div className="grid grid-cols-2 rounded-full bg-surface p-1 lg:hidden" role="tablist" aria-label="Room panels">
            {(["chat", "people"] as const).map(tab => (
              <button
                key={tab}
                role="tab"
                aria-selected={roomPanel === tab}
                onClick={() => setRoomPanel(tab)}
                className={`h-9 rounded-full text-sm font-medium transition-colors ${roomPanel === tab ? "bg-raised text-white" : "text-[#bbbbbb]"}`}
              >
                {tab === "chat" ? "Chat" : `People ${currentRoom.totalUsers}`}
              </button>
            ))}
          </div>

          <div className="grid items-start gap-[14px] lg:grid-cols-[minmax(0,1fr)_300px]">
            {/* Room chat */}
            <section
              aria-labelledby="room-chat-title"
              className={`h-[calc(100dvh-24rem)] min-h-[360px] flex-col rounded-[20px] bg-surface lg:h-[calc(100dvh-17rem)] ${roomPanel === "chat" ? "flex" : "hidden lg:flex"}`}
            >
              <div className="flex items-baseline justify-between px-5 pt-4 pb-2">
                <h3 id="room-chat-title" className="text-base font-semibold text-white">Room chat</h3>
                <span className="text-xs tabular-nums text-faint">{chatMessages.length} {chatMessages.length === 1 ? "message" : "messages"}</span>
              </div>
              <div ref={chatContainerRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 sm:px-5">
                {chatMessages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <p className="text-sm font-medium text-white">Quiet in here</p>
                    <p className="mt-1 text-sm text-muted-text">Say what you're working on today.</p>
                  </div>
                ) : (
                  <ol className="flex min-h-full flex-col justify-end gap-1">
                    {chatMessages.map((msg, index) => {
                      const isMe = msg.userId === currentUserId;
                      const previous = chatMessages[index - 1];
                      const continued = previous && previous.userId === msg.userId;
                      return (
                        <li key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""} ${continued ? "" : "mt-2"}`}>
                          {!isMe && (
                            continued
                              ? <span className="w-7 shrink-0" />
                              : <img src={msg.userAvatar} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                          )}
                          <div className={`flex min-w-0 max-w-[78%] flex-col ${isMe ? "items-end" : "items-start"}`}>
                            {!isMe && !continued && <span className="mb-0.5 px-1 text-xs text-muted-text">{msg.userName.split(" ")[0]}</span>}
                            <div className={`rounded-[18px] px-3.5 py-2 text-[15px] leading-[21px] break-words whitespace-pre-wrap ${isMe ? "rounded-br-md bg-[#f2efe9] text-[#0e0d0c]" : "rounded-bl-md bg-raised text-white"}`}>
                              {msg.text.split(/(\s+)/).map((part, i) => {
                                try {
                                  const url = new URL(part);
                                  if (url.protocol === "http:" || url.protocol === "https:") {
                                    return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">{part}</a>;
                                  }
                                } catch {}
                                return part;
                              })}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
              <div className="flex gap-2 border-t border-rule p-2.5 sm:p-3">
                <Input
                  placeholder="Message the room"
                  aria-label="Message the room"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendChatMessage(); }}
                  className="h-10 flex-1 rounded-full border-transparent bg-raised px-4 text-[15px] text-white placeholder:text-faint"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || isSendingChat}
                  aria-label="Send"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-black transition-opacity disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </section>

            {/* Who is here, longest first */}
            <section
              aria-labelledby="room-people-title"
              className={`max-h-[calc(100dvh-17rem)] flex-col rounded-[20px] bg-surface p-4 ${roomPanel === "people" ? "flex" : "hidden lg:flex"}`}
            >
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h3 id="room-people-title" className="text-base font-semibold text-white">Here now</h3>
                <span className="text-xs tabular-nums text-faint">{currentRoom.totalUsers}</span>
              </div>
              <ul className="min-h-0 flex-1 overflow-y-auto">
                {[...currentRoom.activeUsers].sort((a, b) => a.joinedAt - b.joinedAt).map(user => {
                  const isMe = user.id === currentUserId;
                  return (
                    <li key={user.id}>
                      <button
                        onClick={() => { if (!isMe) onUserClick?.(user.id); }}
                        className="flex w-full items-center gap-3 rounded-[12px] px-2 py-2 text-left transition-colors hover:bg-raised"
                      >
                        <span className="relative shrink-0">
                          <img src={user.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface ${user.isActive ? "bg-positive" : "bg-[#6b6b6b]"}`} aria-label={user.isActive ? "Active" : "Away"} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-white">{(user as any).alias || user.name}</span>
                            {isMe && <span className="rounded-full bg-raised px-1.5 text-[11px] text-muted-text">You</span>}
                          </span>
                          <span className="block text-xs text-faint">{user.isActive ? "Working" : "Away"} · {sessionLength(user.joinedAt)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 px-1 text-xs text-faint">Leaving this page takes you out of the room.</p>
            </section>
          </div>
        </div>
      )}

      {/* Rooms list: count cards filter the list, live rooms first */}
      {!joinedRoom && !isLoading && (
        <div className="space-y-[14px]">
          <div role="tablist" aria-label="Filter rooms" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
            {roomFilters.map((filter) => {
              const selected = roomFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setRoomFilter(filter.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-full border-[1.5px] px-3.5 py-1.5 text-left transition-colors sm:h-[61px] sm:flex-col sm:items-start sm:justify-center sm:gap-0.5 sm:rounded-[16px] sm:px-3 ${
                    selected ? "border-flame bg-flame-tint" : "border-transparent bg-surface hover:bg-raised"
                  }`}
                >
                  <span className={`text-[13px] ${selected ? "text-white" : "text-muted-text"}`}>{filter.label}</span>
                  <span className="text-sm font-semibold tabular-nums text-white sm:text-base">{filter.count}</span>
                </button>
              );
            })}
          </div>

          <section className="rounded-[20px] bg-surface" aria-label="Rooms">
            <div className="flex items-center gap-3 border-b border-rule p-3 sm:px-5">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <Input
                  placeholder="Search rooms"
                  aria-label="Search rooms"
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  className="h-9 rounded-full border-transparent bg-raised pl-9 text-sm text-white placeholder:text-faint"
                />
              </div>
            </div>

            {visibleRooms.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-medium text-white">
                  {roomSearch.trim() ? `No rooms match “${roomSearch.trim()}”` : roomFilter === "live" ? "Nobody is in a room right now" : "No rooms here yet"}
                </p>
                <p className="mt-1 text-[13px] text-muted-text">
                  {roomFilter === "live" && !roomSearch.trim() ? "Join one and the first person to follow you will see it here." : "Create one and invite people to work alongside you."}
                </p>
                <Button variant="outline" className="mt-4" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4" />
                  Create room
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-rule">
                {visibleRooms.map((room) => (
                  <li key={room.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleRoomClick(room)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleRoomClick(room); }}
                      className="group flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors hover:bg-raised/60 focus-visible:bg-raised/60 focus-visible:outline-none sm:gap-4 sm:px-5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {room.totalUsers > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-positive" aria-label="Live" />}
                          <h3 className="truncate text-[15px] font-semibold text-white">{room.name}</h3>
                          {room.isPrivate && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-text" aria-label="Private room" />}
                        </div>
                        <p className="mt-0.5 truncate text-[13px] text-muted-text">
                          {room.category}
                          {room.isCustom && room.creatorName ? ` · by ${room.creatorName}` : room.isCustom ? "" : " · Official"}
                          {room.description ? ` · ${room.description}` : ""}
                        </p>
                      </div>

                      <div className="hidden w-32 shrink-0 items-center gap-2 sm:flex">
                        {room.activeUsers.length > 0 ? (
                          <>
                            <div className="flex -space-x-2">
                              {room.activeUsers.slice(0, 3).map((user, index) => (
                                <Avatar key={user.id} className="h-6 w-6 border-2 border-surface" style={{ zIndex: 3 - index }}>
                                  <img src={user.avatar} alt={user.name} className="object-cover" />
                                </Avatar>
                              ))}
                            </div>
                            <span className="text-[13px] tabular-nums text-body">{room.totalUsers} here</span>
                          </>
                        ) : (
                          <span className="text-[13px] text-faint">Empty</span>
                        )}
                      </div>
                      <span className="shrink-0 text-[13px] tabular-nums text-muted-text sm:hidden">
                        {room.totalUsers > 0 ? `${room.totalUsers} here` : "Empty"}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        className="hidden shrink-0 sm:inline-flex"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRoomClick(room);
                        }}
                      >
                        Join
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {isLoading && !joinedRoom && (
        <div className="text-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            <Radio className="h-8 w-8 text-white" />
          </motion.div>
          <p className="text-muted-text mt-4">Loading sync rooms...</p>
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
