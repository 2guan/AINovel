import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, RefreshCw, LogOut, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { apiClient } from "../../api/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { toast } from "../../components/ui/toast";

export default function PendingPage() {
  const navigate = useNavigate();
  const { user, logout, setToken } = useAuthStore();
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    try {
      const response = await apiClient.get("/api/auth/me");
      if (response.data?.success && response.data?.data) {
        const freshUser = response.data.data;
        
        if (freshUser.role !== "pending") {
          // If approved, we need to refresh state
          // Retrieve current token
          const token = localStorage.getItem("token");
          if (token) {
            setToken(token); // Reload store state
          }
          toast.success("您的账号审核已通过，欢迎进入系统！");
          navigate("/", { replace: true });
        } else {
          toast.info("账号目前仍在待审核状态，请耐心等待或联系管理员。");
        }
      }
    } catch (err: any) {
      toast.error("同步账号状态失败，请稍后重试。");
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-slate-100">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/4 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/5 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] translate-x-1/2 translate-y-1/2 rounded-full bg-indigo-500/5 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <Card className="border-amber-500/30 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Clock className="h-7 w-7 animate-pulse" />
            </div>
            <CardTitle className="text-xl text-slate-100">等待管理员审核</CardTitle>
            <CardDescription className="text-slate-400">
              您的账号目前处于“待审核”锁定状态
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-slate-950/40 border border-slate-800/80 p-4 space-y-3 text-sm text-slate-300">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/50">
                <span className="text-slate-400 font-medium">申请人用户名：</span>
                <span className="text-slate-100 font-semibold">{user?.username}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/50">
                <span className="text-slate-400 font-medium">账号初始角色：</span>
                <span className="text-amber-500 font-semibold flex items-center gap-1">
                  <ShieldAlert className="h-4 w-4" /> 待审核 (pending)
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pt-2">
                为保证系统资源安全分配，新建账号默认为待审核状态。请联系您的团队负责人或系统管理员（admin）审批此账号，激活后刷新状态即可正常登录小说工作台。
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={handleRefresh}
                disabled={checking}
                className="w-full bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-medium shadow-lg"
              >
                {checking ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>正在检查账号状态...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    <span>刷新审核状态</span>
                  </div>
                )}
              </Button>

              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full border-slate-800 bg-slate-950/40 hover:bg-slate-900 text-slate-300 hover:text-slate-100"
              >
                <LogOut className="h-4 w-4 mr-2" /> 退出登录，切换账号
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
