import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User as UserIcon, ArrowLeft, Eye, EyeOff, Heart, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/contexts/AuthContext";
import SEO from "@/components/SEO";
import DeskLamp from "@/components/auth/DeskLamp";
import { playSwitchClick, playHumOn, playHumOff } from "@/lib/lamp-audio";

type Mode = "signin" | "signup";
type SocialProvider = "google" | "apple" | "lovable";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [lampOn, setLampOn] = useState(true);
  const [mode, setMode] = useState<Mode>("signin");
  const [loginLoading, setLoginLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  // Reset loading on mount (handles OAuth redirect back)
  useEffect(() => {
    setLoginLoading(false);
    setSignupLoading(false);
    setSocialLoading(null);
  }, []);

  // Auto-redirect to home once authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const toggleLamp = () => {
    playSwitchClick();
    setLampOn((prev) => {
      const next = !prev;
      // small delay so the hum follows the click
      window.setTimeout(() => (next ? playHumOn() : playHumOff()), 90);
      return next;
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoginLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Welcome back!" });
      navigate("/", { replace: true });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: { full_name: signupName },
        emailRedirectTo: window.location.origin,
      },
    });
    setSignupLoading(false);
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a verification link." });
    }
  };

  const handleSocialSignIn = async (provider: SocialProvider) => {
    setSocialLoading(provider);
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    // Don't reset loading here - page will redirect
    if (error) {
      setSocialLoading(null);
      toast({ title: "Sign-in failed", description: String(error), variant: "destructive" });
    }
  };

  const handleForgotPassword = async () => {
    if (!loginEmail) {
      toast({ title: "Enter your email first", variant: "destructive" });
      return;
    }
    setLoginLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoginLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a password reset link." });
    }
  };

  const isSignin = mode === "signin";

  return (
    <div className={`auth-night relative min-h-screen overflow-hidden ${lampOn ? "" : "auth-night--off"}`}>
      <SEO
        title="Sign In or Sign Up — ShareKart"
        description="Create your ShareKart account or log in to rent, sell, and donate items in your community."
        path="/auth"
      />

      {/* dimming overlay when the lamp is off */}
      <motion.div
        className="absolute inset-0 z-30 bg-black pointer-events-none"
        animate={{ opacity: lampOn ? 0 : 0.6 }}
        transition={{ duration: 0.8 }}
      />

      <div className="relative z-10 min-h-screen flex flex-col md:flex-row md:items-center gap-4 md:gap-8 px-4 md:px-10 py-6 max-w-7xl mx-auto">
        {/* lamp — desktop left column */}
        <div className="hidden md:flex flex-1 items-end justify-center self-stretch min-h-[420px]">
          <DeskLamp on={lampOn} onToggle={toggleLamp} />
        </div>

        {/* lamp — mobile top, shining down */}
        <div className="md:hidden pt-2">
          <DeskLamp on={lampOn} onToggle={toggleLamp} />
        </div>

        {/* form card — right column, lit by the beam */}
        <div className="relative flex-1 flex flex-col items-center md:items-start justify-center">
          {/* light pool cast on the card area */}
          <motion.div
            className="absolute -inset-16 pointer-events-none rounded-full auth-light-pool"
            animate={{ opacity: lampOn ? 1 : 0 }}
            transition={{ duration: 0.8 }}
          />

          <Link
            to="/"
            className="auth-muted inline-flex items-center gap-1 text-sm mb-4 hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="h-4 w-4" /> Back to ShareKart
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`auth-card w-full max-w-md relative ${lampOn ? "auth-card--lit" : "auth-card--dim"}`}
          >
            {/* dark glass overlay when the lamp is off */}
            <motion.div
              className="absolute inset-0 rounded-2xl bg-black z-20 pointer-events-none"
              animate={{ opacity: lampOn ? 0 : 0.55 }}
              transition={{ duration: 0.8 }}
            />

            <div className="relative z-10 p-7 sm:p-8">
              {/* brand */}
              <div className="flex items-center gap-2 mb-6">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--an-accent)] opacity-60" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--an-accent)] shadow-[0_0_12px_2px_rgba(255,184,92,0.7)]" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.35em] auth-muted">
                  Your Space
                </span>
              </div>

              {/* tab switcher with sliding underline */}
              <div className="relative grid grid-cols-2 mb-6 border-b border-white/10">
                {(["signin", "signup"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`pb-3 text-sm font-medium tracking-wide transition-colors ${
                      mode === m ? "auth-text" : "auth-muted hover:opacity-80"
                    }`}
                  >
                    {m === "signin" ? "Sign In" : "Sign Up"}
                  </button>
                ))}
                <motion.div
                  layoutId="auth-tab-underline"
                  className="absolute bottom-0 h-[2px] w-1/2 auth-tab-underline"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.55 }}
                  style={{ left: isSignin ? "0%" : "50%" }}
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <h1 className="text-3xl font-bold auth-text mb-1">
                    {isSignin ? "Sign In" : "Sign Up"}
                  </h1>
                  <p className="auth-muted text-sm mb-6">
                    {isSignin ? "Welcome back — good to see you again." : "Create an account to get started"}
                  </p>

                  {isSignin ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="auth-field">
                        <UserIcon className="auth-field-icon" />
                        <input
                          type="email"
                          placeholder="Username or email"
                          className="auth-input pl-10"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                          autoComplete="email"
                        />
                      </div>
                      <div className="auth-field">
                        <Lock className="auth-field-icon" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          className="auth-input pl-10 pr-10"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 auth-muted hover:opacity-80"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 text-sm auth-muted cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                            className="auth-checkbox"
                          />
                          Remember me
                        </label>
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-sm auth-link"
                        >
                          Forgot?
                        </button>
                      </div>

                      <motion.button
                        type="submit"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="auth-btn-primary w-full mt-2"
                        disabled={loginLoading}
                      >
                        {loginLoading ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                          </span>
                        ) : (
                          "Sign In →"
                        )}
                      </motion.button>
                    </form>
                  ) : (
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="auth-field">
                        <UserIcon className="auth-field-icon" />
                        <input
                          type="text"
                          placeholder="Full name"
                          className="auth-input pl-10"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          required
                          autoComplete="name"
                        />
                      </div>
                      <div className="auth-field">
                        <Mail className="auth-field-icon" />
                        <input
                          type="email"
                          placeholder="you@example.com"
                          className="auth-input pl-10"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          required
                          autoComplete="email"
                        />
                      </div>
                      <div className="auth-field">
                        <Lock className="auth-field-icon" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Min 6 characters"
                          className="auth-input pl-10 pr-10"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          required
                          minLength={6}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 auth-muted hover:opacity-80"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      <motion.button
                        type="submit"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="auth-btn-primary w-full mt-2"
                        disabled={signupLoading}
                      >
                        {signupLoading ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
                          </span>
                        ) : (
                          "Create Account →"
                        )}
                      </motion.button>
                    </form>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* divider */}
              <div className="auth-divider my-6">
                <span>Or continue with</span>
              </div>

              {/* social auth row */}
              <div className="flex items-center justify-center gap-4">
                <motion.button
                  type="button"
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleSocialSignIn("google")}
                  disabled={socialLoading !== null}
                  className="auth-social-btn"
                  title="Continue with Google"
                  aria-label="Continue with Google"
                >
                  {socialLoading === "google" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleSocialSignIn("apple")}
                  disabled={socialLoading !== null}
                  className="auth-social-btn"
                  title="Continue with Apple"
                  aria-label="Continue with Apple"
                >
                  {socialLoading === "apple" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <svg className="h-5 w-5 auth-text" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                    </svg>
                  )}
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleSocialSignIn("lovable")}
                  disabled={socialLoading !== null}
                  className="auth-social-btn"
                  title="Sign in with Lovable"
                  aria-label="Sign in with Lovable"
                >
                  {socialLoading === "lovable" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Heart className="h-5 w-5 text-[#ff5c8a]" fill="currentColor" />
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* lamp hint */}
          <p className="auth-muted text-xs mt-4 opacity-70">
            {lampOn ? "Tip: flip the switch on the lamp base to dim the room." : "The room is dark — flip the lamp switch or pull the cord."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
