import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login } from "@/api/auth";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setLoginSession } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await login({ username, password });
      if (!response.data) {
        throw new Error("登录失败。");
      }
      setLoginSession(response.data);
      toast.success("登录成功。");
      const user = response.data.user;
      const fallbackPath = user.role === "pending" || user.status === "pending_review" ? "/pending-review" : "/";
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from && from !== "/login" ? from : fallbackPath, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登录失败。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>登录 AI 小说创作工作台</CardTitle>
          <CardDescription>进入你的创作项目、素材资产和模型配置。</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-1.5 text-sm font-medium">
              <span>用户名</span>
              <Input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              <span>密码</span>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "登录中..." : "登录"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            没有账号？<Link className="font-medium text-primary" to="/register">申请加入</Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
