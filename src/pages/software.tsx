import { openUrl } from "@tauri-apps/plugin-opener";
import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  Code2,
  ExternalLink,
  GitBranch,
  Globe,
  Package,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    descriptionEn:
      "Popular cross-platform browser for frontend debugging and compatibility testing.",
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

export function SoftwarePage() {
  const { locale } = useI18n();

  const openOfficialSite = async (url: string) => {
    try {
      await openUrl(url);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {locale === "zh" ? "常用开发软件" : "Popular Dev Apps"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {locale === "zh"
            ? "官方站点下载入口（点击直达官网）"
            : "Official download links for common development software."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {locale === "zh" ? "下载中心" : "Download Hub"}
          </CardTitle>
          <CardDescription>
            {locale === "zh"
              ? "按工具类别快速打开官网，获取最新安装包。"
              : "Open official websites quickly and get the latest installers."}
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
