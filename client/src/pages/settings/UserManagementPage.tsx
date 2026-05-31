import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, UserCheck, ShieldAlert, Key, Plus, Search, Check, 
  X, UserPlus, AlertCircle, Shield, ArrowLeftRight
} from "lucide-react";
import { apiClient } from "../../api/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { toast } from "../../components/ui/toast";

interface UserItem {
  id: string;
  username: string;
  role: "admin" | "user" | "pending";
  createdAt: string;
  _count?: {
    novels: number;
  };
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals & form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user" | "pending">("user");
  const [creating, setCreating] = useState(false);

  const [resettingUser, setResettingUser] = useState<UserItem | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/admin/users");
      if (response.data?.success && response.data?.data) {
        setUsers(response.data.data);
      }
    } catch (err: any) {
      toast.error(err.message || "获取用户列表失败。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, targetRole: "admin" | "user" | "pending") => {
    try {
      const response = await apiClient.patch(`/admin/users/${userId}/role`, {
        role: targetRole,
      });

      if (response.data?.success) {
        toast.success("用户权限及角色修改成功！");
        // Update local state
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: targetRole } : u));
      } else {
        toast.error(response.data?.message || "修改角色失败。");
      }
    } catch (err: any) {
      toast.error(err.message || "更新角色失败，请稍后重试。");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) {
      toast.error("请填写完整信息。");
      return;
    }

    setCreating(true);
    try {
      const response = await apiClient.post("/admin/users/create", {
        username: newUsername.trim(),
        password: newPassword,
        role: newRole,
      });

      if (response.data?.success) {
        toast.success(`新账号 ${newUsername} 创建成功！`);
        setShowCreateModal(false);
        setNewUsername("");
        setNewPassword("");
        setNewRole("user");
        fetchUsers();
      } else {
        toast.error(response.data?.message || "创建用户失败。");
      }
    } catch (err: any) {
      toast.error(err.message || "创建用户请求失败，用户名可能已存在。");
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || !resetPassword) return;

    setResetting(true);
    try {
      const response = await apiClient.post(`/admin/users/${resettingUser.id}/reset-password`, {
        newPassword: resetPassword,
      });

      if (response.data?.success) {
        toast.success(`已成功重置用户 ${resettingUser.username} 的登录密码！`);
        setResettingUser(null);
        setResetPassword("");
      } else {
        toast.error(response.data?.message || "重置密码失败。");
      }
    } catch (err: any) {
      toast.error(err.message || "重置密码请求失败。");
    } finally {
      setResetting(false);
    }
  };

  // Filter users based on query
  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">超级管理员</Badge>;
      case "user":
        return <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">创作作家</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">待审批成员</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6 text-foreground p-1">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> 用户权限与成员看板
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理员可在该页面审批注册账户、新建系统用户以及配置不同成员的角色。
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 font-medium shadow-md"
        >
          <UserPlus className="h-4 w-4" /> 手动添加创作账号
        </Button>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader className="pb-3 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg text-foreground">成员列表 ({filteredUsers.length} 人)</CardTitle>
            <CardDescription className="text-muted-foreground">管理当前所有在册或待审批的作者、管理员账号</CardDescription>
          </div>
          {/* Search bar */}
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索成员用户名..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">正在获取最新团队成员列表数据...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-border rounded-lg text-muted-foreground space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground" />
              <p>没有找到任何匹配搜索条件的用户账号。</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                    <th className="p-4">用户名</th>
                    <th className="p-4">系统角色</th>
                    <th className="p-4">小说项目数</th>
                    <th className="p-4">注册日期</th>
                    <th className="p-4 text-right">角色及密码配置</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30 transition">
                      <td className="p-4 font-semibold text-foreground flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        {user.username}
                      </td>
                      <td className="p-4">{getRoleBadge(user.role)}</td>
                      <td className="p-4 text-foreground font-medium">
                        {user._count?.novels ?? 0} 部小说
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {/* Approval workflow action */}
                        {user.role === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => handleRoleChange(user.id, "user")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm inline-flex items-center gap-1"
                          >
                            <UserCheck className="h-3.5 w-3.5" /> 审批通过
                          </Button>
                        )}

                        {/* Adjust role selector */}
                        {user.username !== "admin" && (
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
                            className="inline-block rounded-md border border-input bg-background py-1.5 px-2 text-xs text-foreground outline-none transition focus:border-primary"
                          >
                            <option value="user" className="bg-background text-foreground">作家用户</option>
                            <option value="admin" className="bg-background text-foreground">系统管理员</option>
                            <option value="pending" className="bg-background text-foreground">待审核用户</option>
                          </select>
                        )}

                        {/* Password reset button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setResettingUser(user)}
                          className="inline-flex items-center gap-1"
                        >
                          <Key className="h-3.5 w-3.5" /> 重置密码
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Modal (Vanilla Overlay) */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" /> 手动创建作家/管理员账户
                </h3>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">用户名</label>
                  <input
                    type="text"
                    required
                    placeholder="请输入新用户名"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="block w-full rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">初始密码</label>
                  <input
                    type="password"
                    required
                    placeholder="不少于 6 位初始密码"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">指定账号初始角色</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="block w-full rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  >
                    <option value="user" className="bg-background text-foreground">普通创作作家 (直接激活)</option>
                    <option value="admin" className="bg-background text-foreground">系统管理员 (直接激活)</option>
                    <option value="pending" className="bg-background text-foreground">待审核用户 (需管理员再次审批)</option>
                  </select>
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                  >
                    取消
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                  >
                    {creating ? "正在安全创建账户..." : "确认创建并激活"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal (Vanilla Overlay) */}
      <AnimatePresence>
        {resettingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" /> 重置密码：{resettingUser.username}
                </h3>
                <button 
                  onClick={() => setResettingUser(null)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 flex items-start gap-2">
                  <Shield className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    请确认重置密码的操作。重置后，该用户必须使用新设置的密码登录。当前正在运行的会话可能会在下次请求时受到影响。
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">新安全密码</label>
                  <input
                    type="password"
                    required
                    placeholder="请输入新的登录密码"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="block w-full rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setResettingUser(null)}
                  >
                    取消
                  </Button>
                  <Button
                    type="submit"
                    disabled={resetting}
                  >
                    {resetting ? "正在重置安全密码..." : "确认修改密码"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
