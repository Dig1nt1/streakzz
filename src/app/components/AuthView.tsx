import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { InstallAppBanner } from "./InstallAppBanner";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Flame, Loader2, CheckCircle, XCircle } from "lucide-react";
import { getSupabaseClient } from "../utils/supabase/client";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import streakzLogo from "figma:asset/0b5993ed4ace0b1938a06682c91bcf77a5cd9292.png";

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
      // Server-side signup handles alias uniqueness + profile storage
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

      if (!response.ok || !data?.userId) {
        // Real server error (e.g. alias taken) or the server is unavailable
        throw new Error(data?.error || "We couldn't create your account right now. Please try again in a moment.");
      }

      // Sign in on the browser client so the session is stored and survives a reload
      const supabase = getSupabaseClient();
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: signupEmail,
        password: signupPassword,
      });

      if (signInError || !signInData?.session?.access_token || !signInData?.user?.id) {
        throw new Error("Your account was created, but we couldn't sign you in. Please log in.");
      }

      onAuthSuccess(signInData.session.access_token, signInData.user.id, signupAlias, true);
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ground pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <InstallAppBanner className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[380px]" />
      <div className="mx-auto grid min-h-screen max-w-[1120px] items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-14">
        {/* Brand and promise */}
        <div className="flex flex-col gap-6 lg:gap-7">
          <div className="flex items-center gap-2">
            <img src={streakzLogo} alt="" className="h-7 w-7" />
            <span className="text-[17px] font-semibold tracking-tight text-white">Streakz</span>
          </div>
          <img
            src={streakzLogo}
            alt="Streakz flame logo"
            className="streakz-flicker hidden w-[min(280px,60%)] lg:block"
          />
          <div>
            <h1 className="text-[28px] font-semibold leading-9 tracking-tight text-white sm:text-[32px] sm:leading-[38px]">Keep your streak alive</h1>
            <p className="mt-2 max-w-[440px] text-base leading-6 text-muted-text">
              Track, share, and celebrate your winning streaks. Join the community of achievers.
            </p>
          </div>
          <dl className="hidden max-w-[520px] grid-cols-2 gap-x-7 gap-y-4 lg:grid">
            {[
              ["Track your streaks", "Log your daily wins and build momentum"],
              ["Join the community", "Connect with others and share your progress"],
              ["Compete and win", "Climb the leaderboards and earn recognition"],
              ["Stay motivated", "Get inspired by others' achievements"],
            ].map(([term, detail]) => (
              <div key={term}>
                <dt className="text-sm font-semibold text-white">{term}</dt>
                <dd className="text-sm text-muted-text">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="w-full">
        <Card className="p-7 gap-0 bg-surface">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm text-white">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Your email address"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm text-white">Password</Label>
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
                  className="w-full bg-white text-black hover:bg-[#e6e3df]"
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


                
              </form>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-alias" className="text-sm text-white">Username / Alias (min. 3 characters)</Label>
                  <p className="text-xs text-muted-text">This will be your unique display name on Streakz</p>
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
                          ? 'border-positive focus-visible:ring-positive'
                          : ''
                      }`}
                    />
                    {signupAlias.trim().length >= 3 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isCheckingAlias ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-text" />
                        ) : aliasAvailable === true ? (
                          <CheckCircle className="h-4 w-4 text-positive" />
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
                    <p className="text-xs text-positive mt-1">This alias is available!</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm text-white">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Your email address"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm text-white">Password</Label>
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
                  <Label htmlFor="signup-confirm" className="text-sm text-white">Confirm Password</Label>
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
                  className="w-full bg-white text-black hover:bg-[#e6e3df]"
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

        <div className="mt-[14px] space-y-4">
          <div className="text-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[20px] bg-surface p-4">
              <div className="min-w-[200px] flex-1 leading-[22px] text-muted-text">
                Demo account
                <br />
                <span className="text-white">demo@streakz.app</span> · <span className="text-white">demo123</span>
              </div>
              <Button
                onClick={() => {
                  setLoginEmail("demo@streakz.app");
                  setLoginPassword("demo123");
                }}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
              >
                Use demo account
              </Button>
            </div>
          </div>

          <p className="text-center text-faint text-xs">
            By continuing, you agree to Streakz's Terms of Service and Privacy Policy
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}
