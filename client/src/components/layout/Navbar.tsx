import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { LogOut, UserRound } from "lucide-react";
import { changePassword, updateProfile } from "@/api/auth";
import { useAuth } from "@/auth/AuthProvider";
import LLMSelector from "@/components/common/LLMSelector";
import AppVersionBadge from "@/components/layout/AppVersionBadge";
import DesktopBrandMark from "@/components/layout/DesktopBrandMark";
import { Button } from "@/components/ui/button";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  AUTO_DIRECTOR_MOBILE_CLASSES,
  shouldUseAutoDirectorMobileFullWidthContent,
} from "@/mobile/autoDirector";

interface NavbarProps {
  workspaceNavMode?: "workspace" | "project";
  onWorkspaceNavModeChange?: (mode: "workspace" | "project") => void;
}

export default function Navbar(props: NavbarProps) {
  const { workspaceNavMode, onWorkspaceNavModeChange } = props;
  const location = useLocation();
  const { user, refreshUser, logout } = useAuth();
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const isHome = location.pathname === "/";
  const showWorkspaceToggle = Boolean(workspaceNavMode && onWorkspaceNavModeChange);
  const useMobileAutoDirectorShell = shouldUseAutoDirectorMobileFullWidthContent(location.pathname);
  const accountName = user?.displayName?.trim() || user?.username || "";

  useEffect(() => {
    if (accountDialogOpen) {
      setDisplayName(user?.displayName ?? "");
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
    }
  }, [accountDialogOpen, user?.displayName]);

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
    <header className="flex h-16 min-w-0 items-center justify-between gap-3 border-b bg-background px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <DesktopBrandMark className="h-8 w-8 shrink-0 drop-shadow-none" />
        <div className="flex min-w-0 flex-col leading-tight">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 truncate text-sm font-semibold">AI 小说创作工作台</span>
            <AppVersionBadge />
          </div>
          <span className="hidden truncate text-[11px] text-muted-foreground sm:block">AI Novel Production Engine</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {!isHome && showWorkspaceToggle ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={useMobileAutoDirectorShell ? AUTO_DIRECTOR_MOBILE_CLASSES.navbarWorkspaceToggle : undefined}
            onClick={() => onWorkspaceNavModeChange?.(workspaceNavMode === "workspace" ? "project" : "workspace")}
          >
            {workspaceNavMode === "workspace" ? "项目导航" : "创作导航"}
          </Button>
        ) : null}
        <div className={useMobileAutoDirectorShell ? AUTO_DIRECTOR_MOBILE_CLASSES.navbarModelSelector : undefined}>
          <LLMSelector compact showBadge={false} showHelperText={false} />
        </div>
        {user ? (
          <div className="hidden items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground sm:flex">
            <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 max-w-36 gap-1 px-2 text-xs"
                title="账号设置"
                onClick={() => setAccountDialogOpen(true)}
              >
                <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate">{accountName}</span>
              </Button>
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
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={displayName}
                        maxLength={40}
                        placeholder={user.username}
                        onChange={(event) => setDisplayName(event.target.value)}
                      />
                      <Button
                        type="button"
                        className="shrink-0"
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
                </div>
              </AppDialogContent>
            </Dialog>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="退出登录"
              onClick={async () => {
                await logout();
                window.location.assign("/login");
              }}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
