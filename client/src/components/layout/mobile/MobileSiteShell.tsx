import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  BookOpenText,
  ChevronRight,
  Home,
  LayoutGrid,
  ListTodo,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { changePassword, updateProfile } from "@/api/auth";
import { useAuth } from "@/auth/AuthProvider";
import AppVersionBadge from "../AppVersionBadge";
import DesktopBrandMark from "../DesktopBrandMark";
import { Button } from "@/components/ui/button";
import {
  AppDialogContent,
  Dialog,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  getMobileMoreNavGroups,
  getMobileNavGroupForPath,
  getMobilePageTitle,
  getMobilePrimaryNavItems,
  getMobileRouteClassName,
  type MobilePrimaryNavKey,
} from "./mobileSiteNavigation";

const primaryIcons: Record<MobilePrimaryNavKey, typeof Home> = {
  home: Home,
  novels: BookOpenText,
  creation: Sparkles,
  tasks: ListTodo,
  more: Menu,
};

function formatUserRole(role: string | undefined): string {
  if (role === "admin") {
    return "管理员";
  }
  if (role === "writer") {
    return "作家";
  }
  if (role === "pending") {
    return "待审核";
  }
  return "成员";
}

function formatUserStatus(status: string | undefined): string {
  if (status === "active") {
    return "可使用";
  }
  if (status === "pending_review") {
    return "待审核";
  }
  if (status === "disabled") {
    return "已停用";
  }
  return "账号";
}

interface MobileSiteShellProps {
  children: ReactNode;
}

export default function MobileSiteShell({ children }: MobileSiteShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const activeGroup = getMobileNavGroupForPath(location.pathname);
  const pageTitle = getMobilePageTitle(location.pathname);
  const primaryNavItems = getMobilePrimaryNavItems();
  const moreNavGroups = getMobileMoreNavGroups();
  const visibleMoreNavGroups = moreNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.adminOnly || user?.role === "admin"),
    }))
    .filter((group) => group.items.length > 0);
  const accountName = user?.displayName?.trim() || user?.username || "";

  useEffect(() => {
    if (accountDialogOpen) {
      setDisplayName(user?.displayName ?? "");
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
    }
  }, [accountDialogOpen, user?.displayName]);

  const openPrimaryItem = (key: MobilePrimaryNavKey, to: string) => {
    if (key === "more") {
      setMoreOpen((current) => !current);
      return;
    }
    setMoreOpen(false);
    navigate(to);
  };

  const openAccountDialog = () => {
    setMoreOpen(false);
    setAccountDialogOpen(true);
  };

  const handleLogout = async () => {
    setMoreOpen(false);
    await logout();
    window.location.assign("/login");
  };

  async function handleSaveProfile() {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await updateProfile({ displayName: displayName.trim() || null });
      await refreshUser();
      toast.success("显示名称已更新。");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "显示名称更新失败。");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !nextPassword) {
      toast.error("请填写当前密码和新密码。");
      return;
    }
    if (nextPassword.length < 8) {
      toast.error("新密码至少需要 8 个字符。");
      return;
    }
    if (nextPassword !== confirmPassword) {
      toast.error("两次输入的新密码不一致。");
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword({ currentPassword, nextPassword });
      toast.success("密码已更新，请重新登录。");
      setAccountDialogOpen(false);
      await logout();
      window.location.assign("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "修改密码失败。");
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <div className={cn("min-h-dvh bg-muted/20 text-foreground", moreOpen && "overflow-hidden")}>
      <header className="sticky top-0 z-40 border-b bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/82">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-2" onClick={() => setMoreOpen(false)}>
            <DesktopBrandMark className="h-8 w-8 shrink-0 drop-shadow-none" />
            <div className="min-w-0 leading-tight">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="min-w-0 truncate text-sm font-semibold">AI 小说创作工作台</span>
                <AppVersionBadge />
              </div>
              <div className="truncate text-[11px] text-muted-foreground">{pageTitle}</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                title={accountName}
                aria-label="账号设置"
                onClick={openAccountDialog}
              >
                <UserRound className="h-4 w-4" />
              </Button>
            ) : null}
            <Button asChild size="sm" className="h-8 px-3">
              <Link to="/novels/create?mode=director" onClick={() => setMoreOpen(false)}>
                <Plus className="h-3.5 w-3.5" />
                开书
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMoreOpen((current) => !current)}
              aria-label={moreOpen ? "关闭更多入口" : "打开更多入口"}
            >
              {moreOpen ? <X className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className={cn("mobile-site-main mobile-safe-bottom", getMobileRouteClassName(location.pathname))}>
        {children}
      </main>

      {moreOpen ? (
        <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] top-14 z-50 bg-black/20 px-3 pb-3 backdrop-blur-sm">
          <div className="max-h-full overflow-y-auto rounded-3xl border bg-background p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-base font-semibold">更多入口</div>
                <div className="text-xs text-muted-foreground">选择要继续处理的工作区。</div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setMoreOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              {user ? (
                <section className="rounded-2xl border bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0 truncate text-sm font-semibold">{accountName}</div>
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">@{user.username}</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1">
                          <ShieldCheck className="h-3 w-3" />
                          {formatUserRole(user.role)}
                        </span>
                        <span className="rounded-full border bg-background px-2 py-1">
                          {formatUserStatus(user.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={openAccountDialog}>
                      账号设置
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => void handleLogout()}>
                      <LogOut className="h-4 w-4" />
                      退出登录
                    </Button>
                  </div>
                </section>
              ) : null}
              {visibleMoreNavGroups.map((group) => (
                <section key={group.title} className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.title}
                  </div>
                  <div className="grid gap-2">
                    {group.items.map((item) => (
                      <Link
                        key={item.key}
                        to={item.to}
                        className={cn(
                          "flex items-center justify-between rounded-2xl border bg-muted/20 px-3 py-3 text-sm transition hover:border-primary/40 hover:bg-primary/5",
                          location.pathname === item.to && "border-primary/50 bg-primary/10 font-semibold",
                        )}
                        onClick={() => setMoreOpen(false)}
                      >
                        <span>{item.label}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/82">
        <div className="grid grid-cols-5 gap-1">
          {primaryNavItems.map((item) => {
            const Icon = primaryIcons[item.key as MobilePrimaryNavKey];
            const isActive = item.key === "more" ? activeGroup === "more" || moreOpen : activeGroup === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[11px] text-muted-foreground transition",
                  isActive && "bg-primary/10 font-semibold text-primary",
                )}
                onClick={() => openPrimaryItem(item.key as MobilePrimaryNavKey, item.to)}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {user ? (
        <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
          <AppDialogContent
            title="账号设置"
            description={`当前账号：${user.username}`}
            className="max-w-lg"
            footer={(
              <Button
                type="button"
                variant="outline"
                onClick={() => setAccountDialogOpen(false)}
              >
                关闭
              </Button>
            )}
          >
            <div className="space-y-6">
              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-foreground">显示名称</h3>
                  <p className="mt-1 text-xs text-muted-foreground">用于顶部账号、小说作者和协作管理里的展示。</p>
                </div>
                <div className="grid gap-2">
                  <Input
                    value={displayName}
                    maxLength={40}
                    placeholder={user.username}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                  <Button
                    type="button"
                    disabled={isSavingProfile}
                    onClick={handleSaveProfile}
                  >
                    {isSavingProfile ? "保存中..." : "保存名称"}
                  </Button>
                </div>
              </section>

              <section className="space-y-3 border-t pt-4">
                <div>
                  <h3 className="text-sm font-medium text-foreground">修改密码</h3>
                  <p className="mt-1 text-xs text-muted-foreground">密码更新后需要重新登录。</p>
                </div>
                <div className="grid gap-3">
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    placeholder="当前密码"
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={nextPassword}
                    placeholder="新密码，至少 8 个字符"
                    onChange={(event) => setNextPassword(event.target.value)}
                  />
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    placeholder="再次输入新密码"
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isChangingPassword}
                    onClick={handleChangePassword}
                  >
                    {isChangingPassword ? "更新中..." : "更新密码"}
                  </Button>
                </div>
              </section>

              <section className="border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => void handleLogout()}
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </Button>
              </section>
            </div>
          </AppDialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
