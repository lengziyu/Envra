import { useState } from "react";
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

type Status = "ok" | "missing" | "error";

interface DiagnosticItem {
  id: string;
  name: string;
  categoryKey: string;
  status: Status;
  version?: string;
  messageKey: string;
  fixable: boolean;
}

const initialDiagnostics: DiagnosticItem[] = [
  { id: "node", name: "Node.js", categoryKey: "runtime", status: "ok", version: "v20.11.0", messageKey: "nodeInstalled", fixable: false },
  { id: "npm", name: "npm", categoryKey: "packageManager", status: "ok", version: "10.2.4", messageKey: "npmAvailable", fixable: false },
  { id: "pnpm", name: "pnpm", categoryKey: "packageManager", status: "ok", version: "8.15.1", messageKey: "pnpmAvailable", fixable: false },
  { id: "yarn", name: "yarn", categoryKey: "packageManager", status: "missing", messageKey: "yarnMissing", fixable: true },
  { id: "git", name: "Git", categoryKey: "versionControl", status: "ok", version: "2.43.0", messageKey: "gitInstalled", fixable: false },
  { id: "ssh", name: "SSH Key", categoryKey: "authentication", status: "ok", messageKey: "sshFound", fixable: false },
  { id: "git-config-name", name: "Git User Name", categoryKey: "gitConfig", status: "ok", messageKey: "gitNameConfigured", fixable: true },
  { id: "git-config-email", name: "Git User Email", categoryKey: "gitConfig", status: "error", messageKey: "gitEmailNotConfigured", fixable: true },
];

const statusIcon = {
  ok: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  missing: <XCircle className="h-4 w-4 text-orange-500" />,
  error: <AlertTriangle className="h-4 w-4 text-red-500" />,
};

export function DoctorPage() {
  const [diagnostics, setDiagnostics] = useState(initialDiagnostics);
  const [scanning, setScanning] = useState(false);
  const { t } = useI18n();

  const statusBadge = {
    ok: <Badge variant="success">{t.common.ok}</Badge>,
    missing: <Badge variant="secondary">{t.common.missing}</Badge>,
    error: <Badge variant="destructive">{t.common.error}</Badge>,
  };

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => setScanning(false), 1500);
  };

  const handleFix = (id: string) => {
    setDiagnostics((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, status: "ok" as Status, messageKey: "fixed" }
          : d
      )
    );
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
                      onClick={() => handleFix(item.id)}
                      className="gap-1"
                    >
                      <Wrench className="h-3 w-3" />
                      {t.common.fix}
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
