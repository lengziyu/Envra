import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FolderPlus, Check } from "lucide-react";
import { useI18n } from "@/i18n";
import { createProject, defaultProjectBase } from "@/lib/native";
import { useAppSettings } from "@/stores/settings";

const nodeVersions = ["22.0.0", "20.11.0", "18.19.0"];
const packageManagers = ["npm", "pnpm", "yarn"];

export function ProjectInitPage() {
  const [projectName, setProjectName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedNode, setSelectedNode] = useState(nodeVersions[1]);
  const [selectedPM, setSelectedPM] = useState(packageManagers[1]);
  const [initGit, setInitGit] = useState(true);
  const [targetPath, setTargetPath] = useState("");
  const [created, setCreated] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdPath, setCreatedPath] = useState("");
  const [error, setError] = useState("");
  const { t, locale } = useI18n();
  const installPath = useAppSettings((state) => state.installPath);

  const templates = [
    { id: "react-ts", name: t.init.reactTs, description: t.init.reactTsDesc },
    { id: "next", name: t.init.next, description: t.init.nextDesc },
    { id: "vue-ts", name: t.init.vueTs, description: t.init.vueTsDesc },
    { id: "node-ts", name: t.init.nodeTs, description: t.init.nodeTsDesc },
  ];

  const canCreate = projectName.trim() && selectedTemplate;

  useEffect(() => {
    if (installPath.trim()) {
      setTargetPath(installPath);
      return;
    }
    defaultProjectBase()
      .then((path) => setTargetPath(path))
      .catch(() => setTargetPath("~/Projects"));
  }, [installPath]);

  const handleCreate = async () => {
    if (!canCreate) return;
    try {
      setCreating(true);
      setError("");
      const result = await createProject({
        projectName: projectName.trim(),
        template: selectedTemplate,
        packageManager: selectedPM,
        initGit,
        basePath: targetPath.trim(),
        selectedNode: selectedNode,
      });
      setCreated(true);
      setCreatedPath(result.path);
      setTimeout(() => setCreated(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.init.title}</h1>
        <p className="text-muted-foreground mt-1">{t.init.subtitle}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.init.projectName}</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="my-awesome-project"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
              <Input
                className="mt-3"
                placeholder="~/Projects"
                value={targetPath}
                onChange={(e) => setTargetPath(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.init.template}</CardTitle>
              <CardDescription>{t.init.templateDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={cn(
                      "flex flex-col items-start rounded-lg border p-4 text-left transition-colors",
                      selectedTemplate === tpl.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent"
                    )}
                  >
                    <span className="text-sm font-medium">{tpl.name}</span>
                    <span className="text-xs text-muted-foreground mt-1">{tpl.description}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.init.nodeVersion}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {nodeVersions.map((v) => (
                  <button
                    key={v}
                    onClick={() => setSelectedNode(v)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm transition-colors",
                      selectedNode === v
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    v{v}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.init.packageManager}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {packageManagers.map((pm) => (
                  <button
                    key={pm}
                    onClick={() => setSelectedPM(pm)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm transition-colors",
                      selectedPM === pm
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.init.options}</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded border transition-colors",
                    initGit ? "border-primary bg-primary" : "border-input"
                  )}
                  onClick={() => setInitGit(!initGit)}
                >
                  {initGit && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <span className="text-sm">{t.init.initGit}</span>
              </label>
            </CardContent>
          </Card>

          <Button
            className="w-full gap-2"
            size="lg"
            disabled={!canCreate}
            onClick={() => void handleCreate()}
          >
            {creating ? (
              <>
                <FolderPlus className="h-4 w-4 animate-pulse" />
                {locale === "zh" ? "创建中..." : "Creating..."}
              </>
            ) : created ? (
              <>
                <Check className="h-4 w-4" />
                {t.init.projectCreated}
              </>
            ) : (
              <>
                <FolderPlus className="h-4 w-4" />
                {t.init.createProject}
              </>
            )}
          </Button>

          {error && <Badge variant="destructive">{error}</Badge>}

          {projectName && selectedTemplate && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t.init.summary}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.init.name}</span>
                    <span className="font-medium">{projectName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {locale === "zh" ? "路径" : "Path"}
                    </span>
                    <span className="max-w-[60%] truncate text-right">{targetPath || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.init.template}</span>
                    <Badge variant="outline">{selectedTemplate}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Node</span>
                    <span>v{selectedNode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.init.packageManager}</span>
                    <span>{selectedPM}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Git</span>
                    <span>{initGit ? t.common.yes : t.common.no}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {createdPath && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {locale === "zh" ? "结果" : "Result"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground break-all">{createdPath}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
