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
import { Download, Trash2, RefreshCw } from "lucide-react";
import { useI18n } from "@/i18n";
import { listTools, manageTool, ToolItem } from "@/lib/native";

export function ToolsPage() {
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const { t, locale } = useI18n();

  const refreshTools = async () => {
    try {
      setLoading(true);
      setError("");
      const result = await listTools();
      setTools(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshTools();
  }, []);

  const runAction = async (
    toolId: string,
    action: "install" | "update" | "uninstall"
  ) => {
    try {
      setBusyKey(`${toolId}:${action}`);
      setNotice("");
      setError("");
      const result = await manageTool(toolId, action);
      setNotice(result.message || "Done.");
      await refreshTools();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyKey(null);
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.tools.title}</h1>
          <p className="text-muted-foreground mt-1">{t.tools.subtitle}</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => void refreshTools()}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {locale === "zh" ? "刷新" : "Refresh"}
        </Button>
      </div>

      {notice && <Badge variant="success">{notice}</Badge>}
      {error && <Badge variant="destructive">{error}</Badge>}

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
                        <span className="text-sm">v{tool.currentVersion ?? "—"}</span>
                        {hasUpdate && (
                          <p className="text-xs text-muted-foreground">
                            v{tool.latestVersion} {t.tools.versionAvailable}
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
                    <span className="text-sm text-muted-foreground">
                      {tool.latestVersion ? `v${tool.latestVersion}` : "—"}
                    </span>
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
    </div>
  );
}
