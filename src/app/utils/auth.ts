import { getSupabaseClient } from "./supabase/client";
import { projectId, publicAnonKey } from "./supabase/info";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  joined: string;
  totalStreaks: number;
  longestStreak: number;
  activeStreaks: number;
}

export async function getCurrentSession() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.getSession();
  
  if (error || !data.session) {
    return null;
  }

  return {
    accessToken: data.session.access_token,
    userId: data.session.user.id,
    userName: data.session.user.user_metadata?.name || data.session.user.email?.split('@')[0] || "User",
    email: data.session.user.email,
  };
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/user/${userId}`,
      {
        headers: {
          "Authorization": `Bearer ${publicAnonKey}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export async function signOut() {
  const supabase = getSupabaseClient();

  await supabase.auth.signOut();
}
