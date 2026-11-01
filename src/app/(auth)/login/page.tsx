"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { loginSchema, type LoginInput } from "@/lib/validation/schemas";
import { signIn } from "@/lib/auth/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setIsLoading(true);
      const res = await signIn.email({
        email: data.email,
        password: data.password,
      });

      if (res.error) {
        toast.error(res.error.message || "Invalid email or password");
        return;
      }

      toast.success("Welcome back!");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      const res = await signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });

      if (res?.error) {
        toast.error(
          "Google OAuth credentials (GOOGLE_CLIENT_ID & SECRET) are required in .env for Google login. You can log in directly using email & password!"
        );
      }
    } catch (err: any) {
      toast.error(
        "Google OAuth credentials are not configured yet. Please use email & password or add Google keys in .env."
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E8EAF0] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#E8EAF0] border border-white/80 shadow-[10px_10px_20px_rgba(163,177,198,0.45),-10px_-10px_20px_rgba(255,255,255,0.95)] rounded-2xl">
        <CardHeader className="text-center pb-5">
          <div className="mx-auto w-11 h-11 rounded-2xl bg-[#E8EAF0] border border-white/80 shadow-[4px_4px_10px_rgba(163,177,198,0.45),-4px_-4px_10px_rgba(255,255,255,0.95)] flex items-center justify-center mb-3">
            <span className="w-3.5 h-3.5 rounded-full bg-[#F28C28]"></span>
          </div>
          <CardTitle className="text-xl font-bold text-[#172033]">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-xs text-[#64748B] mt-1">
            Access your secure RemoteCam dashboard
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Google Sign-in 3D Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full h-11 rounded-xl bg-[#E8EAF0] border border-white font-semibold text-xs text-[#172033] shadow-[5px_5px_12px_rgba(163,177,198,0.5),-5px_-5px_12px_rgba(255,255,255,0.95)] hover:shadow-[3px_3px_8px_rgba(163,177,198,0.45),-3px_-3px_8px_rgba(255,255,255,0.95)] active:shadow-[inset_3px_3px_6px_rgba(163,177,198,0.45),inset_-3px_-3px_6px_rgba(255,255,255,0.95)] active:translate-y-[1px] flex items-center justify-center space-x-2.5 transition-all select-none cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isGoogleLoading ? "Connecting..." : "Continue with Google"}</span>
          </button>

          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-white/80 w-full"></div>
            <span className="bg-[#E8EAF0] px-3 text-[11px] font-semibold text-[#94A3B8] uppercase">
              Or email
            </span>
            <div className="border-t border-white/80 w-full"></div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#172033]">Email Address</label>
              <Input
                type="email"
                placeholder="name@example.com"
                startIcon={<Mail className="w-4 h-4" />}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-[#E05A47] font-medium">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#172033]">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#F28C28] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                startIcon={<Lock className="w-4 h-4" />}
                endIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="focus:outline-none hover:text-[#172033]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-[#E05A47] font-medium">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="orange"
              size="md"
              className="w-full mt-4"
              disabled={isLoading}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center text-xs text-[#64748B]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="ml-1 text-[#F28C28] font-bold hover:underline">
            Register
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
