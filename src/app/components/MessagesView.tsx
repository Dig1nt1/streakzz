import { useState, useRef, useEffect } from "react";
import { Send, Search, MoreVertical, Flame, MessageSquare, ImagePlus, X, Trash2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { toast } from "sonner";

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  sentAt: number; // Unix timestamp in milliseconds
  likes: number;
  isLiked: boolean;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}

interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  messages: Message[];
}

interface MessagesViewProps {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string;
  onUserClick?: (userId: string) => void;
  selectedUserId?: string | null;
  selectedUserInfo?: { name: string; avatar: string } | null;
  onConversationOpened?: () => void;
  allUsers?: Array<{
    id: string;
    name: string;
    avatar: string;
  }>;
  accessToken?: string;
}

// Mock conversations data (NOT USED - kept for reference only)
// New users and logged-in users start with empty conversations
const mockConversations: Conversation[] = [
  {
    id: "1",
    userId: "2",
    userName: "Marcus Rodriguez",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
    lastMessage: "That's awesome! Let's squad up tomorrow",
    lastMessageTime: "2m ago",
    unread: 2,
    messages: [
      {
        id: "m1",
        senderId: "2",
        text: "Hey! Saw your 89-day streak post. That's incredible! 💪",
        timestamp: "10:30 AM",
        sentAt: Date.now() - 3600000, // 1 hour ago
        likes: 0,
        isLiked: false,
      },
      {
        id: "m2",
        senderId: "current",
        text: "Thanks! It's been a journey but totally worth it",
        timestamp: "10:32 AM",
        sentAt: Date.now() - 3540000, // 59 minutes ago
        likes: 1,
        isLiked: false,
      },
      {
        id: "m3",
        senderId: "2",
        text: "I'm trying to build a morning routine too. Any tips?",
        timestamp: "10:33 AM",
        sentAt: Date.now() - 3480000, // 58 minutes ago
        likes: 0,
        isLiked: false,
      },
      {
        id: "m4",
        senderId: "current",
        text: "Start small! I began with just 15 minutes and built up from there",
        timestamp: "10:35 AM",
        sentAt: Date.now() - 3360000, // 56 minutes ago
        likes: 2,
        isLiked: false,
      },
      {
        id: "m5",
        senderId: "2",
        text: "That's awesome! Let's squad up tomorrow",
        timestamp: "10:36 AM",
        sentAt: Date.now() - 3300000, // 55 minutes ago
        likes: 0,
        isLiked: false,
      },
      {
        id: "m5a",
        senderId: "current",
        text: "Definitely! I'll be online around 7 PM",
        timestamp: "Just now",
        sentAt: Date.now() - 120000, // 2 minutes ago (within delete window)
        likes: 0,
        isLiked: false,
      },
    ],
  },
  {
    id: "2",
    userId: "3",
    userName: "Emily Watson",
    userAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
    lastMessage: "Yes! I meditate at 6 AM every day",
    lastMessageTime: "1h ago",
    unread: 0,
    messages: [
      {
        id: "m6",
        senderId: "current",
        text: "Love your meditation streak! Do you have a specific time you practice?",
        timestamp: "9:15 AM",
        sentAt: Date.now() - 7200000, // 2 hours ago
        likes: 1,
        isLiked: false,
      },
      {
        id: "m7",
        senderId: "3",
        text: "Yes! I meditate at 6 AM every day",
        timestamp: "9:20 AM",
        sentAt: Date.now() - 6900000, // ~1 hour 55 min ago
        likes: 0,
        isLiked: false,
      },
    ],
  },
  {
    id: "3",
    userId: "4",
    userName: "Alex Kim",
    userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop",
    lastMessage: "Thanks for the motivation!",
    lastMessageTime: "3h ago",
    unread: 0,
    messages: [
      {
        id: "m8",
        senderId: "4",
        text: "Your fitness posts are inspiring! 🔥",
        timestamp: "Yesterday",
        sentAt: Date.now() - 86400000, // 1 day ago
        likes: 0,
        isLiked: false,
      },
      {
        id: "m9",
        senderId: "current",
        text: "Thank you! Keep crushing your guitar practice!",
        timestamp: "Yesterday",
        sentAt: Date.now() - 86100000, // ~1 day ago
        likes: 1,
        isLiked: false,
      },
      {
        id: "m10",
        senderId: "4",
        text: "Thanks for the motivation!",
        timestamp: "Yesterday",
        sentAt: Date.now() - 85800000, // ~1 day ago
        likes: 0,
        isLiked: false,
      },
    ],
  },
  {
    id: "4",
    userId: "5",
    userName: "Jordan Taylor",
    userAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
    lastMessage: "Let's compete next week!",
    lastMessageTime: "1d ago",
    unread: 1,
    messages: [
      {
        id: "m11",
        senderId: "5",
        text: "Saw you on the leaderboard! Great work!",
        timestamp: "2 days ago",
        sentAt: Date.now() - 172800000, // 2 days ago
        likes: 0,
        isLiked: false,
      },
      {
        id: "m12",
        senderId: "current",
        text: "Thanks! You're doing amazing too!",
        timestamp: "2 days ago",
        sentAt: Date.now() - 172500000, // ~2 days ago
        likes: 1,
        isLiked: false,
      },
      {
        id: "m13",
        senderId: "5",
        text: "Let's compete next week!",
        timestamp: "2 days ago",
        sentAt: Date.now() - 172200000, // ~2 days ago
        likes: 0,
        isLiked: false,
      },
    ],
  },
];

export function MessagesView({ currentUserId, currentUserName, currentUserAvatar, onUserClick, selectedUserId, selectedUserInfo, onConversationOpened, allUsers = [], accessToken }: MessagesViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSendingRef = useRef(false);
  // Tracks the currently open conversation so late poll responses for another one are ignored
  const selectedConversationUserIdRef = useRef<string | null>(null);

  // Keep the ref in sync and clear the unread badge locally when a conversation is opened
  useEffect(() => {
    const openUserId = selectedConversation?.userId ?? null;
    selectedConversationUserIdRef.current = openUserId;
    if (!selectedConversation) return;
    const openId = selectedConversation.id;
    setConversations(prev => prev.map(conv =>
      (conv.id === openId || conv.userId === openUserId) && conv.unread > 0 ? { ...conv, unread: 0 } : conv
    ));
  }, [selectedConversation?.id, selectedConversation?.userId]);

  // Load conversations from server
  const loadConversations = async () => {
    // If no access token, use empty conversations (user is not logged in)
    if (!accessToken) {
      setConversations([]);
      return;
    }
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/conversations`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      
      if (response.ok) {
        const serverConversations = await response.json();
        
        // Only use server conversations for logged-in users (no mock data)
        if (Array.isArray(serverConversations)) {
          // Update each conversation's messages with isLiked status
          const openUserId = selectedConversationUserIdRef.current;
          const conversationsWithLikes = serverConversations.map((conv: any) => ({
            ...conv,
            // The open conversation is being read, so don't show it as unread
            unread: openUserId && (conv.id?.split(":")[2] || conv.userId) === openUserId ? 0 : conv.unread,
            messages: conv.messages?.map((msg: any) => ({
              ...msg,
              isLiked: msg.likedBy?.includes(currentUserId) || false,
              likes: msg.likes || 0,
            })) || [],
          }));
          setConversations(conversationsWithLikes);
        } else {
          setConversations([]);
        }
      } else if (response.status === 401) {
        // Session expired: keep the previously loaded conversations
        console.log("Session expired, keeping existing conversations");
      } else {
        console.warn("Failed to load conversations from server, keeping existing conversations");
      }
    } catch (error) {
      // Server unavailable: keep the previously loaded conversations
      console.log("Server unavailable, keeping existing conversations");
    } finally {
      setConversationsLoaded(true);
    }
  };

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [accessToken]);

  // Auto-refresh conversations every 5 seconds to get new messages
  useEffect(() => {
    // Only auto-refresh if user is authenticated
    if (!accessToken) return;

    const interval = setInterval(() => {
      loadConversations();
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [accessToken]);

  // Update current time every second to check delete window
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if message is within 10-minute delete window
  const canDeleteMessage = (message: Message): boolean => {
    const TEN_MINUTES = 10 * 60 * 1000; // 10 minutes in milliseconds
    const timeSinceSent = currentTime - message.sentAt;
    return timeSinceSent <= TEN_MINUTES;
  };

  // Get time remaining for deletion in minutes and seconds
  const getTimeRemaining = (message: Message): string => {
    const TEN_MINUTES = 10 * 60 * 1000;
    const timeSinceSent = currentTime - message.sentAt;
    const timeRemaining = TEN_MINUTES - timeSinceSent;
    
    if (timeRemaining <= 0) return "";
    
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  // Load messages for a specific conversation from server
  const loadConversationMessages = async (userId: string) => {
    if (!accessToken) return null;
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/conversations/${userId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      
      if (response.ok) {
        const conversationData = await response.json();
        
        // Update each message with isLiked status based on current user
        if (conversationData?.messages) {
          conversationData.messages = conversationData.messages.map((msg: any) => ({
            ...msg,
            isLiked: msg.likedBy?.includes(currentUserId) || false,
            likes: msg.likes || 0,
          }));
        }
        
        return conversationData;
      } else if (response.status === 401) {
        // Session expired, use local data
        return null;
      }
    } catch (error) {
      // Network error, use local data
      return null;
    }
    return null;
  };

  // Auto-select conversation when selectedUserId is provided
  useEffect(() => {
    if (!selectedUserId || !conversationsLoaded) return;

    let conversation = conversations.find(conv => conv.userId === selectedUserId);

    if (!conversation) {
      // Try allUsers first, then fall back to selectedUserInfo passed from profile
      const user = allUsers.find(u => u.id === selectedUserId);
      const name = user?.name || (user as any)?.alias || selectedUserInfo?.name || "User";
      const avatar = user?.avatar || selectedUserInfo?.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${selectedUserId}`;

      const newConversation: Conversation = {
        id: `conv-${Date.now()}`,
        userId: selectedUserId,
        userName: name,
        userAvatar: avatar,
        lastMessage: "Start a conversation",
        lastMessageTime: "Now",
        unread: 0,
        messages: [],
      };
      setConversations(prev => [newConversation, ...prev.filter(c => c.userId !== selectedUserId)]);
      conversation = newConversation;
    }

    setSelectedConversation(conversation);
    onConversationOpened?.();
  }, [selectedUserId, conversationsLoaded]);

  // Auto-refresh selected conversation messages every 3 seconds
  useEffect(() => {
    // Only auto-refresh if user is authenticated and a conversation is selected
    if (!selectedConversation || !accessToken) return;

    const pollUserId = selectedConversation.userId;

    const refreshMessages = async () => {
      const updatedConversation = await loadConversationMessages(pollUserId);
      // Ignore responses that land after the user switched or deleted the conversation
      if (selectedConversationUserIdRef.current !== pollUserId) return;
      if (updatedConversation && updatedConversation.messages) {
        const applyUpdate = (conv: Conversation): Conversation => ({
          ...conv,
          messages: updatedConversation.messages,
          lastMessage: updatedConversation.lastMessage || conv.lastMessage,
          lastMessageTime: updatedConversation.lastMessageTime || conv.lastMessageTime,
          unread: 0,
        });
        // Update the selected conversation with new messages
        setSelectedConversation(prev => (prev && prev.userId === pollUserId ? applyUpdate(prev) : prev));

        // Also update in the conversations list
        setConversations(prevConversations =>
          prevConversations.map(conv =>
            (conv.id?.split(":")[2] || conv.userId) === pollUserId ? applyUpdate(conv) : conv
          )
        );
      }
    };

    // Fetch immediately on open (this also clears the server-side unread count)
    refreshMessages();

    const interval = setInterval(() => {
      refreshMessages();
    }, 3000); // 3 seconds

    return () => clearInterval(interval);
  }, [selectedConversation?.userId, accessToken]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedMedia(file);
      // Convert file to base64 data URL for persistent storage
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Apply an update to a conversation in both the list and (if still open) the selected conversation
  const updateConversationById = (convId: string, update: (conv: Conversation) => Conversation) => {
    setConversations(prev => prev.map(conv => (conv.id === convId ? update(conv) : conv)));
    setSelectedConversation(prev => (prev && prev.id === convId ? update(prev) : prev));
  };

  const handleSendMessage = async () => {
    if (isSendingRef.current) return;
    if ((!messageText.trim() && !selectedMedia) || !selectedConversation) return;

    const conv = selectedConversation;
    const text = messageText;
    const media = selectedMedia;
    const preview = mediaPreview;
    const previousLastMessage = conv.lastMessage;
    const previousLastMessageTime = conv.lastMessageTime;

    const now = Date.now();
    const tempId = `temp-${now}`;
    const newMessage: Message = {
      id: tempId,
      senderId: currentUserId,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sentAt: now,
      likes: 0,
      isLiked: false,
      ...(media && {
        mediaUrl: preview || '',
        mediaType: media.type.startsWith('video/') ? 'video' : 'image',
      }),
    };

    const lastMessageText = text || (media?.type.startsWith('video/') ? '📹 Video' : '📷 Photo');

    // Clear the input and show the message immediately
    setMessageText("");
    handleRemoveMedia();
    updateConversationById(conv.id, (c) => ({
      ...c,
      messages: [...c.messages, newMessage],
      lastMessage: lastMessageText,
      lastMessageTime: "Just now",
    }));

    if (!accessToken) return;

    const rollback = () => {
      updateConversationById(conv.id, (c) => ({
        ...c,
        messages: c.messages.filter((msg) => msg.id !== tempId),
        lastMessage: previousLastMessage,
        lastMessageTime: previousLastMessageTime,
      }));
      // Restore what the user typed, unless they've already started a new message
      setMessageText((current) => (current ? current : text));
      if (media) {
        setSelectedMedia(media);
        setMediaPreview(preview);
      }
    };

    isSendingRef.current = true;
    setIsSending(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/conversations/${conv.userId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newMessage),
        }
      );

      if (response.ok) {
        const serverMessage = await response.json().catch(() => null);
        // Replace the temporary message with the server's copy so unsend/like use the real id
        if (serverMessage?.id) {
          updateConversationById(conv.id, (c) => ({
            ...c,
            messages: c.messages.map((msg) =>
              msg.id === tempId
                ? {
                    ...msg,
                    ...serverMessage,
                    isLiked: serverMessage.likedBy?.includes(currentUserId) || false,
                    likes: serverMessage.likes || 0,
                  }
                : msg
            ),
          }));
        }
        // Refresh conversations to get the latest state
        loadConversations();
      } else {
        rollback();
        toast.error(response.status === 401 ? "Session expired. Please sign in again." : "Failed to send message");
      }
    } catch (error) {
      rollback();
      toast.error("Failed to send message. Check your connection.");
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  const handleUnsendMessage = async (messageId: string) => {
    if (!selectedConversation) return;
    // Message is still being sent; it has no server id yet
    if (messageId.startsWith('temp-')) return;

    const conv = selectedConversation;
    const removed = conv.messages.find((msg) => msg.id === messageId);
    if (!removed) return;
    const previousLastMessage = conv.lastMessage;
    const previousLastMessageTime = conv.lastMessageTime;

    // Optimistically remove the message
    updateConversationById(conv.id, (c) => {
      const updatedMessages = c.messages.filter((msg) => msg.id !== messageId);
      const lastMsg = updatedMessages[updatedMessages.length - 1];
      return {
        ...c,
        messages: updatedMessages,
        lastMessage: lastMsg?.text || (lastMsg?.mediaType === 'video' ? '📹 Video' : lastMsg?.mediaUrl ? '📷 Photo' : 'No messages'),
        lastMessageTime: lastMsg?.timestamp || '',
      };
    });

    if (!accessToken) return;

    const rollback = (message: string) => {
      updateConversationById(conv.id, (c) => ({
        ...c,
        messages: c.messages.some((msg) => msg.id === messageId)
          ? c.messages
          : [...c.messages, removed].sort((a, b) => (a.sentAt || 0) - (b.sentAt || 0)),
        lastMessage: previousLastMessage,
        lastMessageTime: previousLastMessageTime,
      }));
      toast.error(message);
    };

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/conversations/${conv.userId}/messages/${messageId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!response.ok) {
        rollback(response.status === 403 ? "You can only unsend your own messages" : "Failed to unsend message");
      }
    } catch (error) {
      console.error("Error deleting message from server:", error);
      rollback("Failed to unsend message. Check your connection.");
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedConversation) return;

    const conv = selectedConversation;
    const previousConversations = conversations;

    // Optimistically remove the conversation and close it
    selectedConversationUserIdRef.current = null;
    setConversations(prev => prev.filter((c) => c.id !== conv.id));
    setSelectedConversation(null);
    setShowDeleteDialog(false);

    if (!accessToken) return;

    const rollback = (message: string) => {
      setConversations(prev => (prev.some((c) => c.id === conv.id) ? prev : previousConversations));
      toast.error(message);
    };

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/conversations/${conv.userId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!response.ok) {
        rollback("Failed to delete conversation");
      }
    } catch (error) {
      console.error("Error deleting conversation from server:", error);
      rollback("Failed to delete conversation. Check your connection.");
    }
  };

  const handleLikeMessage = async (messageId: string) => {
    if (!selectedConversation) return;

    // Optimistically update UI
    const message = selectedConversation.messages.find(msg => msg.id === messageId);
    if (!message) return;

    const updatedConversation = {
      ...selectedConversation,
      messages: selectedConversation.messages.map((msg) => {
        if (msg.id === messageId) {
          return {
            ...msg,
            isLiked: !msg.isLiked,
            likes: msg.isLiked ? msg.likes - 1 : msg.likes + 1,
          };
        }
        return msg;
      }),
    };

    setSelectedConversation(updatedConversation);
    setConversations(
      conversations.map((conv) =>
        conv.id === selectedConversation.id ? updatedConversation : conv
      )
    );

    // Send like to server if authenticated
    if (accessToken) {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/conversations/${selectedConversation.userId}/messages/${messageId}/like`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log("Like synced to server:", data);
          
          // Update with server response to ensure consistency
          const serverUpdatedConversation = {
            ...selectedConversation,
            messages: selectedConversation.messages.map((msg) => {
              if (msg.id === messageId) {
                return {
                  ...msg,
                  isLiked: data.isLiked,
                  likes: data.likes,
                };
              }
              return msg;
            }),
          };

          setSelectedConversation(serverUpdatedConversation);
          setConversations(
            conversations.map((conv) =>
              conv.id === selectedConversation.id ? serverUpdatedConversation : conv
            )
          );
        } else {
          console.error("Failed to sync like to server");
        }
      } catch (error) {
        console.error("Error syncing like to server:", error);
      }
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
    <div className="h-[calc(100vh-120px)] flex">
      {/* Conversations List - Narrow Sidebar */}
      <div className="w-80 border-r border-rule flex flex-col bg-surface rounded-[5px] p-[0px] mx-[5px] my-[0px]">
        <div className="p-4 border-b border-rule">
          <h1 className="mb-3 text-xl font-semibold leading-7 text-white">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-text" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-raised border-rule text-white placeholder:text-muted-text"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div>
            {filteredConversations.map((conversation) => {
                const otherUserId = conversation.id?.split(":")[2] || conversation.userId;
                const resolvedUser = otherUserId !== currentUserId
                  ? allUsers.find(u => u.id === otherUserId)
                  : null;
                const displayName = resolvedUser?.name || (conversation.userName && conversation.userName !== "User" ? conversation.userName : null) || `User ${(otherUserId || "").slice(-4)}`;
                const displayAvatar = resolvedUser?.avatar || conversation.userAvatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${otherUserId}`;
                return (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversation({
                      ...conversation,
                      userId: otherUserId,
                      userName: displayName,
                      userAvatar: displayAvatar,
                    })}
                    className={`w-full p-3 flex items-center gap-3 hover:bg-raised transition-colors text-left ${
                      selectedConversation?.id === conversation.id ? "bg-raised" : ""
                    }`}
                  >
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <img
                        src={displayAvatar}
                        alt={displayName}
                        className="object-cover"
                      />
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white truncate text-sm">{displayName}</h3>
                      <p className="text-xs text-muted-text truncate">{conversation.lastMessage}</p>
                    </div>
                    {conversation.unread > 0 && (
                      <div className="h-2 w-2 bg-flame rounded-full flex-shrink-0" />
                    )}
                  </button>
                );
              })}
          </div>
        </ScrollArea>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 flex flex-col bg-surface min-h-0 rounded-[20px]">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-rule flex items-center justify-between flex-shrink-0">
                  {(() => {
                    // derive otherId robustly: prefer split from key, fallback to stored userId
                    const keyParts = selectedConversation.id?.split(":");
                    const otherId = (keyParts && keyParts.length >= 3 && keyParts[2] !== currentUserId)
                      ? keyParts[2]
                      : (selectedConversation.userId !== currentUserId ? selectedConversation.userId : keyParts?.[2]);
                    const resolvedUser = otherId ? allUsers.find(u => u.id === otherId) : null;
                    const headerName = resolvedUser?.name || (selectedConversation.userName && selectedConversation.userName !== "User" ? selectedConversation.userName : null) || `User ${(otherId || "").slice(-4)}`;
                    const headerAvatar = resolvedUser?.avatar || selectedConversation.userAvatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${otherId}`;
                    const goToProfile = () => { if (otherId && otherId !== currentUserId) onUserClick?.(otherId); };
                    return (
                      <div className="flex items-center gap-3">
                        <Avatar
                          className="h-10 w-10 cursor-pointer"
                          onClick={goToProfile}
                        >
                          <img src={headerAvatar} alt={headerName} className="object-cover" />
                        </Avatar>
                        <div>
                          <h3
                            className="text-white cursor-pointer hover:text-flame transition-colors"
                            onClick={goToProfile}
                          >
                            {headerName}
                          </h3>
                          <p className="text-xs text-muted-text">Active now</p>
                        </div>
                      </div>
                    );
                  })()}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-muted-text hover:text-white">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-surface border-rule">
                      <DropdownMenuItem
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4 min-h-0">
                  <div className="space-y-4">
                    {selectedConversation.messages.map((message) => {
                      const isCurrentUser = message.senderId === currentUserId || message.senderId === "current";
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} group`}
                        >
                          <div className={`flex gap-2 max-w-[70%] ${isCurrentUser ? "flex-row-reverse" : ""}`}>
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <img
                                src={isCurrentUser ? currentUserAvatar : selectedConversation.userAvatar}
                                alt={isCurrentUser ? currentUserName : selectedConversation.userName}
                                className="object-cover"
                              />
                            </Avatar>
                            <div className="flex flex-col relative">
                              <div className="relative">
                                {isCurrentUser && canDeleteMessage(message) && (
                                  <button
                                    onClick={() => handleUnsendMessage(message.id)}
                                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    title="Unsend message (within 10 min)"
                                  >
                                    <Trash2 className="h-3 w-3 text-white" />
                                  </button>
                                )}
                                <div
                                  className={`rounded-2xl px-4 py-2 ${
                                    isCurrentUser
                                      ? "bg-[#f2efe9] text-[#0e0d0c]"
                                      : "bg-raised text-white"
                                  }`}
                                >
                                  {message.mediaUrl && (
                                    <div className="mb-2">
                                      {message.mediaType === 'video' ? (
                                        <video
                                          src={message.mediaUrl}
                                          controls
                                          className="rounded-lg max-w-full max-h-64"
                                        />
                                      ) : (
                                        <img
                                          src={message.mediaUrl}
                                          alt="Shared media"
                                          className="rounded-lg max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() => setEnlargedImage(message.mediaUrl!)}
                                        />
                                      )}
                                    </div>
                                  )}
                                  {message.text && <p className="text-sm">{message.text}</p>}
                                </div>
                              </div>
                              <div className={`flex items-center gap-2 mt-1 ${isCurrentUser ? "flex-row-reverse" : ""}`}>
                                <p className={`text-xs text-muted-text`}>
                                  {message.timestamp}
                                </p>
                                {isCurrentUser && canDeleteMessage(message) && (
                                  <div className="flex items-center gap-1 text-xs text-faint opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Clock className="h-3 w-3" />
                                    <span>{getTimeRemaining(message)}</span>
                                  </div>
                                )}
                                <button
                                  onClick={() => handleLikeMessage(message.id)}
                                  className="group flex items-center gap-1 hover:scale-110 transition-transform"
                                >
                                  <AnimatePresence mode="wait">
                                    {message.isLiked ? (
                                      <motion.div
                                        key="liked"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                      >
                                        <Flame className="h-4 w-4 fill-flame text-flame" />
                                      </motion.div>
                                    ) : (
                                      <motion.div
                                        key="unliked"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                      >
                                        <Flame className="h-4 w-4 text-muted-text group-hover:text-flame" />
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                  {message.likes > 0 && (
                                    <motion.span
                                      key={message.likes}
                                      initial={{ scale: 1.3 }}
                                      animate={{ scale: 1 }}
                                      className={`text-xs ${message.isLiked ? 'text-flame' : 'text-muted-text'}`}
                                    >
                                      {message.likes}
                                    </motion.span>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t border-rule flex-shrink-0">
                  {mediaPreview && (
                    <div className="mb-3 relative inline-block">
                      <div className="relative">
                        {selectedMedia?.type.startsWith('video/') ? (
                          <video
                            src={mediaPreview}
                            className="rounded-lg max-h-32 max-w-xs"
                          />
                        ) : (
                          <img
                            src={mediaPreview}
                            alt="Preview"
                            className="rounded-lg max-h-32 max-w-xs object-cover"
                          />
                        )}
                        <button
                          onClick={handleRemoveMedia}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 rounded-full p-1"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="bg-raised border-rule hover:bg-raised text-white"
                    >
                      <ImagePlus className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !isSending && handleSendMessage()}
                      className="flex-1 bg-raised border-rule text-white placeholder:text-muted-text"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isSending || (!messageText.trim() && !selectedMedia)}
                      className="bg-white text-black hover:bg-[#e6e3df]"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-6">
                <MessageSquare className="h-10 w-10 text-faint" strokeWidth={1.5} />
                <div className="text-center">
                  <h3 className="text-white text-base font-semibold mb-1">Your messages</h3>
                  <p className="text-muted-text text-sm mb-4">Select a conversation to start messaging</p>
                  <Button
                    onClick={() => {
                      if (conversations.length > 0) {
                        const conv = conversations[0];
                        const otherId = conv.id?.split(":")[2] || conv.userId;
                        const resolved = otherId !== currentUserId ? allUsers.find(u => u.id === otherId) : null;
                        setSelectedConversation({ ...conv, userId: otherId, userName: resolved?.name || conv.userName || "User", userAvatar: resolved?.avatar || conv.userAvatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${otherId}` });
                      }
                    }}
                    className="bg-white text-black hover:bg-[#e6e3df]"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Start Messaging
                  </Button>
                </div>
              </div>
            )}
      </div>
    </div>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent className="bg-surface border-rule">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Delete conversation?</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-text">
            This will permanently delete your conversation with {selectedConversation?.userName}. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-raised text-white hover:bg-[#363330] border-rule">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteConversation}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Image Enlargement Modal */}
    <AnimatePresence>
      {enlargedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-4 -right-4 bg-red-500 hover:bg-red-600 rounded-full p-2 transition-colors z-10"
            >
              <X className="h-5 w-5 text-white" />
            </button>
            <img
              src={enlargedImage}
              alt="Enlarged view"
              className="rounded-lg max-w-full max-h-[90vh] object-contain"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
