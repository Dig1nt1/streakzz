import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Flame, Loader2, CheckCircle, XCircle } from "lucide-react";
import { getSupabaseClient } from "../utils/supabase/client";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import streakzLogo from "figma:asset/0b5993ed4ace0b1938a06682c91bcf77a5cd9292.png";
import backgroundTexture from "figma:asset/6128107800268459dda51dfef463f0e68d789714.png";

const safeJson = async (res: Response) => {
  try { return await res.json(); } catch { return null; }
};

interface AuthViewProps {
  onAuthSuccess: (accessToken: string, userId: string, userName: string, isNewUser?: boolean) => void;
}

export function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupAlias, setSignupAlias] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  
  // Alias validation state
  const [isCheckingAlias, setIsCheckingAlias] = useState(false);
  const [aliasAvailable, setAliasAvailable] = useState<boolean | null>(null);
  const [aliasError, setAliasError] = useState("");

  // Check alias availability in real-time
  useEffect(() => {
    const checkAliasAvailability = async () => {
      // Only check if alias has at least 3 characters
      if (signupAlias.trim().length < 3) {
        setAliasAvailable(null);
        setAliasError("");
        return;
      }

      setIsCheckingAlias(true);
      setAliasError("");

      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/check-alias/${encodeURIComponent(signupAlias.trim())}`,
          {
            headers: {
              "Authorization": `Bearer ${publicAnonKey}`,
            },
          }
        );

        const data = await safeJson(response);

        if (response.ok && data) {
          setAliasAvailable(data.available);
          if (!data.available) {
            setAliasError("This alias is already taken");
          }
        }
      } catch (error) {
        console.error("Error checking alias:", error);
      } finally {
        setIsCheckingAlias(false);
      }
    };

    // Debounce the check by 500ms
    const timeoutId = setTimeout(checkAliasAvailability, 500);

    return () => clearTimeout(timeoutId);
  }, [signupAlias]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const supabase = getSupabaseClient();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      if (data?.session?.access_token && data?.user?.id) {
        // Fetch or create user profile
        try {
          const profileResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/user/${data.user.id}`,
            {
              headers: {
                "Authorization": `Bearer ${publicAnonKey}`,
              },
            }
          );
          
          let userName = data.user.user_metadata?.name || loginEmail.split('@')[0];
          
          if (profileResponse.ok) {
            const profile = await profileResponse.json();
            userName = profile.name || userName;
          }
          
          onAuthSuccess(data.session.access_token, data.user.id, userName);
        } catch (profileErr) {
          console.error("Error fetching profile:", profileErr);
          // Continue with login even if profile fetch fails
          const userName = data.user.user_metadata?.name || loginEmail.split('@')[0];
          onAuthSuccess(data.session.access_token, data.user.id, userName);
        }
      } else {
        throw new Error("Login failed: No session created");
      }
    } catch (err: any) {
      let errorMessage = err.message || "Failed to login. Please check your credentials.";

      // Provide more helpful error messages
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError") || errorMessage.includes("fetch")) {
        errorMessage = "Unable to connect. Please check your internet connection and try again.";
      } else if (errorMessage.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password. Please check your credentials or sign up for a new account.";
      } else if (errorMessage.includes("Email not confirmed")) {
        errorMessage = "Please verify your email address before logging in.";
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validation
    if (signupAlias.trim().length < 3) {
      setError("Alias must be at least 3 characters");
      setIsLoading(false);
      return;
    }

    if (aliasAvailable === false) {
      setError("This alias is already taken. Please choose another one.");
      setIsLoading(false);
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (signupPassword.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    try {
      // Try server-side signup first (handles alias uniqueness + profile storage)
      let serverOk = false;
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1f5afd66/signup`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              email: signupEmail,
              password: signupPassword,
              name: signupAlias,
              alias: signupAlias,
            }),
          }
        );

        const data = await safeJson(response);

        if (response.ok && data?.userId && data?.accessToken) {
          onAuthSuccess(data.accessToken, data.userId, signupAlias, true);
          serverOk = true;
        } else if (response.ok) {
          throw new Error("Signup succeeded but failed to create session");
        } else if (data?.error) {
          // Real server error (e.g. alias taken) — don't fall back
          throw new Error(data.error);
        }
        // Non-JSON / 5xx → fall through to direct auth below
      } catch (serverErr: any) {
        if (serverErr.message && !serverErr.message.includes("server may not be deployed")) {
          throw serverErr; // Propagate real errors (alias taken, validation, etc.)
        }
      }

      if (!serverOk) {
        // Fall back to direct Supabase auth when edge function is unavailable
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signUp({
          email: signupEmail,
          password: signupPassword,
          options: { data: { name: signupAlias, alias: signupAlias } },
        });

        if (error) throw new Error(error.message);
        if (!data.session) throw new Error("Check your email to confirm your account, then log in.");

        onAuthSuccess(data.session.access_token, data.user!.id, signupAlias, true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: `url(${backgroundTexture})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <img 
              src={streakzLogo} 
              alt="Streakz Logo" 
              className="h-16 w-16 drop-shadow-lg"
            />
            <h1 className="text-[rgb(242,83,27)] text-3xl">Streakz</h1>
          </div>
          <p className="text-gray-300 mb-2">
            Track, share, and celebrate your winning streaks
          </p>
          <p className="text-sm text-gray-400">
            Join the community of achievers 🔥
          </p>
        </div>

        <Card className="p-6 border-white/10 bg-black/40 backdrop-blur-md">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-white/80">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-white/80">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>

                <div className="relative mt-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    
                  </div>
                </div>

                
              </form>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-alias" className="text-white/80">Username / Alias (min. 3 characters)</Label>
                  <p className="text-xs text-gray-400">This will be your unique display name on Streakz</p>
                  <div className="relative">
                    <Input
                      id="signup-alias"
                      type="text"
                      placeholder="Choose your unique username"
                      value={signupAlias}
                      onChange={(e) => setSignupAlias(e.target.value)}
                      required
                      disabled={isLoading}
                      className={`pr-10 ${
                        signupAlias.trim().length >= 3 && aliasAvailable === false
                          ? 'border-red-500 focus-visible:ring-red-500'
                          : signupAlias.trim().length >= 3 && aliasAvailable === true
                          ? 'border-green-500 focus-visible:ring-green-500'
                          : ''
                      }`}
                    />
                    {signupAlias.trim().length >= 3 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isCheckingAlias ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        ) : aliasAvailable === true ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : aliasAvailable === false ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  {aliasError && (
                    <p className="text-xs text-red-500 mt-1">{aliasError}</p>
                  )}
                  {signupAlias.trim().length >= 3 && aliasAvailable === true && (
                    <p className="text-xs text-green-500 mt-1">This alias is available!</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-white/80">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-white/80">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm" className="text-white/80">Confirm Password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="mt-6 space-y-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-black/40 px-2 text-gray-400">Demo Accounts</span>
            </div>
          </div>
          
          <div className="text-center text-sm text-gray-300">
            <p className="mb-2">Try the demo account:</p>
            <div className="bg-black/30 rounded-lg p-3 text-left space-y-2 border border-white/10">
              <div className="space-y-1">
                <p><span className="text-white">Email:</span> demo@streakz.app</p>
                <p><span className="text-white">Password:</span> demo123</p>
              </div>
              <Button
                onClick={() => {
                  setLoginEmail("demo@streakz.app");
                  setLoginPassword("demo123");
                }}
                variant="outline"
                size="sm"
                className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white"
              >
                Use Demo Account
              </Button>
            </div>
          </div>

          <p className="text-center text-gray-400 text-xs">
            By continuing, you agree to Streakz's Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
