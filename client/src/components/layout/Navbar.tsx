import { useLocation } from "react-router-dom";
import { KeyRound, LogOut } from "lucide-react";
import { changePassword } from "@/api/auth";
import { useAuth } from "@/auth/AuthProvider";
import LLMSelector from "@/components/common/LLMSelector";
import AppVersionBadge from "@/components/layout/AppVersionBadge";
import DesktopBrandMark from "@/components/layout/DesktopBrandMark";
import { Button } from "@/components/ui/button";
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
  const { user, logout } = useAuth();
  const isHome = location.pathname === "/";
  const showWorkspaceToggle = Boolean(workspaceNavMode && onWorkspaceNavModeChange);
  const useMobileAutoDirectorShell = shouldUseAutoDirectorMobileFullWidthContent(location.pathname);

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
            <span className="max-w-28 truncate">{user.displayName || user.username}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="修改密码"
              onClick={async () => {
                const currentPassword = window.prompt("输入当前密码");
                if (!currentPassword) return;
                const nextPassword = window.prompt("输入新密码");
                if (!nextPassword) return;
                try {
                  await changePassword({ currentPassword, nextPassword });
                  toast.success("密码已更新，请重新登录。");
                  await logout();
                  window.location.assign("/login");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "修改密码失败。");
                }
              }}
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            </Button>
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
