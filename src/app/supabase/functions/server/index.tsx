import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Note: Cleanup will happen when users try to use freed aliases
// The check-alias endpoint will verify if the user still exists

// Health check endpoint
app.get("/make-server-1f5afd66/health", (c) => {
  return c.json({ status: "ok" });
});

// Check alias availability endpoint
app.get("/make-server-1f5afd66/check-alias/:alias", async (c) => {
  try {
    const alias = c.req.param('alias');
    
    if (!alias || alias.trim().length < 3) {
      return c.json({ available: false, error: "Alias must be at least 3 characters" }, 400);
    }

    const aliasKey = `alias:${alias.toLowerCase()}`;
    
    // Check if alias mapping exists
    const userId = await kv.get(aliasKey);
    
    if (!userId) {
      // No alias mapping found, alias is available
      return c.json({ 
        available: true,
        alias: alias 
      });
    }
    
    // Alias mapping exists — check both KV profile AND Supabase Auth
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const [kvUser, authResult] = await Promise.all([
      kv.get(`user:${userId}`),
      supabaseAdmin.auth.admin.getUserById(userId as string),
    ]);
    const authUser = authResult.data?.user;

    if (!kvUser && !authUser) {
      // Both deleted — free the alias
      console.log(`Cleaning up orphaned alias: ${aliasKey} (user ${userId} no longer exists)`);
      await kv.del(aliasKey);
      return c.json({ available: true, alias });
    }

    // At least one record exists — alias is taken
    return c.json({ available: false, alias });
  } catch (error: any) {
    console.error("Error checking alias availability:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Signup endpoint
app.post("/make-server-1f5afd66/signup", async (c) => {
  try {
    const { email, password, name, alias } = await c.req.json();

    if (!email || !password || !name || !alias) {
      return c.json({ error: "Email, password, name, and alias are required" }, 400);
    }

    // Validate alias length
    if (alias.trim().length < 3) {
      return c.json({ error: "Alias must be at least 3 characters" }, 400);
    }

    // Check if alias is already taken
    const aliasKey = `alias:${alias.toLowerCase()}`;
    const existingUserId = await kv.get(aliasKey);
    
    if (existingUserId) {
      const supabaseAdminCheck = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      const [existingKvUser, existingAuthResult] = await Promise.all([
        kv.get(`user:${existingUserId}`),
        supabaseAdminCheck.auth.admin.getUserById(existingUserId as string),
      ]);
      const existingAuthUser = existingAuthResult.data?.user;

      if (existingKvUser || existingAuthUser) {
        // User still exists in at least one store — alias is truly taken
        return c.json({ error: "This alias is already taken. Please choose another one." }, 400);
      } else {
        // Both records gone — free the alias
        console.log(`Cleaning up orphaned alias during signup: ${aliasKey} (user ${existingUserId} no longer exists)`);
        await kv.del(aliasKey);
        // Continue with signup
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Create user with admin API
    // Automatically confirm the user's email since an email server hasn't been configured.
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true
    });

    if (error) {
      console.error("Signup error while creating user:", error);
      return c.json({ error: error.message }, 400);
    }

    if (!data.user) {
      return c.json({ error: "Failed to create user" }, 500);
    }

    // Now sign in the user to get a session
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: sessionData, error: sessionError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (sessionError || !sessionData.session) {
      console.error("Error creating session after signup:", sessionError);
      return c.json({ error: "Account created but failed to create session. Please login." }, 500);
    }

    // Store alias mapping (lowercase alias -> userId for uniqueness check)
    await kv.set(aliasKey, data.user.id);

    // Store user profile in KV store
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      name,
      alias,
      email,
      avatar: `https://api.dicebear.com/9.x/thumbs/svg?seed=${email}`,
      bio: "New Streakz member 🔥",
      joined: new Date().toISOString(),
      totalStreaks: 0,
      longestStreak: 0,
      activeStreaks: 0,
      achievements: [], // Start with no achievements
    });

    return c.json({
      userId: data.user.id,
      accessToken: sessionData.session.access_token,
      name,
    });
  } catch (error: any) {
    console.error("Unexpected signup error:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Get user profile endpoint
app.get("/make-server-1f5afd66/user/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const user = await kv.get(`user:${userId}`);
    
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json(user);
  } catch (error: any) {
    console.error("Error fetching user profile:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Update user profile endpoint
app.put("/make-server-1f5afd66/user/:userId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    
    // Only allow users to update their own profile
    if (user.id !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const updates = await c.req.json();
    const existingUser = await kv.get(`user:${userId}`) || {};
    
    const updatedUser = {
      ...existingUser,
      ...updates,
      id: userId, // Ensure ID doesn't change
    };

    await kv.set(`user:${userId}`, updatedUser);

    return c.json(updatedUser);
  } catch (error: any) {
    console.error("Error updating user profile:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Initialize demo account (called automatically on first request)
app.get("/make-server-1f5afd66/init-demo", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Initialize storage bucket for posts
    const bucketName = 'make-1f5afd66-posts';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      const { error: bucketError } = await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 52428800, // 50MB
      });
      if (bucketError) {
        console.error("Error creating storage bucket:", bucketError);
      } else {
        console.log("Storage bucket created successfully");
      }
    }

    // Check if demo user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const demoExists = existingUsers?.users?.some(u => u.email === 'demo@streakz.app');

    if (!demoExists) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: 'demo@streakz.app',
        password: 'demo123',
        user_metadata: { name: 'Demo User' },
        email_confirm: true
      });

      if (error) {
        console.error("Error creating demo user:", error);
        return c.json({ error: error.message }, 500);
      }

      if (data.user) {
        await kv.set(`user:${data.user.id}`, {
          id: data.user.id,
          name: 'Demo User',
          email: 'demo@streakz.app',
          avatar: 'https://api.dicebear.com/9.x/thumbs/svg?seed=demo',
          bio: 'Demo account for testing Streakz 🔥',
          joined: 'October 2024',
          totalStreaks: 42,
          longestStreak: 30,
          activeStreaks: 3,
        });
      }

      return c.json({ message: "Demo account created", created: true });
    }

    return c.json({ message: "Demo account already exists", created: false });
  } catch (error: any) {
    console.error("Error initializing demo account:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Upload media endpoint
app.post("/make-server-1f5afd66/upload-media", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const bucketName = 'make-1f5afd66-posts';
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const fileBuffer = await file.arrayBuffer();
    
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return c.json({ error: uploadError.message }, 500);
    }

    // Get signed URL valid for 1 year
    const { data: signedUrlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 31536000); // 1 year in seconds

    return c.json({ 
      url: signedUrlData?.signedUrl,
      path: fileName
    });
  } catch (error: any) {
    console.error("Error uploading media:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Create post endpoint
app.post("/make-server-1f5afd66/posts", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const postData = await c.req.json();
    const postId = `post:${Date.now()}:${user.id}`;
    
    // Get user profile
    const userProfile = await kv.get(`user:${user.id}`);
    
    const post = {
      id: postId,
      userId: user.id,
      userName: userProfile?.name || user.user_metadata?.name || 'User',
      userAvatar: userProfile?.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${user.id}`,
      ...postData,
      createdAt: new Date().toISOString(),
    };

    await kv.set(postId, post);
    
    // Add post ID to posts index
    const postsIndex = await kv.get('posts:index') || [];
    await kv.set('posts:index', [postId, ...postsIndex]);

    return c.json(post);
  } catch (error: any) {
    console.error("Error creating post:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Get all posts endpoint
app.get("/make-server-1f5afd66/posts", async (c) => {
  try {
    const postsIndex = await kv.get('posts:index') || [];
    const posts = await kv.mget(postsIndex);
    
    // Filter out null values and sort by creation date
    const validPosts = posts.filter(p => p !== null).sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return c.json(validPosts);
  } catch (error: any) {
    console.error("Error fetching posts:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Update post (for adding streak days, likes, comments)
app.put("/make-server-1f5afd66/posts/:postId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const postId = c.req.param('postId');
    const updates = await c.req.json();
    
    const existingPost = await kv.get(postId);
    if (!existingPost) {
      return c.json({ error: 'Post not found' }, 404);
    }

    const updatedPost = { ...existingPost, ...updates };
    await kv.set(postId, updatedPost);

    return c.json(updatedPost);
  } catch (error: any) {
    console.error("Error updating post:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Like/unlike a post or streak day
app.post("/make-server-1f5afd66/posts/:postId/like", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) return c.json({ error: 'Unauthorized' }, 401);

    const postId = c.req.param('postId');
    const body = await c.req.json().catch(() => ({}));
    const dayNumber = body.dayNumber ?? null; // null = like the whole post, number = like a specific streak day

    const post = await kv.get(postId);
    if (!post) return c.json({ error: 'Post not found' }, 404);

    if (dayNumber !== null && post.streakDays) {
      // Like a specific streak day
      post.streakDays = post.streakDays.map((day: any) => {
        if (day.dayNumber === dayNumber) {
          const likedBy: string[] = day.likedBy || [];
          const isLiked = likedBy.includes(user.id);
          const updatedLikedBy = isLiked
            ? likedBy.filter((id: string) => id !== user.id)
            : [...likedBy, user.id];
          return { ...day, likedBy: updatedLikedBy, likes: updatedLikedBy.length };
        }
        return day;
      });
    } else {
      // Like the whole post
      const likedBy: string[] = post.likedBy || [];
      const isLiked = likedBy.includes(user.id);
      const updatedLikedBy = isLiked
        ? likedBy.filter((id: string) => id !== user.id)
        : [...likedBy, user.id];
      post.likedBy = updatedLikedBy;
      post.likes = updatedLikedBy.length;
    }

    await kv.set(postId, post);
    return c.json(post);
  } catch (error: any) {
    console.error("Error liking post:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Delete post endpoint
app.delete("/make-server-1f5afd66/posts/:postId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const postId = c.req.param('postId');
    const post = await kv.get(postId);
    
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }

    if (post.userId !== user.id) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    await kv.del(postId);
    
    // Remove from index
    const postsIndex = await kv.get('posts:index') || [];
    const updatedIndex = postsIndex.filter(id => id !== postId);
    await kv.set('posts:index', updatedIndex);

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting post:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Get all users endpoint
app.get("/make-server-1f5afd66/users", async (c) => {
  try {
    // Get all user keys from KV store
    const userKeys = await kv.getByPrefix('user:');
    
    // Map to user objects with just the needed fields
    const users = userKeys.map(user => ({
      id: user.id,
      name: user.name,
      alias: user.alias,
      avatar: user.avatar,
      bio: user.bio,
    }));

    return c.json(users);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Get conversations for a user
app.get("/make-server-1f5afd66/conversations", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get all conversations for this user
    const conversationKeys = await kv.getByPrefix(`conversation:${user.id}:`);
    
    console.log(`Fetching conversations for ${user.id}: found ${conversationKeys?.length || 0} conversations`);
    
    // Filter nulls and ensure all conversations have valid messages arrays
    const validConversations = (conversationKeys || []).filter(conv => conv != null).map(conv => {
      if (!Array.isArray(conv.messages)) {
        conv.messages = [];
      }
      return conv;
    });
    
    return c.json(validConversations);
  } catch (error: any) {
    console.error("Error fetching conversations:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Get messages for a conversation
app.get("/make-server-1f5afd66/conversations/:otherUserId/messages", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const otherUserId = c.req.param('otherUserId');
    const conversationKey = `conversation:${user.id}:${otherUserId}`;
    
    const conversation = await kv.get(conversationKey);
    
    console.log(`Fetching messages for ${user.id} with ${otherUserId}: found ${conversation?.messages?.length || 0} messages`);
    
    // Ensure we always return a valid conversation structure
    if (!conversation) {
      return c.json({ messages: [] });
    }
    
    if (!Array.isArray(conversation.messages)) {
      conversation.messages = [];
    }
    
    return c.json(conversation);
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Send a message
app.post("/make-server-1f5afd66/conversations/:otherUserId/messages", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const otherUserId = c.req.param('otherUserId');
    const messageData = await c.req.json();
    
    // Get current user profile
    const currentUserProfile = await kv.get(`user:${user.id}`);
    const otherUserProfile = await kv.get(`user:${otherUserId}`);

    console.log(`Message send request: from ${user.id} to ${otherUserId}`);

    // Create conversation keys for both users
    const conversationKey1 = `conversation:${user.id}:${otherUserId}`;
    const conversationKey2 = `conversation:${otherUserId}:${user.id}`;
    
    // Get existing conversations or create new ones
    let conversation1 = await kv.get(conversationKey1);
    let conversation2 = await kv.get(conversationKey2);

    // Ensure messages array exists for conversation1
    if (!conversation1) {
      conversation1 = {
        id: conversationKey1,
        userId: otherUserId,
        userName: otherUserProfile?.name || 'User',
        userAvatar: otherUserProfile?.avatar || '',
        lastMessage: '',
        lastMessageTime: '',
        unread: 0,
        messages: []
      };
    } else if (!Array.isArray(conversation1.messages)) {
      conversation1.messages = [];
    }

    // Ensure messages array exists for conversation2
    if (!conversation2) {
      conversation2 = {
        id: conversationKey2,
        userId: user.id,
        userName: currentUserProfile?.name || 'User',
        userAvatar: currentUserProfile?.avatar || '',
        lastMessage: '',
        lastMessageTime: '',
        unread: 0,
        messages: []
      };
    } else if (!Array.isArray(conversation2.messages)) {
      conversation2.messages = [];
    }

    // Create the new message
    const newMessage = {
      ...messageData,
      id: `msg:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
      senderId: user.id,
      sentAt: Date.now(),
    };

    console.log(`Created message ${newMessage.id} from ${user.id}`);

    // Add message to both conversations
    conversation1.messages.push(newMessage);
    conversation1.lastMessage = messageData.text || '📷 Media';
    conversation1.lastMessageTime = new Date().toISOString();

    conversation2.messages.push(newMessage);
    conversation2.lastMessage = messageData.text || '📷 Media';
    conversation2.lastMessageTime = new Date().toISOString();
    conversation2.unread = (conversation2.unread || 0) + 1;

    // Save both conversations
    await kv.set(conversationKey1, conversation1);
    await kv.set(conversationKey2, conversation2);

    console.log(`Message saved to both conversations. Conv1 has ${conversation1.messages.length} messages, Conv2 has ${conversation2.messages.length} messages`);

    return c.json(newMessage);
  } catch (error: any) {
    console.error("Error sending message:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Delete a message
app.delete("/make-server-1f5afd66/conversations/:otherUserId/messages/:messageId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const otherUserId = c.req.param('otherUserId');
    const messageId = c.req.param('messageId');
    
    const conversationKey1 = `conversation:${user.id}:${otherUserId}`;
    const conversationKey2 = `conversation:${otherUserId}:${user.id}`;
    
    const conversation1 = await kv.get(conversationKey1);
    const conversation2 = await kv.get(conversationKey2);

    if (conversation1) {
      conversation1.messages = conversation1.messages.filter(msg => msg.id !== messageId);
      await kv.set(conversationKey1, conversation1);
    }

    if (conversation2) {
      conversation2.messages = conversation2.messages.filter(msg => msg.id !== messageId);
      await kv.set(conversationKey2, conversation2);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting message:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Like/unlike a message
app.post("/make-server-1f5afd66/conversations/:otherUserId/messages/:messageId/like", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const otherUserId = c.req.param('otherUserId');
    const messageId = c.req.param('messageId');
    
    const conversationKey1 = `conversation:${user.id}:${otherUserId}`;
    const conversationKey2 = `conversation:${otherUserId}:${user.id}`;
    
    const conversation1 = await kv.get(conversationKey1);
    const conversation2 = await kv.get(conversationKey2);

    // Track who liked the message
    const likeKey = `message_like:${messageId}:${user.id}`;
    const existingLike = await kv.get(likeKey);
    const isLiking = !existingLike;

    if (isLiking) {
      await kv.set(likeKey, { userId: user.id, messageId, timestamp: Date.now() });
    } else {
      await kv.del(likeKey);
    }

    // Get all likes for this message
    const allLikes = await kv.getByPrefix(`message_like:${messageId}:`);
    const likeCount = allLikes?.length || 0;

    // Update both conversations with the new like count
    if (conversation1?.messages) {
      conversation1.messages = conversation1.messages.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            likes: likeCount,
            likedBy: allLikes?.map(like => like.userId) || [],
          };
        }
        return msg;
      });
      await kv.set(conversationKey1, conversation1);
    }

    if (conversation2?.messages) {
      conversation2.messages = conversation2.messages.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            likes: likeCount,
            likedBy: allLikes?.map(like => like.userId) || [],
          };
        }
        return msg;
      });
      await kv.set(conversationKey2, conversation2);
    }

    return c.json({ success: true, likes: likeCount, isLiked: isLiking });
  } catch (error: any) {
    console.error("Error liking message:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Delete conversation
app.delete("/make-server-1f5afd66/conversations/:otherUserId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const otherUserId = c.req.param('otherUserId');
    const conversationKey = `conversation:${user.id}:${otherUserId}`;
    
    await kv.del(conversationKey);

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting conversation:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Sync Rooms - Get all rooms with active users
app.get("/make-server-1f5afd66/sync/rooms", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const defaultRoomIds = ['writing', 'fitness', 'coding', 'study', 'meditation', 'art'];
    const defaultRooms = await Promise.all(
      defaultRoomIds.map(async (roomId) => {
        const roomData = await kv.get(`sync_room:${roomId}`);
        const users = roomData?.users || [];
        
        // Filter out inactive users (no heartbeat in last 30 seconds)
        const now = Date.now();
        const activeUsers = users.filter((u: any) => now - u.lastHeartbeat < 30000);
        
        // Update room with active users only
        if (activeUsers.length !== users.length) {
          await kv.set(`sync_room:${roomId}`, { users: activeUsers });
        }
        
        const roomNames: { [key: string]: { name: string; category: string; description: string } } = {
          writing: {
            name: "Writing Room",
            category: "Writing",
            description: "Authors, bloggers, and content creators writing together",
          },
          fitness: {
            name: "Fitness Zone",
            category: "Fitness",
            description: "Get your workout in with others around the globe",
          },
          coding: {
            name: "Code Lab",
            category: "Coding",
            description: "Developers building and debugging side by side",
          },
          study: {
            name: "Study Hall",
            category: "Study",
            description: "Students and learners focusing together",
          },
          meditation: {
            name: "Mindfulness Space",
            category: "Meditation",
            description: "Meditate and practice mindfulness as a community",
          },
          art: {
            name: "Creative Studio",
            category: "Art",
            description: "Artists, designers, and creators making magic",
          },
        };

        return {
          id: roomId,
          ...roomNames[roomId],
          isCustom: false,
          isPrivate: false,
          activeUsers: activeUsers.map((u: any) => ({
            id: u.userId,
            name: u.userName,
            avatar: u.userAvatar,
            joinedAt: u.joinedAt,
            isActive: now - u.lastHeartbeat < 15000, // Active if heartbeat within 15s
          })),
          totalUsers: activeUsers.length,
        };
      })
    );

    // Get custom rooms
    const { data: customRoomsData } = await supabase
      .from('kv_store_1f5afd66')
      .select('key, value')
      .like('key', 'sync_custom_room:%');
    
    const customRooms = await Promise.all(
      (customRoomsData || []).map(async ({ key, value }: any) => {
        const roomId = key.replace('sync_custom_room:', '');
        const roomData = await kv.get(`sync_room:${roomId}`);
        const users = roomData?.users || [];
        
        const now = Date.now();
        const activeUsers = users.filter((u: any) => now - u.lastHeartbeat < 30000);
        
        if (activeUsers.length !== users.length) {
          await kv.set(`sync_room:${roomId}`, { users: activeUsers });
        }

        return {
          id: roomId,
          name: value.name,
          category: value.category,
          description: value.description,
          isCustom: true,
          isPrivate: value.isPrivate || false,
          createdBy: value.createdBy,
          creatorName: value.creatorName,
          activeUsers: activeUsers.map((u: any) => ({
            id: u.userId,
            name: u.userName,
            avatar: u.userAvatar,
            joinedAt: u.joinedAt,
            isActive: now - u.lastHeartbeat < 15000,
          })),
          totalUsers: activeUsers.length,
        };
      })
    );

    return c.json([...defaultRooms, ...customRooms]);
  } catch (error: any) {
    console.error("Error getting sync rooms:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Create a custom sync room
app.post("/make-server-1f5afd66/sync/rooms/create", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { name, description, category, isPrivate, password, createdBy, creatorName } = body;

    // Validate inputs
    if (!name || !description || !category) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    if (isPrivate && !password) {
      return c.json({ error: 'Password required for private rooms' }, 400);
    }

    // Generate unique room ID
    const roomId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store room metadata
    const roomMetadata = {
      name,
      description,
      category,
      isPrivate,
      password: isPrivate ? String(password).trim() : undefined,
      createdBy,
      creatorName,
      createdAt: Date.now(),
    };
    
    console.log('Creating room with metadata:', { ...roomMetadata, password: roomMetadata.password ? '***' : undefined });
    await kv.set(`sync_custom_room:${roomId}`, roomMetadata);

    // Initialize empty room
    await kv.set(`sync_room:${roomId}`, { users: [] });

    return c.json({ success: true, roomId });
  } catch (error: any) {
    console.error("Error creating sync room:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Join a sync room
app.post("/make-server-1f5afd66/sync/rooms/:roomId/join", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const roomId = c.req.param('roomId');
    const body = await c.req.json();
    
    console.log('Join room request:', { roomId, hasPassword: !!body.password, userId: user.id });
    
    // Check if it's a custom room and if it's private
    const customRoomData = await kv.get(`sync_custom_room:${roomId}`);
    console.log('Custom room data:', { 
      exists: !!customRoomData, 
      isPrivate: customRoomData?.isPrivate,
      hasPassword: !!customRoomData?.password,
      roomId 
    });
    
    if (customRoomData && customRoomData.isPrivate) {
      // Verify password - only check if password is required
      const providedPassword = body.password ? String(body.password).trim() : '';
      const requiredPassword = customRoomData.password ? String(customRoomData.password).trim() : '';
      
      console.log('Password check:', { 
        providedLength: providedPassword.length, 
        requiredLength: requiredPassword.length,
        match: providedPassword === requiredPassword
      });
      
      if (providedPassword !== requiredPassword) {
        console.log('Password mismatch - rejecting join');
        return c.json({ error: 'Invalid password' }, 403);
      }
      
      console.log('Password verified successfully');
    }
    
    const roomKey = `sync_room:${roomId}`;
    const roomData = await kv.get(roomKey) || { users: [] };
    
    // Remove user if already in room (rejoin)
    const filteredUsers = roomData.users.filter((u: any) => u.userId !== user.id);
    
    // Add user to room
    const newUser = {
      userId: user.id,
      userName: body.userName,
      userAvatar: body.userAvatar,
      joinedAt: Date.now(),
      lastHeartbeat: Date.now(),
    };
    
    roomData.users = [...filteredUsers, newUser];
    await kv.set(roomKey, roomData);

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Error joining sync room:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Leave a sync room
app.post("/make-server-1f5afd66/sync/rooms/:roomId/leave", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const roomId = c.req.param('roomId');
    const roomKey = `sync_room:${roomId}`;
    const roomData = await kv.get(roomKey) || { users: [] };
    
    // Remove user from room
    roomData.users = roomData.users.filter((u: any) => u.userId !== user.id);
    await kv.set(roomKey, roomData);

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Error leaving sync room:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Heartbeat to keep user active in sync room
app.post("/make-server-1f5afd66/sync/rooms/:roomId/heartbeat", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const roomId = c.req.param('roomId');
    const roomKey = `sync_room:${roomId}`;
    const roomData = await kv.get(roomKey) || { users: [] };
    
    // Update user's last heartbeat
    roomData.users = roomData.users.map((u: any) => {
      if (u.userId === user.id) {
        return { ...u, lastHeartbeat: Date.now() };
      }
      return u;
    });
    
    await kv.set(roomKey, roomData);

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Error updating heartbeat:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Delete a custom sync room
app.delete("/make-server-1f5afd66/sync/rooms/:roomId/delete", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const roomId = c.req.param('roomId');
    
    // Check if room exists and user is the creator
    const customRoomData = await kv.get(`sync_custom_room:${roomId}`);
    if (!customRoomData) {
      return c.json({ error: 'Room not found' }, 404);
    }

    if (customRoomData.createdBy !== user.id) {
      return c.json({ error: 'Only the creator can delete this room' }, 403);
    }

    // Delete room metadata and user data
    await kv.del(`sync_custom_room:${roomId}`);
    await kv.del(`sync_room:${roomId}`);

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting sync room:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Get chat messages for a sync room
app.get("/make-server-1f5afd66/sync/rooms/:roomId/chat", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) return c.json({ error: 'Unauthorized' }, 401);

    const roomId = c.req.param('roomId');
    const messages = await kv.get(`sync_chat:${roomId}`) || [];
    return c.json(messages);
  } catch (error: any) {
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Post a chat message to a sync room
app.post("/make-server-1f5afd66/sync/rooms/:roomId/chat", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) return c.json({ error: 'Unauthorized' }, 401);

    const roomId = c.req.param('roomId');
    const body = await c.req.json();
    if (!body.text?.trim()) return c.json({ error: 'Message required' }, 400);

    const messages: any[] = await kv.get(`sync_chat:${roomId}`) || [];
    const newMessage = {
      id: `${Date.now()}-${user.id}`,
      userId: user.id,
      userName: body.userName || 'Unknown',
      userAvatar: body.userAvatar || '',
      text: body.text.trim(),
      timestamp: Date.now(),
    };
    // Keep last 100 messages
    const updated = [...messages, newMessage].slice(-100);
    await kv.set(`sync_chat:${roomId}`, updated);
    return c.json(newMessage);
  } catch (error: any) {
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Back/Unback a user
app.post("/make-server-1f5afd66/users/:targetUserId/back", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const targetUserId = c.req.param('targetUserId');
    
    // Can't back yourself
    if (user.id === targetUserId) {
      return c.json({ error: 'Cannot back yourself' }, 400);
    }
    
    // Prevent backing mock/demo users (IDs 1-5 are reserved for frontend mock data)
    const mockUserIds = ['1', '2', '3', '4', '5'];
    if (mockUserIds.includes(targetUserId)) {
      return c.json({ error: 'Cannot back demo users' }, 400);
    }

    // Check if already backing
    const backingKey = `backing:${user.id}:${targetUserId}`;
    const existingBacking = await kv.get(backingKey);
    
    if (existingBacking) {
      // Unback - remove the backing relationship
      await kv.del(backingKey);
      return c.json({ success: true, isBacking: false });
    } else {
      // Back - create the backing relationship
      await kv.set(backingKey, {
        backerId: user.id,
        targetId: targetUserId,
        timestamp: Date.now(),
      });
      return c.json({ success: true, isBacking: true });
    }
  } catch (error: any) {
    console.error("Error toggling back status:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Get list of users that current user is backing (must be before /:userId routes)
app.get("/make-server-1f5afd66/users/backing", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const backingRelationships = await kv.getByPrefix(`backing:${user.id}:`);
    const backingUserIds = backingRelationships.map((rel: any) => rel.targetId);

    return c.json({ backingUserIds });
  } catch (error: any) {
    console.error("Error getting backing list:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Get backing status for a user
app.get("/make-server-1f5afd66/users/:targetUserId/backing-status", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const targetUserId = c.req.param('targetUserId');
    const backingKey = `backing:${user.id}:${targetUserId}`;
    const existingBacking = await kv.get(backingKey);
    
    return c.json({ isBacking: !!existingBacking });
  } catch (error: any) {
    console.error("Error getting backing status:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Get backing/backer counts for a specific user
app.get("/make-server-1f5afd66/users/:userId/backing-counts", async (c) => {
  try {
    const userId = c.req.param('userId');
    
    // Get backing count (how many users this user is backing)
    const backingRelationships = await kv.getByPrefix(`backing:${userId}:`);
    const backingCount = backingRelationships.length;
    
    // Get backer count (how many users are backing this user)
    // Need to search all backing relationships to find ones targeting this user
    const allBackingRelationships = await kv.getByPrefix('backing:');
    const backerCount = allBackingRelationships.filter((rel: any) => rel.targetId === userId).length;
    
    return c.json({ backingCount, backerCount });
  } catch (error: any) {
    console.error("Error getting backing counts:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Get list of users backing a specific user (backers)
app.get("/make-server-1f5afd66/users/:userId/backers-list", async (c) => {
  try {
    const userId = c.req.param('userId');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    // Get all backing relationships and filter for ones targeting this user
    const allBackingRelationships = await kv.getByPrefix('backing:');
    
    const backerIds = allBackingRelationships
      .filter((rel: any) => rel.targetId === userId)
      .map((rel: any) => rel.backerId);
    
    // Fetch user details for each backer
    const backers = await Promise.all(
      backerIds.map(async (id: string) => {
        // Try to get user from KV store first
        let user = await kv.get(`user:${id}`);
        
        // If not in KV store, try to get from Supabase Auth
        if (!user) {
          try {
            const { data: authUser, error } = await supabase.auth.admin.getUserById(id);
            if (authUser?.user) {
              user = {
                id: authUser.user.id,
                name: authUser.user.user_metadata?.name || 'Unknown User',
                avatar: authUser.user.user_metadata?.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${id}`,
                bio: authUser.user.user_metadata?.bio || ''
              };
            }
          } catch (authError) {
            console.error(`Error fetching user ${id} from Auth:`, authError);
          }
        }
        
        return user ? {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          bio: user.bio
        } : null;
      })
    );
    
    // Filter out any null values (users that don't exist)
    const validBackers = backers.filter((user: any) => user !== null);
    
    return c.json({ backers: validBackers });
  } catch (error: any) {
    console.error("Error getting backers list:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Debug endpoint to check backing relationships
app.get("/make-server-1f5afd66/debug/backing-relationships", async (c) => {
  try {
    const allBackingRels = await kv.getByPrefix('backing:');
    return c.json({ 
      total: allBackingRels.length,
      relationships: allBackingRels
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Cleanup endpoint to remove backing relationships to mock users
app.post("/make-server-1f5afd66/cleanup-mock-backing", async (c) => {
  try {
    const mockUserIds = ['1', '2', '3', '4', '5'];
    const allBackingRels = await kv.getByPrefix('backing:');
    let deletedCount = 0;
    
    // Delete any backing relationships to or from mock users
    for (const rel of allBackingRels) {
      if (mockUserIds.includes(rel.targetId) || mockUserIds.includes(rel.backerId)) {
        const key = `backing:${rel.backerId}:${rel.targetId}`;
        await kv.del(key);
        deletedCount++;
      }
    }
    
    return c.json({ 
      success: true, 
      message: `Removed ${deletedCount} backing relationships involving mock users` 
    });
  } catch (error: any) {
    console.error("Error cleaning up mock backing:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Get list of users that a specific user is backing
app.get("/make-server-1f5afd66/users/:userId/backing-list", async (c) => {
  try {
    const userId = c.req.param('userId');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    // Get ALL backing relationships and filter for this user as backer
    const allBackingRelationships = await kv.getByPrefix('backing:');
    const backingRelationships = allBackingRelationships.filter((rel: any) => 
      rel && rel.backerId === userId
    );
    
    const backingUserIds = backingRelationships.map((rel: any) => rel.targetId);
    
    // Fetch user details for each user being backed
    const backingUsers = await Promise.all(
      backingUserIds.map(async (id: string) => {
        // Try to get user from KV store first
        let user = await kv.get(`user:${id}`);
        
        // If not in KV store, try to get from Supabase Auth
        if (!user) {
          try {
            const { data: authUser, error } = await supabase.auth.admin.getUserById(id);
            if (authUser?.user) {
              user = {
                id: authUser.user.id,
                name: authUser.user.user_metadata?.name || 'Unknown User',
                avatar: authUser.user.user_metadata?.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${id}`,
                bio: authUser.user.user_metadata?.bio || ''
              };
            }
          } catch (authError) {
            console.error(`Error fetching user ${id} from Auth:`, authError);
          }
        }
        
        return user ? {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          bio: user.bio
        } : null;
      })
    );
    
    // Filter out any null values (users that don't exist)
    const validBackingUsers = backingUsers.filter((user: any) => user !== null);
    
    return c.json({ backing: validBackingUsers });
  } catch (error: any) {
    console.error("Error getting backing list:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Delete user endpoint - properly cleans up user data and frees alias
app.delete("/make-server-1f5afd66/users/:userId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userIdToDelete = c.req.param('userId');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    // Verify the requesting user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Only allow users to delete their own account (or you could add admin logic here)
    if (user.id !== userIdToDelete) {
      return c.json({ error: 'You can only delete your own account' }, 403);
    }
    
    // Get user data to find their alias (may be missing if KV was cleared)
    const userData = await kv.get(`user:${userIdToDelete}`);

    console.log(`Deleting user ${userIdToDelete}, data:`, userData);

    // Delete the alias mapping if it exists
    if (userData?.alias) {
      const aliasKey = `alias:${userData.alias.toLowerCase()}`;
      console.log(`About to delete alias mapping: ${aliasKey}`);
      await kv.del(aliasKey);
      console.log(`Successfully deleted alias mapping: ${aliasKey}`);
      
      // Verify deletion
      const checkAlias = await kv.get(aliasKey);
      if (checkAlias) {
        console.error(`WARNING: Alias ${aliasKey} still exists after deletion!`);
      } else {
        console.log(`Verified: Alias ${aliasKey} has been freed`);
      }
    }
    
    // Delete user profile from KV store
    await kv.del(`user:${userIdToDelete}`);
    console.log(`Deleted user profile: user:${userIdToDelete}`);
    
    // Delete all user's posts
    const allPosts = await kv.getByPrefix("post:");
    const userPosts = allPosts.filter((post: any) => post.value.userId === userIdToDelete);
    for (const post of userPosts) {
      await kv.del(post.key);
    }
    console.log(`Deleted ${userPosts.length} posts for user ${userIdToDelete}`);
    
    // Delete all backing/backer relationships
    await kv.del(`backers:${userIdToDelete}`);
    await kv.del(`backing:${userIdToDelete}`);
    
    // Remove from other users' backing/backer lists
    const allBackers = await kv.getByPrefix("backers:");
    for (const entry of allBackers) {
      const backerList = entry.value || [];
      if (backerList.includes(userIdToDelete)) {
        const updatedList = backerList.filter((id: string) => id !== userIdToDelete);
        await kv.set(entry.key, updatedList);
      }
    }
    
    const allBacking = await kv.getByPrefix("backing:");
    for (const entry of allBacking) {
      const backingList = entry.value || [];
      if (backingList.includes(userIdToDelete)) {
        const updatedList = backingList.filter((id: string) => id !== userIdToDelete);
        await kv.set(entry.key, updatedList);
      }
    }
    
    console.log(`Cleaned up backing/backer relationships for user ${userIdToDelete}`);
    
    // Delete from Supabase Auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userIdToDelete);
    
    if (deleteError) {
      console.error("Error deleting user from Supabase Auth:", deleteError);
      return c.json({ error: "Failed to delete user from authentication system" }, 500);
    }
    
    console.log(`Successfully deleted user ${userIdToDelete} and freed alias`);
    return c.json({ 
      success: true, 
      message: "User deleted successfully. Alias is now available for reuse." 
    });
    
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Debug endpoint to check if a specific alias exists
app.get("/make-server-1f5afd66/debug/alias/:alias", async (c) => {
  try {
    const alias = c.req.param('alias');
    const aliasKey = `alias:${alias.toLowerCase()}`;
    
    const userId = await kv.get(aliasKey);
    
    if (!userId) {
      return c.json({ 
        exists: false,
        message: `Alias '${alias}' is not registered`
      });
    }
    
    const user = await kv.get(`user:${userId}`);
    
    return c.json({
      exists: true,
      aliasKey,
      userId,
      userExists: !!user,
      userData: user || null,
      message: user 
        ? `Alias '${alias}' belongs to user ${userId}` 
        : `Alias '${alias}' is orphaned (user ${userId} doesn't exist)`
    });
  } catch (error: any) {
    console.error("Error checking alias:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Debug endpoint to manually delete specific aliases
app.delete("/make-server-1f5afd66/debug/alias/:alias", async (c) => {
  try {
    const alias = c.req.param('alias');
    const aliasKey = `alias:${alias.toLowerCase()}`;
    
    // Check if alias exists
    const userId = await kv.get(aliasKey);
    
    if (!userId) {
      return c.json({ 
        success: false,
        message: `Alias '${alias}' does not exist in the database`
      });
    }
    
    // Delete the alias
    await kv.del(aliasKey);
    console.log(`Manually deleted alias: ${aliasKey}`);
    
    // Verify deletion
    const checkAlias = await kv.get(aliasKey);
    
    if (checkAlias) {
      return c.json({ 
        success: false,
        message: `Failed to delete alias '${alias}'`
      }, 500);
    }
    
    return c.json({
      success: true,
      message: `Successfully deleted alias '${alias}' (was mapped to user ${userId})`,
      deletedAlias: alias,
      deletedKey: aliasKey,
      previousUserId: userId
    });
  } catch (error: any) {
    console.error("Error deleting alias:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// One-time cleanup endpoint to delete specific orphaned aliases
app.post("/make-server-1f5afd66/cleanup-orphaned-aliases", async (c) => {
  try {
    const aliasesToCleanup = ['Dig1nt1', 'Abir', 'AbirHere'];
    const results: any[] = [];
    
    for (const alias of aliasesToCleanup) {
      const aliasKey = `alias:${alias.toLowerCase()}`;
      const userId = await kv.get(aliasKey);
      
      if (userId) {
        // Check if user exists
        const user = await kv.get(`user:${userId}`);
        
        if (!user) {
          // User doesn't exist, delete the orphaned alias
          await kv.del(aliasKey);
          console.log(`Cleaned up orphaned alias: ${aliasKey} (user ${userId} doesn't exist)`);
          results.push({
            alias,
            status: 'deleted',
            reason: 'orphaned',
            previousUserId: userId
          });
        } else {
          results.push({
            alias,
            status: 'kept',
            reason: 'user_exists',
            userId
          });
        }
      } else {
        results.push({
          alias,
          status: 'not_found',
          reason: 'does_not_exist'
        });
      }
    }
    
    return c.json({
      success: true,
      message: 'Cleanup completed',
      results
    });
  } catch (error: any) {
    console.error("Error during cleanup:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
});

// Confirm all unconfirmed auth users (fixes accounts stuck without email confirmation)
app.post("/make-server-1f5afd66/admin/confirm-all-users", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (error) return c.json({ error: error.message }, 500);

    let confirmed = 0;
    for (const user of data.users) {
      if (!user.email_confirmed_at) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
          email_confirm: true,
        });
        if (!updateError) confirmed++;
      }
    }

    return c.json({ success: true, confirmed, total: data.users.length });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Reset password for a user (admin endpoint for recovery)
app.post("/make-server-1f5afd66/admin/reset-password", async (c) => {
  try {
    const { email, newPassword } = await c.req.json();
    if (!email || !newPassword) return c.json({ error: "email and newPassword required" }, 400);
    if (newPassword.length < 6) return c.json({ error: "Password must be at least 6 characters" }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Find user by email
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listError) return c.json({ error: listError.message }, 500);

    const user = listData.users.find(u => u.email === email);
    if (!user) return c.json({ error: "User not found" }, 404);

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
      email_confirm: true,
    });

    if (updateError) return c.json({ error: updateError.message }, 500);
    return c.json({ success: true, message: "Password reset successfully" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Suppress "connection closed before message completed" noise from aborted client requests
globalThis.addEventListener("unhandledrejection", (e) => {
  if (e.reason?.name === "Http") {
    e.preventDefault();
  }
});

Deno.serve((req) =>
  app.fetch(req).catch((err) => {
    if (err?.name === "Http") return new Response(null, { status: 0 });
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  })
);