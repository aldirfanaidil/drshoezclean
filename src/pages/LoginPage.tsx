import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLoginRateLimit } from "@/hooks/useLoginRateLimit";
import { sanitizeString, validateEmail, validatePassword } from "@/lib/validation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import defaultLogo from "@/assets/logo.png";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, settings } = useAppStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Rate limiting
  const { isLocked, formatRemainingTime, recordFailedAttempt, resetAttempts, attemptsRemaining } = useLoginRateLimit();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if locked out
    if (isLocked) {
      toast({
        title: "Terlalu banyak percobaan",
        description: `Coba lagi dalam ${formatRemainingTime()}`,
        variant: "destructive",
      });
      return;
    }

    // Validate inputs
    const emailValidation = validateEmail(username);
    if (!emailValidation.valid) {
      toast({
        title: "Error",
        description: emailValidation.message,
        variant: "destructive",
      });
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      toast({
        title: "Error",
        description: passwordValidation.message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // Sanitize and login
    const sanitizedEmail = sanitizeString(username);
    const success = await login(sanitizedEmail, password);

    if (success) {
      resetAttempts();
      toast({
        title: "Login Berhasil",
        description: "Selamat datang kembali!",
      });
      navigate("/admin");
    } else {
      recordFailedAttempt();
      toast({
        title: "Login Gagal",
        description: attemptsRemaining > 1
          ? `Email atau password salah. ${attemptsRemaining - 1} percobaan tersisa.`
          : "Email atau password salah",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 animate-fade-in">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            <img src={settings.logo || defaultLogo} alt="Logo" className="w-20 h-20 object-cover mx-auto rounded-full" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">{settings.name}</CardTitle>
          <CardDescription className="text-muted-foreground">
            Masuk ke panel admin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Masuk
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
