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
  Terminal,
  GitBranch,
  Key,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/i18n";

const envStatus = [
  { name: "Node.js", version: "v20.11.0", status: "ok" as const, icon: Terminal },
  { name: "npm", version: "10.2.4", status: "ok" as const, icon: Terminal },
  { name: "pnpm", version: "8.15.1", status: "ok" as const, icon: Terminal },
  { name: "Git", version: "2.43.0", status: "ok" as const, icon: GitBranch },
  { name: "SSH", version: "Configured", status: "ok" as const, icon: Key },
  { name: "yarn", version: "—", status: "missing" as const, icon: Terminal },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const quickActions = [
    { label: t.dashboard.runEnvCheck, path: "/doctor" },
    { label: t.dashboard.manageTools, path: "/tools" },
    { label: t.dashboard.initProject, path: "/init" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.dashboard.title}</h1>
        <p className="text-muted-foreground mt-1">{t.dashboard.subtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.dashboard.toolsDetected}</CardDescription>
            <CardTitle className="text-3xl">
              {envStatus.filter((e) => e.status === "ok").length}
              <span className="text-lg text-muted-foreground font-normal">
                /{envStatus.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {envStatus.filter((e) => e.status === "missing").length}
              {t.dashboard.toolsMissing}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.dashboard.envHealth}</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              {t.dashboard.good}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{t.dashboard.allCritical}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.dashboard.system}</CardDescription>
            <CardTitle className="text-lg">macOS 14.2</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Apple Silicon (arm64)</p>
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
            {envStatus.map((tool) => (
              <div
                key={tool.name}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <tool.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{tool.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {tool.version}
                  </span>
                  {tool.status === "ok" ? (
                    <Badge variant="success">{t.common.ok}</Badge>
                  ) : (
                    <Badge variant="destructive">{t.common.missing}</Badge>
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
                variant="outline"
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
