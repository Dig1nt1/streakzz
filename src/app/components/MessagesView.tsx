import { useState, useRef, useEffect } from "react";
import { Send, Search, MoreVertical, Flame, MessageSquare, ImagePlus, X, Trash2, Clock, ChevronLeft, Mic } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { toast } from "sonner";
import { useVoiceRecorder, VoiceNotePlayer, VoiceRecording, formatSeconds } from "./VoiceNote";

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  sentAt: number; // Unix timestamp in milliseconds
  likes: number;
  isLiked: boolean;
  mediaUrl?: string;
  mediaPath?: string;
  mediaType?: 'image' | 'video' | 'audio';
  duration?: number; // voice messages, in seconds
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

// Older chats were saved with this preview text for photos
const LEGACY_MEDIA_PREVIEW = "\u{1F4F7} Media";

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
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
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

  const mediaLabel = (type?: Message['mediaType']) => (type === 'audio' ? 'Voice message' : type === 'video' ? 'Video' : 'Photo');

  // Voice messages: up to two minutes, sent when the limit is reached
  const VOICE_LIMIT = 120;
  const voice = useVoiceRecorder(VOICE_LIMIT, () => finishVoice(true));
  const finishVoice = async (send: boolean) => {
    const recording = await voice.stop(send);
    if (recording) handleSendMessage(recording);
  };

  // Leaving a conversation throws away a recording in progress
  useEffect(() => {
    if (voice.recording) voice.stop(false);
  }, [selectedConversation?.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedMedia(file);
      // A local preview only; the file itself is uploaded to storage when sent
      setMediaPreview(URL.createObjectURL(file));
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

  // A voice message is sent on its own, without the typed text
  const handleSendMessage = async (voice?: VoiceRecording) => {
    if (isSendingRef.current) return;
    if ((!voice && !messageText.trim() && !selectedMedia) || !selectedConversation) return;

    const conv = selectedConversation;
    const text = voice ? "" : messageText;
    const media: Blob | null = voice ? voice.blob : selectedMedia;
    const preview = voice ? URL.createObjectURL(voice.blob) : mediaPreview;
    const mediaType = !media ? undefined : media.type.startsWith('audio/') ? 'audio' : media.type.startsWith('video/') ? 'video' : 'image';
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
        mediaType,
        ...(voice && { duration: Math.round(voice.duration) }),
      }),
    };

    const lastMessageText = text || mediaLabel(mediaType);

    // Clear the input and show the message immediately
    if (!voice) {
      setMessageText("");
      handleRemoveMedia();
    }
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
      if (voice) return;
      // Restore what the user typed, unless they've already started a new message
      setMessageText((current) => (current ? current : text));
      if (media) {
        setSelectedMedia(media as File);
        setMediaPreview(preview);
      }
    };

    isSendingRef.current = true;
    setIsSending(true);
    try {
      // Photos, videos and voice go to file storage first; the message keeps only the link
      let uploaded: { url: string; path: string } | null = null;
      if (media) {
        const form = new FormData();
        const extension = media.type.split('/')[1]?.split(';')[0] || 'bin';
        form.append('file', media, media instanceof File ? media.name : `voice.${extension}`);
        const upload = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/upload-media`,
          { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: form }
        );
        uploaded = upload.ok ? await upload.json().catch(() => null) : null;
        if (!uploaded?.url) {
          rollback();
          const reason = await upload.json().catch(() => null);
          toast.error(reason?.error || (voice ? "Voice message wasn't sent" : "Couldn't upload that file"));
          return;
        }
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/conversations/${conv.userId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            timestamp: newMessage.timestamp,
            ...(uploaded && { mediaUrl: uploaded.url, mediaPath: uploaded.path, mediaType, duration: newMessage.duration }),
          }),
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
        lastMessage: lastMsg?.text || (lastMsg?.mediaUrl ? mediaLabel(lastMsg.mediaType) : 'No messages'),
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
  const unreadCount = conversations.filter(conv => conv.unread > 0).length;

  // Who a conversation is with: the id comes from the key, the name and photo from the user list when known
  const resolveConversation = (conversation: Conversation) => {
    const keyParts = conversation.id?.split(":");
    const otherId = (keyParts && keyParts.length >= 3 && keyParts[2] !== currentUserId)
      ? keyParts[2]
      : (conversation.userId !== currentUserId ? conversation.userId : keyParts?.[2]) || conversation.userId;
    const resolvedUser = otherId && otherId !== currentUserId ? allUsers.find(u => u.id === otherId) : null;
    const name = resolvedUser?.name || (conversation.userName && conversation.userName !== "User" ? conversation.userName : null) || `User ${(otherId || "").slice(-4)}`;
    const avatar = resolvedUser?.avatar || conversation.userAvatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${otherId}`;
    return { otherId, name, avatar };
  };

  const openConversation = (conversation: Conversation) => {
    const { otherId, name, avatar } = resolveConversation(conversation);
    setSelectedConversation({ ...conversation, userId: otherId, userName: name, userAvatar: avatar });
  };

  // Keep the newest message in view when the thread opens or a message arrives
  const threadEndRef = useRef<HTMLDivElement>(null);
  const messageCount = selectedConversation?.messages.length ?? 0;
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "end" });
  }, [selectedConversation?.id, messageCount]);

  const dayLabel = (ms: number) => {
    const day = new Date(ms); day.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - day.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return day.toLocaleDateString("en-US", { weekday: diff < 7 ? "long" : undefined, month: diff < 7 ? undefined : "short", day: diff < 7 ? undefined : "numeric", year: day.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
  };

  // On wide screens the chat pane is always visible, so open the most recent conversation
  // instead of leaving it empty. Phones keep the list first.
  useEffect(() => {
    if (!conversationsLoaded || selectedConversation || selectedUserId || conversations.length === 0) return;
    if (window.matchMedia("(min-width: 1024px)").matches) openConversation(conversations[0]);
  }, [conversationsLoaded, conversations.length]);

  const thread = selectedConversation ? resolveConversation(selectedConversation) : null;

  // One clock format everywhere, taken from when the message was sent
  const clockTime = (message: Message) =>
    message.sentAt > 0 ? new Date(message.sentAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : message.timestamp;

  // Messages from the same person within five minutes read as one run: one time stamp at its end
  const sameRun = (a?: Message, b?: Message) =>
    !!a && !!b && a.senderId === b.senderId && Math.abs((b.sentAt || 0) - (a.sentAt || 0)) < 5 * 60000;

  // Inbox times: the clock today, then Yesterday, the weekday, the date
  const listTime = (conversation: Conversation) => {
    const last = conversation.messages[conversation.messages.length - 1];
    const parsed = last?.sentAt || Date.parse(conversation.lastMessageTime);
    if (!parsed || Number.isNaN(parsed)) return conversation.lastMessageTime;
    const label = dayLabel(parsed);
    if (label === "Today") return new Date(parsed).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (label === "Yesterday" || /\d/.test(label)) return label;
    return label.slice(0, 3); // weekday, shortened
  };

  return (
    <>
    {/* Inbox: on a phone one region at a time (list, then the open chat); side by side from lg up */}
    <div className="grid h-[calc(100dvh-11rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-[420px] grid-cols-1 gap-[14px] lg:h-[calc(100dvh-4rem)] lg:grid-cols-[360px_minmax(0,1fr)]">
      {/* Conversation list */}
      <section
        aria-label="Conversations"
        className={`min-h-0 flex-col rounded-[20px] bg-surface ${selectedConversation ? "hidden lg:flex" : "flex"}`}
      >
        <div className="px-4 pt-4 pb-3">
          <div className="mb-3 flex items-baseline justify-between">
            <h1 className="text-xl font-semibold leading-7 text-white">Messages</h1>
            {unreadCount > 0 && <span className="text-xs tabular-nums text-muted-text">{unreadCount} unread</span>}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <Input
              placeholder="Search people"
              aria-label="Search conversations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 rounded-full border-transparent bg-raised pl-10 text-white placeholder:text-faint"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {conversationsLoaded && filteredConversations.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted-text">
              {searchQuery ? `No one called "${searchQuery}".` : "No conversations yet. Message someone from their profile."}
            </p>
          ) : (
            <ul>
              {filteredConversations.map((conversation) => {
                const { name, avatar } = resolveConversation(conversation);
                const unread = conversation.unread > 0;
                const selected = selectedConversation?.id === conversation.id;
                return (
                  <li key={conversation.id}>
                    <button
                      onClick={() => openConversation(conversation)}
                      aria-current={selected ? "true" : undefined}
                      className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-3 text-left transition-colors ${selected ? "bg-raised" : "hover:bg-[#201e1c]"}`}
                    >
                      <img src={avatar} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-[15px] text-white ${unread ? "font-semibold" : "font-medium"}`}>{name}</span>
                          <span className={`shrink-0 text-xs ${unread ? "text-white" : "text-faint"}`}>{listTime(conversation)}</span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-2">
                          <span className={`truncate text-sm ${unread ? "text-white" : "text-muted-text"}`}>{conversation.lastMessage === LEGACY_MEDIA_PREVIEW ? 'Photo' : conversation.lastMessage}</span>
                          {unread && <span className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full bg-flame" aria-label="Unread" />}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Open conversation */}
      <section
        aria-label={thread ? `Conversation with ${thread.name}` : "Conversation"}
        className={`min-h-0 flex-col rounded-[20px] bg-surface ${selectedConversation ? "flex" : "hidden lg:flex"}`}
      >
        {selectedConversation && thread ? (
          <>
            <div className="flex shrink-0 items-center gap-2 border-b border-rule px-2 py-2 sm:px-3">
              <button
                onClick={() => setSelectedConversation(null)}
                aria-label="Back to conversations"
                className="grid h-10 w-10 place-items-center rounded-full text-white hover:bg-raised lg:hidden"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={() => { if (thread.otherId && thread.otherId !== currentUserId) onUserClick?.(thread.otherId); }}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-full py-1 pr-3 text-left hover:bg-[#201e1c] lg:pl-1"
              >
                <img src={thread.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold text-white">{thread.name}</span>
                  <span className="block text-xs text-faint">View profile</span>
                </span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button aria-label="Conversation options" className="grid h-10 w-10 place-items-center rounded-full text-muted-text hover:bg-raised hover:text-white">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="cursor-pointer text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete chat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
              {selectedConversation.messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <img src={thread.avatar} alt="" className="mb-3 h-16 w-16 rounded-full object-cover" />
                  <p className="text-base font-semibold text-white">{thread.name}</p>
                  <p className="mt-1 text-sm text-muted-text">Say hi and cheer on their streak.</p>
                </div>
              ) : (
                <ol className="flex min-h-full flex-col justify-end">
                  {selectedConversation.messages.map((message, index) => {
                    const messages = selectedConversation.messages;
                    const mine = message.senderId === currentUserId || message.senderId === "current";
                    const previous = messages[index - 1];
                    const next = messages[index + 1];
                    const newDay = !previous || dayLabel(previous.sentAt) !== dayLabel(message.sentAt);
                    const startsRun = newDay || !sameRun(previous, message);
                    const endsRun = !next || dayLabel(next.sentAt) !== dayLabel(message.sentAt) || !sameRun(message, next);
                    const deletable = mine && canDeleteMessage(message) && !message.id.startsWith("temp-");
                    const active = activeMessageId === message.id;
                    const corner = mine
                      ? `${startsRun ? "" : "rounded-tr-md"} ${endsRun ? "" : "rounded-br-md"}`
                      : `${startsRun ? "" : "rounded-tl-md"} ${endsRun ? "" : "rounded-bl-md"}`;
                    return (
                      <li key={message.id} className="flex flex-col">
                        {newDay && message.sentAt > 0 && (
                          <span className={`mb-1 self-center text-xs font-medium text-faint ${index > 0 ? "mt-6" : ""}`}>{dayLabel(message.sentAt)}</span>
                        )}
                        <div className={`group flex max-w-[82%] items-center gap-1.5 sm:max-w-[68%] ${mine ? "flex-row-reverse self-end" : "self-start"} ${startsRun ? "mt-2.5" : "mt-0.5"}`}>
                          <div
                            onClick={() => setActiveMessageId(active ? null : message.id)}
                            onDoubleClick={() => { if (!message.isLiked) handleLikeMessage(message.id); }}
                            className={`relative cursor-pointer select-text overflow-hidden rounded-[20px] ${corner} ${mine ? "bg-[#f2efe9] text-[#0e0d0c]" : "bg-raised text-white"} ${message.mediaType === "audio" ? "px-2 py-1.5" : message.mediaUrl && !message.text ? "" : "px-3.5 py-2"}`}
                          >
                            {message.mediaUrl && message.mediaType === "audio" && (
                              <VoiceNotePlayer src={message.mediaUrl} duration={message.duration} mine={mine} />
                            )}
                            {message.mediaUrl && message.mediaType !== "audio" && (
                              <div className={message.text ? "-mx-3.5 -mt-2 mb-2" : ""}>
                                {message.mediaType === "video" ? (
                                  <video src={message.mediaUrl} controls className="max-h-72 w-full" />
                                ) : (
                                  <button onClick={(e) => { e.stopPropagation(); setEnlargedImage(message.mediaUrl!); }} aria-label="Open photo" className="block">
                                    <img src={message.mediaUrl} alt="Shared photo" className="max-h-72 w-full object-cover" />
                                  </button>
                                )}
                              </div>
                            )}
                            {message.text && <p className="whitespace-pre-wrap break-words text-[15px] leading-[21px]">{message.text}</p>}
                          </div>
                          {/* Pointer devices: flame and unsend appear beside the bubble on hover */}
                          <div className="hidden shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(hover:hover)]:flex">
                            <button
                              onClick={() => handleLikeMessage(message.id)}
                              aria-label={message.isLiked ? "Remove flame" : "Give a flame"}
                              aria-pressed={message.isLiked}
                              className={`grid h-8 w-8 place-items-center rounded-full hover:bg-raised ${message.isLiked ? "text-flame" : "text-faint hover:text-white"}`}
                            >
                              <Flame className={`h-4 w-4 ${message.isLiked ? "fill-flame" : ""}`} />
                            </button>
                            {deletable && (
                              <button
                                onClick={() => handleUnsendMessage(message.id)}
                                aria-label={`Unsend, ${getTimeRemaining(message)} left`}
                                title={`Unsend · ${getTimeRemaining(message)} left`}
                                className="grid h-8 w-8 place-items-center rounded-full text-faint hover:bg-raised hover:text-white"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        {(endsRun || active || message.likes > 0) && (
                          <div className={`mt-1 flex items-center gap-2 px-1 text-xs text-faint ${mine ? "flex-row-reverse self-end" : "self-start"}`}>
                            {message.likes > 0 && (
                              <button
                                onClick={() => handleLikeMessage(message.id)}
                                aria-label={message.isLiked ? "Remove flame" : "Give a flame"}
                                aria-pressed={message.isLiked}
                                className={`-mt-2.5 inline-flex h-5 items-center gap-1 rounded-full border-2 border-surface px-1.5 tabular-nums ${message.isLiked ? "bg-flame-tint text-flame" : "bg-raised text-muted-text"}`}
                              >
                                <Flame className={`h-3 w-3 ${message.isLiked ? "fill-flame" : ""}`} />
                                {message.likes}
                              </button>
                            )}
                            {(endsRun || active) && <span>{clockTime(message)}</span>}
                            {/* Touch devices: tap a message to flame or unsend it */}
                            {active && (
                              <span className="flex items-center gap-2 [@media(hover:hover)]:hidden">
                                {!message.isLiked && (
                                  <button onClick={() => handleLikeMessage(message.id)} className="inline-flex items-center gap-1 text-white">
                                    <Flame className="h-3.5 w-3.5" />Flame
                                  </button>
                                )}
                                {deletable && (
                                  <button onClick={() => handleUnsendMessage(message.id)} className="inline-flex items-center gap-1 text-white">
                                    <Clock className="h-3 w-3" />Unsend · {getTimeRemaining(message)}
                                  </button>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
              <div ref={threadEndRef} />
            </div>

            <div className="shrink-0 border-t border-rule p-2.5 sm:p-3">
              {mediaPreview && (
                <div className="relative mb-2 ml-1 inline-block">
                  {selectedMedia?.type.startsWith("video/") ? (
                    <video src={mediaPreview} className="max-h-28 rounded-[12px]" />
                  ) : (
                    <img src={mediaPreview} alt="Photo to send" className="max-h-28 rounded-[12px] object-cover" />
                  )}
                  <button
                    onClick={handleRemoveMedia}
                    aria-label="Remove attachment"
                    className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-white text-black"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {voice.recording ? (
                <div className="flex items-center gap-2" role="status" aria-label="Recording a voice message">
                  <button
                    onClick={() => finishVoice(false)}
                    aria-label="Discard recording"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-text hover:bg-raised hover:text-white"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                  <div className="flex h-10 flex-1 items-center gap-2.5 rounded-full bg-raised px-4">
                    <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-[#ff4d4d]" /> {/* taste-skill-ignore: live recording indicator */}
                    <span className="text-[15px] tabular-nums text-white">{formatSeconds(voice.elapsed)}</span>
                    <span className="truncate text-sm text-faint">
                      {VOICE_LIMIT - voice.elapsed <= 15 ? `Sends at ${formatSeconds(VOICE_LIMIT)}` : "Recording"}
                    </span>
                  </div>
                  <button
                    onClick={() => finishVoice(true)}
                    aria-label="Send voice message"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-black"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              ) : (
              <div className="flex items-end gap-2">
                <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Add a photo or video"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-text hover:bg-raised hover:text-white"
                >
                  <ImagePlus className="h-5 w-5" />
                </button>
                <Input
                  placeholder="Message"
                  aria-label="Message"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isSending && handleSendMessage()}
                  className="h-10 flex-1 rounded-full border-transparent bg-raised px-4 text-[15px] text-white placeholder:text-faint"
                />
                {/* With nothing typed or attached, the send button becomes the microphone */}
                {!messageText.trim() && !selectedMedia ? (
                  <button
                    onClick={voice.start}
                    disabled={isSending}
                    aria-label="Record a voice message"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-raised text-white transition-colors hover:bg-[#363330] disabled:opacity-40"
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={isSending}
                    aria-label="Send"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-black transition-opacity disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
              </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <MessageSquare className="mb-3 h-10 w-10 text-faint" strokeWidth={1.5} />
            <h2 className="text-base font-semibold text-white">Your messages</h2>
            <p className="mt-1 text-sm text-muted-text">
              {conversations.length > 0 ? "Pick a conversation on the left." : "Message someone from their profile to start a chat."}
            </p>
          </div>
        )}
      </section>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
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
              aria-label="Close photo"
              className="absolute -top-4 -right-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white text-black"
            >
              <X className="h-5 w-5" />
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
