import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, User, KeyRound, Feather, AlertCircle } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { apiClient } from "../../api/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { toast } from "../../components/ui/toast";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setToken = useAuthStore((state) => state.setToken);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Retrieve where the user came from
  const fromPath = (location.state as any)?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg("请填写用户名和密码。");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await apiClient.post("/auth/login", {
        username: username.trim(),
        password,
      });

      if (response.data?.success && response.data?.data?.token) {
        const { token, user } = response.data.data;
        setToken(token);
        toast.success(`欢迎回来，${user.username}！`);
        
        // Redirect
        if (user.role === "pending") {
          navigate("/pending", { replace: true });
        } else {
          navigate(fromPath, { replace: true });
        }
      } else {
        setErrorMsg(response.data?.message || "登录失败，请检查账号密码。");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "登录请求失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-slate-100">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/4 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] translate-x-1/2 translate-y-1/2 rounded-full bg-violet-600/10 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        {/* Brand Header */}
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
          >
            <Feather className="h-7 w-7 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-50 via-indigo-100 to-violet-200 bg-clip-text text-transparent">
            AI 创意小说写作系统
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            用 AI 连结你的灵感，开启属于你的文字宇宙
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-slate-100">密码登录</CardTitle>

          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Username field */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  用户名
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <User className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950/50 py-2.5 pl-10 pr-3 text-slate-100 placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="请输入您的用户名"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    密码
                  </label>
                </div>
                <div className="relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950/50 py-2.5 pl-10 pr-3 text-slate-100 placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="请输入您的密码"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="mt-2 w-full bg-gradient-to-r from-indigo-500 to-violet-600 font-medium text-white shadow-lg hover:from-indigo-600 hover:to-violet-700 focus:ring-2 focus:ring-indigo-500/50"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>安全验证登录中...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <KeyRound className="h-4 w-4" />
                    <span>登录系统</span>
                  </div>
                )}
              </Button>
            </form>

            {/* Bottom register suggestion */}
            <div className="mt-6 text-center text-sm text-slate-400">
              没有账号？{" "}
              <Link
                to="/register"
                className="font-medium text-indigo-400 transition hover:text-indigo-300"
              >
                免费注册，AI 辅助创作
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
