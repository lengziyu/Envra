import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Moon, Sun, Save, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

export function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [registry, setRegistry] = useState("https://registry.npmmirror.com");
  const [installPath, setInstallPath] = useState("/usr/local");
  const [proxy, setProxy] = useState("");
  const [saved, setSaved] = useState(false);

  const toggleTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.settings.title}</h1>
          <p className="text-muted-foreground mt-1">{t.settings.subtitle}</p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          {saved ? t.common.saved : t.common.save}
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Languages className="h-5 w-5" />
              {t.settings.language}
            </CardTitle>
            <CardDescription>{t.settings.languageDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <button
                onClick={() => setLocale("zh")}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-3 transition-colors",
                  locale === "zh"
                    ? "border-primary bg-primary/5"
                    : "hover:bg-accent"
                )}
              >
                <span className="text-sm">简体中文</span>
              </button>
              <button
                onClick={() => setLocale("en")}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-3 transition-colors",
                  locale === "en"
                    ? "border-primary bg-primary/5"
                    : "hover:bg-accent"
                )}
              >
                <span className="text-sm">English</span>
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.settings.theme}</CardTitle>
            <CardDescription>{t.settings.themeDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <button
                onClick={() => toggleTheme("light")}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-3 transition-colors",
                  theme === "light"
                    ? "border-primary bg-primary/5"
                    : "hover:bg-accent"
                )}
              >
                <Sun className="h-4 w-4" />
                <span className="text-sm">{t.settings.light}</span>
              </button>
              <button
                onClick={() => toggleTheme("dark")}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-3 transition-colors",
                  theme === "dark"
                    ? "border-primary bg-primary/5"
                    : "hover:bg-accent"
                )}
              >
                <Moon className="h-4 w-4" />
                <span className="text-sm">{t.settings.dark}</span>
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.settings.registry}</CardTitle>
            <CardDescription>{t.settings.registryDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={registry} onChange={(e) => setRegistry(e.target.value)}>
              <option value="https://registry.npmjs.org">{t.settings.registryOfficial}</option>
              <option value="https://registry.npmmirror.com">{t.settings.registryChina}</option>
              <option value="custom">{t.settings.registryCustom}</option>
            </Select>
            {registry === "custom" && (
              <Input className="mt-3" placeholder="https://your-registry.com" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.settings.installPath}</CardTitle>
            <CardDescription>{t.settings.installPathDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Input value={installPath} onChange={(e) => setInstallPath(e.target.value)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.settings.proxy}</CardTitle>
            <CardDescription>{t.settings.proxyDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              value={proxy}
              onChange={(e) => setProxy(e.target.value)}
              placeholder="http://127.0.0.1:7890"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
