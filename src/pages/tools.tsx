import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  Boxes,
  Code2,
  Download,
  ExternalLink,
  GitBranch,
  Globe,
  Package,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useI18n } from "@/i18n";
import {
  getNodeRuntimeInfo,
  installNodeVersion,
  NodeRuntimeInfo,
  NodeVersionItem,
  switchNodeVersion,
} from "@/lib/native";
import { useEnvironmentStore } from "@/stores/environment";

function formatVersion(version?: string): string {
  if (!version) return "—";
  const normalized = version.trim();
  if (!normalized) return "—";
  if (/^v+/i.test(normalized)) {
    return `v${normalized.replace(/^v+/i, "")}`;
  }
  return /^\d/.test(normalized) ? `v${normalized}` : normalized;
}

interface DownloadApp {
  id: string;
  name: string;
  descriptionZh: string;
  descriptionEn: string;
  tags: string[];
  url: string;
  icon: LucideIcon;
}

const POPULAR_APPS: DownloadApp[] = [
  {
    id: "chrome",
    name: "Google Chrome",
    descriptionZh: "跨平台主流浏览器，前端调试与兼容性测试常用。",
    descriptionEn: "Popular cross-platform browser for frontend debugging and compatibility testing.",
    tags: ["Browser", "Frontend"],
    url: "https://www.google.com/chrome/",
    icon: Globe,
  },
  {
    id: "vscode",
    name: "Visual Studio Code",
    descriptionZh: "轻量且强扩展能力的代码编辑器。",
    descriptionEn: "Lightweight editor with a strong extension ecosystem.",
    tags: ["Editor", "IDE"],
    url: "https://code.visualstudio.com/",
    icon: Code2,
  },
  {
    id: "postman",
    name: "Postman",
    descriptionZh: "API 调试和接口测试工具。",
    descriptionEn: "API debugging and endpoint testing platform.",
    tags: ["API", "Testing"],
    url: "https://www.postman.com/downloads/",
    icon: Package,
  },
  {
    id: "git",
    name: "Git",
    descriptionZh: "分布式版本控制工具。",
    descriptionEn: "Distributed version control system.",
    tags: ["Version Control"],
    url: "https://git-scm.com/downloads",
    icon: GitBranch,
  },
  {
    id: "docker",
    name: "Docker Desktop",
    descriptionZh: "本地容器开发与运行环境。",
    descriptionEn: "Containerized local development and runtime environment.",
    tags: ["Container", "DevOps"],
    url: "https://www.docker.com/products/docker-desktop/",
    icon: Boxes,
  },
];

function majorOf(version?: string): number | null {
  if (!version) return null;
  const normalized = version.trim().replace(/^v+/i, "");
  const major = normalized.split(".")[0];
  if (!major || !/^\d+$/.test(major)) return null;
  return Number(major);
}

function findInstalledForTarget(
  target: string,
  installed: NodeVersionItem[]
): NodeVersionItem | undefined {
  const targetMajor = majorOf(target);
  if (targetMajor === null) return undefined;
  return installed.find((item) => majorOf(item.version) === targetMajor);
}

export function ToolsPage() {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [runtime, setRuntime] = useState<NodeRuntimeInfo | null>(null);
  const [runtimeLoading, setRuntimeLoading] = useState(false);
  const [runtimeError, setRuntimeError] = useState("");
  const { t, locale } = useI18n();
  const tools = useEnvironmentStore((state) => state.tools);
  const loading = useEnvironmentStore((state) => state.toolsLoading);
  const error = useEnvironmentStore((state) => state.toolsError);
  const loadTools = useEnvironmentStore((state) => state.loadTools);
  const loadEnvironment = useEnvironmentStore((state) => state.loadEnvironment);
  const manageToolAndRefresh = useEnvironmentStore(
    (state) => state.manageToolAndRefresh
  );

  const loadRuntime = async () => {
    try {
      setRuntimeLoading(true);
      setRuntimeError("");
      const info = await getNodeRuntimeInfo();
      setRuntime(info);
    } catch (runtimeLoadError) {
      setRuntimeError(
        runtimeLoadError instanceof Error
          ? runtimeLoadError.message
          : String(runtimeLoadError)
      );
    } finally {
      setRuntimeLoading(false);
    }
  };

  useEffect(() => {
    void loadTools();
    void loadRuntime();
  }, []);

  const runAction = async (
    toolId: string,
    action: "install" | "update" | "uninstall"
  ) => {
    try {
      setBusyKey(`${toolId}:${action}`);
      setNotice("");
      const message = await manageToolAndRefresh(toolId, action);
      setNotice(message || "Done.");
    } catch {
      // The store already exposes the latest error message for the page.
    } finally {
      setBusyKey(null);
    }
  };

  const runNodeAction = async (
    action: "install" | "switch",
    version: string
  ) => {
    try {
      setBusyKey(`node:${action}:${version}`);
      setNotice("");
      const result =
        action === "install"
          ? await installNodeVersion(version)
          : await switchNodeVersion(version);
      setNotice(result.message || (locale === "zh" ? "操作完成。" : "Done."));
      await Promise.all([
        loadRuntime(),
        loadTools(true),
        loadEnvironment(true),
      ]);
    } catch (nodeActionError) {
      setRuntimeError(
        nodeActionError instanceof Error
          ? nodeActionError.message
          : String(nodeActionError)
      );
    } finally {
      setBusyKey(null);
    }
  };

  const openOfficialSite = async (url: string) => {
    try {
      await openUrl(url);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const installed = useMemo(
    () => tools.filter((tool) => tool.installed),
    [tools]
  );
  const available = useMemo(
    () => tools.filter((tool) => !tool.installed),
    [tools]
  );
  const stableTargets = runtime?.stableVersions?.length
    ? runtime.stableVersions
    : ["14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"];
  const nodeVersions = runtime?.installedVersions ?? [];
  const managerName =
    runtime?.manager === "nvm-windows"
      ? "nvm-windows"
      : runtime?.manager === "nvm"
        ? "nvm"
        : "none";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.tools.title}</h1>
          <p className="text-muted-foreground mt-1">{t.tools.subtitle}</p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            void loadTools(true);
            void loadRuntime();
            void loadEnvironment(true);
          }}
        >
          <RefreshCw
            className={`h-4 w-4 ${loading || runtimeLoading ? "animate-spin" : ""}`}
          />
          {locale === "zh" ? "刷新" : "Refresh"}
        </Button>
      </div>

      {notice && <Badge variant="success">{notice}</Badge>}
      {error && <Badge variant="destructive">{error}</Badge>}
      {runtimeError && <Badge variant="destructive">{runtimeError}</Badge>}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {locale === "zh" ? "Node 版本与运行时" : "Node Runtime & Versions"}
          </CardTitle>
          <CardDescription>
            {locale === "zh"
              ? "基于 nvm 管理 Node/npm 版本，并识别 pnpm/yarn 属于哪个 Node 版本。"
              : "Manage Node/npm via nvm and detect which Node version owns pnpm/yarn."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={runtime?.available ? "success" : "outline"}>
              {locale === "zh" ? "管理器" : "Manager"}: {managerName}
            </Badge>
            <Badge variant="outline">
              {locale === "zh" ? "当前 Node" : "Current Node"}:{" "}
              {formatVersion(runtime?.activeVersion)}
            </Badge>
          </div>
          {runtime?.message && (
            <p className="text-xs text-muted-foreground">{runtime.message}</p>
          )}

          <div className="rounded-lg border p-4">
            <p className="mb-3 text-sm font-medium">
              {locale === "zh"
                ? "稳定版本推荐（14 到 24）"
                : "Stable Version Picks (14 to 24)"}
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {stableTargets.map((target) => {
                const installedVersion = findInstalledForTarget(target, nodeVersions);
                const isCurrent = !!installedVersion?.isActive;
                const switchVersion = installedVersion?.version ?? target;
                const action = installedVersion ? "switch" : "install";
                const isBusy = busyKey === `node:${action}:${switchVersion}`;
                return (
                  <div
                    key={target}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{formatVersion(target)}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        {installedVersion ? (
                          <Badge variant="outline">
                            {locale === "zh" ? "已安装" : "Installed"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            {locale === "zh" ? "未安装" : "Not Installed"}
                          </Badge>
                        )}
                        {isCurrent && (
                          <Badge variant="success">
                            {locale === "zh" ? "当前" : "Current"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={installedVersion ? "outline" : "default"}
                      className="gap-1"
                      disabled={isCurrent || isBusy}
                      onClick={() =>
                        void runNodeAction(action, switchVersion)
                      }
                    >
                      {installedVersion ? (
                        <ArrowRightLeft className="h-3 w-3" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      {installedVersion
                        ? locale === "zh"
                          ? "切换"
                          : "Use"
                        : locale === "zh"
                          ? "安装"
                          : "Install"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <p className="mb-3 text-sm font-medium">
              {locale === "zh"
                ? "已检测 Node 版本（含 npm/pnpm/yarn 归属）"
                : "Detected Node Versions (with npm/pnpm/yarn mapping)"}
            </p>
            {nodeVersions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {locale === "zh"
                  ? "未检测到 Node 版本。"
                  : "No Node runtime detected."}
              </p>
            ) : (
              <div className="space-y-2">
                {nodeVersions.map((item) => (
                  <div
                    key={item.version}
                    className="flex flex-col gap-3 rounded-md border p-3 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          Node {formatVersion(item.version)}
                        </span>
                        {item.isActive && (
                          <Badge variant="success">
                            {locale === "zh" ? "当前" : "Current"}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        npm {formatVersion(item.npmVersion)} · pnpm{" "}
                        {formatVersion(item.pnpmVersion)} · yarn{" "}
                        {formatVersion(item.yarnVersion)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={item.isActive || busyKey === `node:switch:${item.version}`}
                      onClick={() => void runNodeAction("switch", item.version)}
                    >
                      <ArrowRightLeft className="h-3 w-3" />
                      {locale === "zh" ? "切换到此版本" : "Switch"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {installed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.tools.installed}</CardTitle>
            <CardDescription>{t.tools.installedDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {installed.map((tool) => {
                const hasUpdate =
                  !!tool.latestVersion &&
                  !!tool.currentVersion &&
                  tool.currentVersion !== tool.latestVersion;
                return (
                  <div key={tool.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{tool.name}</span>
                        <Badge variant="outline">{tool.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-sm">{formatVersion(tool.currentVersion)}</span>
                        {hasUpdate && (
                          <p className="text-xs text-muted-foreground">
                            {formatVersion(tool.latestVersion)} {t.tools.versionAvailable}
                          </p>
                        )}
                      </div>
                      {hasUpdate && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => void runAction(tool.id, "update")}
                          disabled={!tool.managed || busyKey === `${tool.id}:update`}
                        >
                          <RefreshCw className="h-3 w-3" />
                          {t.common.update}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void runAction(tool.id, "uninstall")}
                        disabled={!tool.managed || busyKey === `${tool.id}:uninstall`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {loading && (
                <p className="text-sm text-muted-foreground">
                  {locale === "zh" ? "加载中..." : "Loading..."}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {available.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.tools.available}</CardTitle>
            <CardDescription>{t.tools.availableDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {available.map((tool) => (
                <div key={tool.id} className="flex items-center justify-between rounded-lg border border-dashed p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{tool.name}</span>
                      <Badge variant="outline">{tool.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{formatVersion(tool.latestVersion)}</span>
                    <Button
                      size="sm"
                      onClick={() => void runAction(tool.id, "install")}
                      disabled={!tool.managed || busyKey === `${tool.id}:install`}
                      className="gap-1"
                    >
                      <Download className="h-3 w-3" />
                      {t.common.install}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {locale === "zh" ? "常用开发软件" : "Popular Dev Apps"}
          </CardTitle>
          <CardDescription>
            {locale === "zh"
              ? "官方站点下载入口（点击直达官网）。"
              : "Official download links for common development apps."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {POPULAR_APPS.map((app) => {
              const Icon = app.icon;
              return (
                <div
                  key={app.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="rounded-md border p-1.5">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">{app.name}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {locale === "zh" ? app.descriptionZh : app.descriptionEn}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {app.tags.map((tag) => (
                        <Badge key={`${app.id}-${tag}`} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-3 gap-1"
                    onClick={() => void openOfficialSite(app.url)}
                  >
                    <ExternalLink className="h-3 w-3" />
                    {locale === "zh" ? "官网下载" : "Official Site"}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
