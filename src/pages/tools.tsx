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
import { Download, Trash2, RefreshCw } from "lucide-react";
import { useI18n } from "@/i18n";

interface Tool {
  id: string;
  name: string;
  description: string;
  currentVersion?: string;
  latestVersion: string;
  installed: boolean;
  category: string;
}

const initialTools: Tool[] = [
  { id: "node", name: "Node.js", description: "JavaScript runtime built on V8", currentVersion: "20.11.0", latestVersion: "22.0.0", installed: true, category: "Runtime" },
  { id: "npm", name: "npm", description: "Node package manager", currentVersion: "10.2.4", latestVersion: "10.5.0", installed: true, category: "Package Manager" },
  { id: "pnpm", name: "pnpm", description: "Fast, disk space efficient package manager", currentVersion: "8.15.1", latestVersion: "9.0.0", installed: true, category: "Package Manager" },
  { id: "yarn", name: "yarn", description: "Reliable dependency management", latestVersion: "4.1.0", installed: false, category: "Package Manager" },
  { id: "git", name: "Git", description: "Distributed version control system", currentVersion: "2.43.0", latestVersion: "2.44.0", installed: true, category: "Version Control" },
  { id: "nvm", name: "nvm", description: "Node Version Manager", latestVersion: "0.39.7", installed: false, category: "Version Manager" },
];

export function ToolsPage() {
  const [tools, setTools] = useState(initialTools);
  const { t } = useI18n();

  const handleInstall = (id: string) => {
    setTools((prev) =>
      prev.map((tool) =>
        tool.id === id ? { ...tool, installed: true, currentVersion: tool.latestVersion } : tool
      )
    );
  };

  const handleUninstall = (id: string) => {
    setTools((prev) =>
      prev.map((tool) =>
        tool.id === id ? { ...tool, installed: false, currentVersion: undefined } : tool
      )
    );
  };

  const installed = tools.filter((tool) => tool.installed);
  const available = tools.filter((tool) => !tool.installed);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.tools.title}</h1>
        <p className="text-muted-foreground mt-1">{t.tools.subtitle}</p>
      </div>

      {installed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.tools.installed}</CardTitle>
            <CardDescription>{t.tools.installedDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {installed.map((tool) => {
                const hasUpdate = tool.currentVersion !== tool.latestVersion;
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
                        <span className="text-sm">v{tool.currentVersion}</span>
                        {hasUpdate && (
                          <p className="text-xs text-muted-foreground">
                            v{tool.latestVersion} {t.tools.versionAvailable}
                          </p>
                        )}
                      </div>
                      {hasUpdate && (
                        <Button size="sm" variant="outline" className="gap-1">
                          <RefreshCw className="h-3 w-3" />
                          {t.common.update}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUninstall(tool.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
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
                    <span className="text-sm text-muted-foreground">v{tool.latestVersion}</span>
                    <Button size="sm" onClick={() => handleInstall(tool.id)} className="gap-1">
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
