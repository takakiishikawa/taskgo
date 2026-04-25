"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  UserMenu,
} from "@takaki/go-design-system";
import {
  LayoutDashboard,
  ListTodo,
  Target,
  Layers,
  Info,
  Zap,
  Sun,
  Moon,
  ChevronsUpDown,
  Check,
} from "lucide-react";

const GO_APPS = [
  {
    name: "NativeGo",
    url: "https://english-learning-app-black.vercel.app/",
    color: "#0052CC",
  },
  {
    name: "CareGo",
    url: "https://care-go-mu.vercel.app/dashboard",
    color: "#30A46C",
  },
  {
    name: "KenyakuGo",
    url: "https://kenyaku-go.vercel.app/",
    color: "#F5A623",
  },
  { name: "TaskGo", url: "https://task-go.vercel.app", color: "#5E6AD2" },
  {
    name: "CookGo",
    url: "https://cook-go-lovat.vercel.app/dashboard",
    color: "#1AD1A5",
  },
  {
    name: "PhysicalGo",
    url: "https://physical-go.vercel.app/dashboard",
    color: "#FF6B6B",
  },
] as const;

const mainNavItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/tasks", label: "タスク", icon: ListTodo },
  { href: "/focus", label: "フォーカス管理", icon: Target },
  { href: "/layers", label: "設計レイヤー", icon: Layers },
];

function isItemActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function TaskGoSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setDisplayName(
        user.user_metadata?.display_name || user.email?.split("@")[0] || "User",
      );
      setEmail(user.email || "");
      setAvatarUrl(user.user_metadata?.avatar_url || "");
    });
    const update = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    localStorage.setItem("taskgo-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <Sidebar>
      {/* ヘッダー：ロゴ + アプリ切り替え */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 60%, white) 100%)",
                    }}
                  >
                    <Zap className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none min-w-0">
                    <span className="text-xs text-muted-foreground">App</span>
                    <span className="text-[15px] font-medium tracking-tight truncate">
                      TaskGo
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-52"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Goシリーズ
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {GO_APPS.map((app) => (
                  <DropdownMenuItem
                    key={app.name}
                    onSelect={() => {
                      window.location.href = app.url;
                    }}
                    className="gap-2"
                  >
                    <span
                      className="shrink-0 rounded-full"
                      style={{
                        width: 8,
                        height: 8,
                        backgroundColor: app.color,
                      }}
                      aria-hidden
                    />
                    <span className="flex-1">{app.name}</span>
                    {app.name === "TaskGo" && (
                      <Check className="h-4 w-4 shrink-0 opacity-70" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* メインナビ */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isItemActive(href, pathname)}
                  >
                    <Link href={href}>
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* フッター */}
      <SidebarFooter>
        <UserMenu
          displayName={displayName || "—"}
          email={email}
          avatarUrl={avatarUrl}
          items={[
            {
              title: "コンセプト・使い方",
              icon: Info,
              onSelect: () => router.push("/about"),
              isActive: isItemActive("/about", pathname),
            },
            {
              title: isDark ? "ダーク" : "ライト",
              icon: isDark ? Moon : Sun,
              onSelect: toggleTheme,
            },
          ]}
          signOut={{ onSelect: handleSignOut }}
        />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
