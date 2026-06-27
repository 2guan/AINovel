import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await register({ username, displayName, password });
      toast.success("账号已提交审核。");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "注册失败。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>申请创作账号</CardTitle>
          <CardDescription>提交后等待管理员审核，通过后即可开始创作。</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-1.5 text-sm font-medium">
              <span>用户名</span>
              <Input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              <span>显示名称</span>
              <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              <span>密码</span>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
            </label>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "提交中..." : "提交审核"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            已有账号？<Link className="font-medium text-primary" to="/login">返回登录</Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
