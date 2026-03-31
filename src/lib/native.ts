import { invoke } from "@tauri-apps/api/core";

export type Status = "ok" | "missing" | "error";

export interface DiagnosticItem {
  id: string;
  name: string;
  categoryKey: string;
  status: Status;
  version?: string;
  messageKey: string;
  fixable: boolean;
}

export interface SystemInfo {
  osName: string;
  osVersion: string;
  arch: string;
}

export interface ToolItem {
  id: string;
  name: string;
  description: string;
  currentVersion?: string;
  latestVersion?: string;
  installed: boolean;
  category: string;
  managed: boolean;
}

export interface ActionResult {
  success: boolean;
  message: string;
}

export interface NodeVersionItem {
  version: string;
  isActive: boolean;
  nodePath?: string;
  npmVersion?: string;
  pnpmVersion?: string;
  yarnVersion?: string;
}

export interface NodeRuntimeInfo {
  manager: "nvm" | "nvm-windows" | "none" | string;
  available: boolean;
  activeVersion?: string;
  installedVersions: NodeVersionItem[];
  stableVersions: string[];
  message?: string;
}

export interface CreateProjectPayload {
  projectName: string;
  template: string;
  packageManager: string;
  initGit: boolean;
  basePath?: string;
  selectedNode?: string;
}

export interface CreateProjectResult {
  success: boolean;
  path: string;
  message: string;
}

const isTauriRuntime =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function fallbackDiagnostics(): DiagnosticItem[] {
  return [
    {
      id: "node",
      name: "Node.js",
      categoryKey: "runtime",
      status: "ok",
      version: "v20+",
      messageKey: "nodeInstalled",
      fixable: false,
    },
    {
      id: "npm",
      name: "npm",
      categoryKey: "packageManager",
      status: "ok",
      version: "10+",
      messageKey: "npmAvailable",
      fixable: false,
    },
    {
      id: "pnpm",
      name: "pnpm",
      categoryKey: "packageManager",
      status: "missing",
      messageKey: "pnpmMissing",
      fixable: true,
    },
  ];
}

export async function scanEnvironment(): Promise<DiagnosticItem[]> {
  if (!isTauriRuntime) return fallbackDiagnostics();
  return invoke<DiagnosticItem[]>("scan_environment");
}

export async function getSystemInfo(): Promise<SystemInfo> {
  if (!isTauriRuntime) {
    return {
      osName: "Web",
      osVersion: "Browser Preview",
      arch: "unknown",
    };
  }
  return invoke<SystemInfo>("get_system_info");
}

export async function listTools(): Promise<ToolItem[]> {
  if (!isTauriRuntime) return [];
  return invoke<ToolItem[]>("list_tools");
}

export async function fixIssue(
  issueId: string,
  value?: string
): Promise<ActionResult> {
  if (!isTauriRuntime) {
    return { success: true, message: "Fixed in demo mode." };
  }
  return invoke<ActionResult>("fix_issue", { issueId, value });
}

export async function manageTool(
  toolId: string,
  action: "install" | "update" | "uninstall"
): Promise<ActionResult> {
  if (!isTauriRuntime) {
    return { success: true, message: "Done in demo mode." };
  }
  return invoke<ActionResult>("manage_tool", { toolId, action });
}

export async function getNodeRuntimeInfo(): Promise<NodeRuntimeInfo> {
  if (!isTauriRuntime) {
    return {
      manager: "none",
      available: false,
      activeVersion: "v22.0.0",
      installedVersions: [],
      stableVersions: ["14", "16", "18", "20", "22", "24"],
      message: "nvm is required in desktop runtime.",
    };
  }
  return invoke<NodeRuntimeInfo>("get_node_runtime_info");
}

export async function installNodeVersion(version: string): Promise<ActionResult> {
  if (!isTauriRuntime) {
    return { success: true, message: `Simulated install: ${version}` };
  }
  return invoke<ActionResult>("install_node_version", { version });
}

export async function switchNodeVersion(version: string): Promise<ActionResult> {
  if (!isTauriRuntime) {
    return { success: true, message: `Simulated switch: ${version}` };
  }
  return invoke<ActionResult>("switch_node_version", { version });
}

export async function defaultProjectBase(): Promise<string> {
  if (!isTauriRuntime) return "~/Projects";
  return invoke<string>("default_project_base");
}

export async function createProject(
  payload: CreateProjectPayload
): Promise<CreateProjectResult> {
  if (!isTauriRuntime) {
    return {
      success: true,
      message: "Created in demo mode.",
      path: `${payload.basePath ?? "~/Projects"}/${payload.projectName}`,
    };
  }
  return invoke<CreateProjectResult>("create_project", { payload });
}
