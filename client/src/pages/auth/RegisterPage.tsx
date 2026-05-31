import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, User, UserPlus, Feather, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiClient } from "../../api/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password || !confirmPassword) {
      setErrorMsg("请填写所有必填字段。");
      return;
    }

    if (username.trim().length < 3) {
      setErrorMsg("用户名长度不能少于 3 位。");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("密码长度不能少于 6 位。");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("两次输入的密码不一致。");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await apiClient.post("/api/auth/register", {
        username: username.trim(),
        password,
      });

      if (response.data?.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate("/login");
        }, 5000);
      } else {
        setErrorMsg(response.data?.message || "注册失败，请更换用户名重试。");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "注册请求失败，该账号可能已被占用。");
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
            创建作家账号
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            仅需几秒，开启 AI 智能大纲与章节导演生成
          </p>
        </div>

        {/* Card */}
        <Card className="border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
          <CardContent className="pt-6">
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-6 text-center space-y-4"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100">账号注册成功！</h3>
                  <div className="text-sm text-slate-400 space-y-2 max-w-xs mx-auto">
                    <p>您的注册账号已提交，目前状态为<strong>“待审核”</strong>。</p>
                    <p className="text-indigo-400">请联系系统管理员审批通过该账号。</p>
                    <p className="text-xs pt-4 text-slate-500">页面将在 5 秒内自动跳转到登录页...</p>
                  </div>
                  <Button asChild className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200">
                    <Link to="/login">立即跳转登录</Link>
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errorMsg && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </motion.div>
                  )}

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
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      设置密码
                    </label>
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
                        placeholder="最少 6 位字符密码"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Password confirmation */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      确认密码
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Lock className="h-4 w-4 text-slate-500" />
                      </div>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full rounded-lg border border-slate-800 bg-slate-950/50 py-2.5 pl-10 pr-3 text-slate-100 placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        placeholder="请再次输入您的密码"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Submit button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="mt-2 w-full bg-gradient-to-r from-indigo-500 to-violet-600 font-medium text-white shadow-lg hover:from-indigo-600 hover:to-violet-700 focus:ring-2 focus:ring-indigo-500/50"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>安全创建账户中...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        <span>注册账号并提交审核</span>
                      </div>
                    )}
                  </Button>
                </form>
              )}
            </AnimatePresence>

            {/* Back link */}
            {!success && (
              <div className="mt-6 text-center text-sm text-slate-400">
                已有账号？{" "}
                <Link
                  to="/login"
                  className="font-medium text-indigo-400 transition hover:text-indigo-300"
                >
                  立即登录
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
