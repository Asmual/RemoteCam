"use client";

import * as React from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSubmitted(true);
      toast.success("Password reset instructions sent if email exists.");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#E8EAF0] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#E8EAF0] border border-white/80 shadow-[10px_10px_20px_rgba(163,177,198,0.45),-10px_-10px_20px_rgba(255,255,255,0.95)] rounded-2xl">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-[#E8EAF0] border border-white/80 shadow-[4px_4px_10px_rgba(163,177,198,0.45),-4px_-4px_10px_rgba(255,255,255,0.95)] flex items-center justify-center mb-4">
            <span className="w-4 h-4 rounded-full bg-[#F28C28]"></span>
          </div>
          <CardTitle className="text-2xl font-bold text-[#172033]">
            Reset Password
          </CardTitle>
          <CardDescription className="text-sm text-[#64748B] mt-1">
            Enter your account email to receive a recovery link
          </CardDescription>
        </CardHeader>

        <CardContent>
          {submitted ? (
            <div className="text-center space-y-4 py-4">
              <p className="text-sm text-[#172033] font-medium">
                Check your inbox for a password reset email sent to <span className="font-semibold">{email}</span>.
              </p>
              <Link href="/login">
                <Button variant="secondary" size="md" className="w-full">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#172033]">Email Address</label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  startIcon={<Mail className="w-4 h-4" />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-4"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="justify-center text-xs text-[#64748B]">
          Remember your password?{" "}
          <Link href="/login" className="ml-1 text-[#F28C28] font-semibold hover:underline">
            Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
