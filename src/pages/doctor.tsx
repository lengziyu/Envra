import { useEffect, useState } from "react";
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
  XCircle,
  AlertTriangle,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { useEnvironmentStore } from "@/stores/environment";

const statusIcon = {
  ok: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  missing: <XCircle className="h-4 w-4 text-orange-500" />,
  error: <AlertTriangle className="h-4 w-4 text-red-500" />,
};

export function DoctorPage() {
  const [scanning, setScanning] = useState(false);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const { t, locale } = useI18n();
  const diagnostics = useEnvironmentStore((state) => state.diagnostics);
  const error = useEnvironmentStore((state) => state.envError);
  const loadEnvironment = useEnvironmentStore((state) => state.loadEnvironment);
  const fixAndRefresh = useEnvironmentStore((state) => state.fixAndRefresh);

  const statusBadge = {
    ok: <Badge variant="success">{t.common.ok}</Badge>,
    missing: <Badge variant="secondary">{t.common.missing}</Badge>,
    error: <Badge variant="destructive">{t.common.error}</Badge>,
  };

  const handleScan = async () => {
    try {
      setScanning(true);
      await loadEnvironment(true);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    void handleScan();
  }, []);

  const handleFix = async (id: string) => {
    try {
      setFixingId(id);
      setNotice("");
      let inputValue: string | undefined;

      if (id === "git-config-name") {
        const value = window.prompt(
          locale === "zh" ? "请输入 Git user.name：" : "Enter Git user.name:"
        );
        if (value === null) return;
        inputValue = value;
      }
      if (id === "git-config-email") {
        const value = window.prompt(
          locale === "zh" ? "请输入 Git user.email：" : "Enter Git user.email:"
        );
        if (value === null) return;
        inputValue = value;
      }

      const message = await fixAndRefresh(id, inputValue);
      setNotice(message || (locale === "zh" ? "修复完成。" : "Fixed."));
    } catch {
      // The store already exposes the latest error message for the page.
    } finally {
      setFixingId(null);
    }
  };

  const okCount = diagnostics.filter((d) => d.status === "ok").length;
  const issueCount = diagnostics.filter((d) => d.status !== "ok").length;

  const getCategoryLabel = (key: string) => {
    return (t.doctor as Record<string, string>)[key] || key;
  };

  const getMessageLabel = (key: string, name: string) => {
    if (key === "fixed") return `${name} ${t.doctor.fixed}`;
    return (t.doctor as Record<string, string>)[key] || key;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.doctor.title}</h1>
          <p className="text-muted-foreground mt-1">{t.doctor.subtitle}</p>
        </div>
        <Button onClick={handleScan} disabled={scanning} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
          {scanning ? t.doctor.scanning : t.doctor.runScan}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.doctor.passed}</CardDescription>
            <CardTitle className="text-3xl text-emerald-500">{okCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.doctor.issues}</CardDescription>
            <CardTitle className="text-3xl text-orange-500">{issueCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.doctor.totalChecks}</CardDescription>
            <CardTitle className="text-3xl">{diagnostics.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.doctor.results}</CardTitle>
          <CardDescription>{t.doctor.resultsDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notice && <Badge variant="success">{notice}</Badge>}
            {error && <Badge variant="destructive">{error}</Badge>}
            {diagnostics.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  {statusIcon[item.status]}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {getCategoryLabel(item.categoryKey)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {getMessageLabel(item.messageKey, item.name)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {item.version && (
                    <span className="text-sm text-muted-foreground">{item.version}</span>
                  )}
                  {statusBadge[item.status]}
                  {item.fixable && item.status !== "ok" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleFix(item.id)}
                      disabled={fixingId === item.id}
                      className="gap-1"
                    >
                      <Wrench className={`h-3 w-3 ${fixingId === item.id ? "animate-pulse" : ""}`} />
                      {fixingId === item.id
                        ? locale === "zh"
                          ? "修复中..."
                          : "Fixing..."
                        : t.common.fix}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
