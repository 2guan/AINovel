import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PendingReviewPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>账号等待审核</CardTitle>
          <CardDescription>
            {user?.displayName || user?.username || "你的账号"} 通过管理员审核后，就可以进入创作工作台。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              void logout().then(() => navigate("/login", { replace: true }));
            }}
          >
            退出登录
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
