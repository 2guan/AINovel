import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ManagedUser, UserRole, UserStatus } from "@/api/auth";
import { createUser, deleteUser, listUsers, updateUser } from "@/api/auth";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "管理员",
  writer: "作家",
  pending: "待审核",
};

const STATUS_LABELS: Record<UserStatus, string> = {
  active: "可使用",
  pending_review: "等待审核",
  disabled: "已停用",
};

function formatUserName(user: ManagedUser): string {
  return user.displayName?.trim() || user.username;
}

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("writer");
  const [status, setStatus] = useState<UserStatus>("active");

  const usersQuery = useQuery({
    queryKey: queryKeys.users.list,
    queryFn: listUsers,
  });

  const users = useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data?.data]);

  const invalidateUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
  };

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      setUsername("");
      setDisplayName("");
      setPassword("");
      await invalidateUsers();
      toast.success("成员已创建。");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "创建成员失败。"),
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; payload: Parameters<typeof updateUser>[1] }) => updateUser(input.id, input.payload),
    onSuccess: async () => {
      await invalidateUsers();
      toast.success("成员已更新。");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "更新成员失败。"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async () => {
      await invalidateUsers();
      toast.success("成员已删除。");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "删除成员失败。"),
  });

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate({
      username,
      displayName: displayName || null,
      password,
      role,
      status,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">成员管理</h1>
        <p className="text-sm text-muted-foreground">管理谁可以进入工作台，以及每个成员的使用范围。</p>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>创建成员</CardTitle>
          <CardDescription>为团队成员开通账号，或让新注册用户通过审核后开始创作。</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={handleCreate}>
            <Input placeholder="用户名" value={username} onChange={(event) => setUsername(event.target.value)} />
            <Input placeholder="显示名称" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            <Input
              type="password"
              placeholder="初始密码"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="writer">作家</SelectItem>
                <SelectItem value="admin">管理员</SelectItem>
                <SelectItem value="pending">待审核</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" className="sm:col-span-2 lg:col-span-1" disabled={createMutation.isPending}>
              {createMutation.isPending ? "创建中..." : "创建"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="space-y-4 p-4">
              <div>
                <div className="break-words font-medium">{formatUserName(user)}</div>
                <div className="mt-1 break-all text-xs text-muted-foreground">@{user.username}</div>
              </div>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">角色</label>
                  <Select
                    value={user.role}
                    onValueChange={(value) => updateMutation.mutate({ id: user.id, payload: { role: value as UserRole } })}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                      <SelectItem value="writer">{ROLE_LABELS.writer}</SelectItem>
                      <SelectItem value="pending">{ROLE_LABELS.pending}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">状态</label>
                  <Select
                    value={user.status}
                    onValueChange={(value) => updateMutation.mutate({ id: user.id, payload: { status: value as UserStatus } })}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{STATUS_LABELS.active}</SelectItem>
                      <SelectItem value="pending_review">{STATUS_LABELS.pending_review}</SelectItem>
                      <SelectItem value="disabled">{STATUS_LABELS.disabled}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const nextPassword = window.prompt(`为 ${formatUserName(user)} 设置新密码`);
                    if (nextPassword) {
                      updateMutation.mutate({ id: user.id, payload: { password: nextPassword } });
                    }
                  }}
                >
                  重置密码
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={user.id === "admin"}
                  onClick={() => {
                    if (window.confirm(`删除 ${formatUserName(user)}？`)) {
                      deleteMutation.mutate(user.id);
                    }
                  }}
                >
                  删除
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
