import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  FolderPlus,
  RefreshCw,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import {
  DiagnosticItem,
  getSystemInfo,
  scanEnvironment,
  SystemInfo,
} from "@/lib/native";

const categoryOrder = [
  "runtime",
  "packageManager",
  "versionControl",
  "authentication",
  "gitConfig",
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [envStatus, setEnvStatus] = useState<DiagnosticItem[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [diagnostics, system] = await Promise.all([
        scanEnvironment(),
        getSystemInfo(),
      ]);
      setEnvStatus(diagnostics);
      setSystemInfo(system);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const okCount = useMemo(
    () => envStatus.filter((item) => item.status === "ok").length,
    [envStatus]
  );
  const issueItems = useMemo(
    () => envStatus.filter((item) => item.status !== "ok"),
    [envStatus]
  );
  const issueCount = issueItems.length;
  const healthScore = envStatus.length
    ? Math.round((okCount / envStatus.length) * 100)
    : 0;

  const categoryStats = useMemo(() => {
    return categoryOrder.map((key) => {
      const items = envStatus.filter((item) => item.categoryKey === key);
      const ok = items.filter((item) => item.status === "ok").length;
      return {
        key,
        total: items.length,
        ok,
        percent: items.length ? Math.round((ok / items.length) * 100) : 0,
      };
    });
  }, [envStatus]);

  const quickActions = [
    {
      title: t.dashboard.runEnvCheck,
      desc:
        locale === "zh"
          ? "扫描环境问题并尝试修复"
          : "Scan environment issues and apply fixes",
      icon: Stethoscope,
      path: "/doctor",
      variant: "default" as const,
    },
    {
      title: t.dashboard.manageTools,
      desc:
        locale === "zh"
          ? "安装与管理开发工具"
          : "Install and manage development tools",
      icon: Wrench,
      path: "/tools",
      variant: "outline" as const,
    },
    {
      title: t.dashboard.initProject,
      desc:
        locale === "zh"
          ? "快速创建新项目脚手架"
          : "Scaffold new projects quickly",
      icon: FolderPlus,
      path: "/init",
      variant: "outline" as const,
    },
    {
      title: t.sidebar.settings,
      desc:
        locale === "zh" ? "配置主题与默认路径" : "Configure theme and defaults",
      icon: Settings2,
      path: "/settings",
      variant: "outline" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.dashboard.title}</h1>
          <p className="text-muted-foreground mt-1">{t.dashboard.subtitle}</p>
        </div>
        <Button variant="outline" onClick={() => void load()} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {locale === "zh" ? "刷新" : "Refresh"}
        </Button>
      </div>

      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-sky-500/15 via-cyan-500/10 to-transparent p-6">
        <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-cyan-400/15 blur-2xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-sky-400/15 blur-2xl" />
        <div className="relative grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">
              {locale === "zh" ? "系统健康总览" : "Environment Health Overview"}
            </p>
            <div className="mt-2 flex items-end gap-3">
              <div className="text-5xl font-bold">{healthScore}</div>
              <div className="pb-1 text-lg text-muted-foreground">/100</div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant={issueCount === 0 ? "success" : "secondary"}>
                {issueCount === 0
                  ? locale === "zh"
                    ? "运行正常"
                    : "Healthy"
                  : locale === "zh"
                    ? `${issueCount} 项待处理`
                    : `${issueCount} issue(s) pending`}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Activity className="h-3 w-3" />
                {okCount}/{envStatus.length}
              </Badge>
              {systemInfo && (
                <Badge variant="outline">
                  {systemInfo.osName} {systemInfo.osVersion} · {systemInfo.arch}
                </Badge>
              )}
            </div>
          </div>
          <div className="rounded-2xl border bg-background/60 p-4 backdrop-blur">
            <p className="text-sm text-muted-foreground">
              {locale === "zh" ? "关键状态" : "Status"}
            </p>
            <div className="mt-4 flex items-center gap-2 text-lg font-semibold">
              {issueCount === 0 ? (
                <>
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  {locale === "zh" ? "全部通过" : "All Passed"}
                </>
              ) : (
                <>
                  <ShieldAlert className="h-5 w-5 text-orange-500" />
                  {locale === "zh" ? "需要处理" : "Needs Attention"}
                </>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {issueCount === 0
                ? t.dashboard.allCritical
                : locale === "zh"
                  ? "建议先进入环境诊断页一键修复。"
                  : "Open Environment Doctor and apply fixes first."}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className="group rounded-2xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <action.icon className="h-5 w-5 text-primary" />
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-4 font-semibold">{action.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{action.desc}</p>
          </button>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {locale === "zh" ? "模块健康度" : "Category Health"}
            </CardTitle>
            <CardDescription>{t.dashboard.envStatusDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryStats.map((item) => (
              <div key={item.key}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {(t.doctor as Record<string, string>)[item.key] ?? item.key}
                  </span>
                  <span className="font-medium">
                    {item.ok}/{item.total || 0}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {locale === "zh" ? "待处理事项" : "Attention Needed"}
            </CardTitle>
            <CardDescription>
              {locale === "zh"
                ? "优先修复这些项目，可显著提升环境稳定性"
                : "Fix these first to improve environment stability"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && <Badge variant="destructive">{error}</Badge>}
            {!loading && issueItems.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {locale === "zh" ? "当前没有待处理问题。" : "No pending issues."}
              </p>
            )}
            {issueItems.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(t.doctor as Record<string, string>)[item.messageKey] ?? item.messageKey}
                  </p>
                </div>
                <Badge variant={item.status === "error" ? "destructive" : "secondary"}>
                  {item.status === "error" ? t.common.error : t.common.missing}
                </Badge>
              </div>
            ))}
            {issueItems.length > 0 && (
              <Button onClick={() => navigate("/doctor")} className="mt-2 w-full gap-2">
                <Stethoscope className="h-4 w-4" />
                {t.dashboard.runEnvCheck}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
