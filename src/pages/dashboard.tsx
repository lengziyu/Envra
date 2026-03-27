import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertTriangle,
  Terminal,
  GitBranch,
  Key,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/i18n";
import { useEffect, useMemo, useState } from "react";
import {
  DiagnosticItem,
  getSystemInfo,
  scanEnvironment,
  SystemInfo,
} from "@/lib/native";

function iconFor(id: string) {
  if (id.includes("git")) return GitBranch;
  if (id.includes("ssh")) return Key;
  return Terminal;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [envStatus, setEnvStatus] = useState<DiagnosticItem[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const quickActions = [
    { label: t.dashboard.runEnvCheck, path: "/doctor", primary: true },
    { label: t.dashboard.manageTools, path: "/tools" },
    { label: t.dashboard.initProject, path: "/init" },
  ];

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
  const issueCount = useMemo(
    () => envStatus.filter((item) => item.status !== "ok").length,
    [envStatus]
  );

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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.dashboard.toolsDetected}</CardDescription>
            <CardTitle className="text-3xl">
              {okCount}
              <span className="text-lg text-muted-foreground font-normal">
                /{envStatus.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {issueCount}
              {t.dashboard.toolsMissing}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.dashboard.envHealth}</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {issueCount === 0 ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-orange-500" />
              )}
              {issueCount === 0 ? t.dashboard.good : `${issueCount} ${t.doctor.issues}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {issueCount === 0
                ? t.dashboard.allCritical
                : locale === "zh"
                  ? "请前往环境诊断页查看并修复问题。"
                  : "Run Environment Doctor for suggested fixes."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.dashboard.system}</CardDescription>
            <CardTitle className="text-lg">
              {systemInfo ? `${systemInfo.osName} ${systemInfo.osVersion}` : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {systemInfo ? systemInfo.arch : "unknown"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.dashboard.envStatus}</CardTitle>
          <CardDescription>{t.dashboard.envStatusDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {!loading && envStatus.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {locale === "zh" ? "暂无诊断结果。" : "No diagnostics data yet."}
              </p>
            )}
            {error && <Badge variant="destructive">{error}</Badge>}
            {envStatus.map((tool) => (
              <div
                key={tool.name}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = iconFor(tool.id);
                    return <Icon className="h-4 w-4 text-muted-foreground" />;
                  })()}
                  <span className="text-sm font-medium">{tool.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {tool.version ?? "—"}
                  </span>
                  {tool.status === "ok" ? (
                    <Badge variant="success">{t.common.ok}</Badge>
                  ) : (
                    <Badge variant={tool.status === "error" ? "destructive" : "secondary"}>
                      {tool.status === "error" ? t.common.error : t.common.missing}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.dashboard.quickActions}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.path}
                variant={action.primary ? "default" : "outline"}
                onClick={() => navigate(action.path)}
                className="gap-2"
              >
                {action.label}
                <ArrowRight className="h-3 w-3" />
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
