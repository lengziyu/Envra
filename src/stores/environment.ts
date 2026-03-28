import { create } from "zustand";
import {
  DiagnosticItem,
  fixIssue,
  getSystemInfo,
  listTools,
  manageTool,
  scanEnvironment,
  SystemInfo,
  ToolItem,
} from "@/lib/native";

const ENV_TTL_MS = 30_000;
const TOOLS_TTL_MS = 30_000;

interface EnvironmentState {
  diagnostics: DiagnosticItem[];
  systemInfo: SystemInfo | null;
  tools: ToolItem[];
  envLoading: boolean;
  toolsLoading: boolean;
  lastEnvLoad: number;
  lastToolsLoad: number;
  envError: string;
  toolsError: string;
  loadEnvironment: (force?: boolean) => Promise<void>;
  loadTools: (force?: boolean) => Promise<void>;
  fixAndRefresh: (issueId: string, value?: string) => Promise<string>;
  manageToolAndRefresh: (
    toolId: string,
    action: "install" | "update" | "uninstall"
  ) => Promise<string>;
}

export const useEnvironmentStore = create<EnvironmentState>((set, get) => ({
  diagnostics: [],
  systemInfo: null,
  tools: [],
  envLoading: false,
  toolsLoading: false,
  lastEnvLoad: 0,
  lastToolsLoad: 0,
  envError: "",
  toolsError: "",

  loadEnvironment: async (force = false) => {
    const { diagnostics, lastEnvLoad, envLoading } = get();
    if (!force && envLoading) return;
    if (
      !force &&
      diagnostics.length > 0 &&
      Date.now() - lastEnvLoad < ENV_TTL_MS
    ) {
      return;
    }

    set({ envLoading: true, envError: "" });
    try {
      const [nextDiagnostics, nextSystemInfo] = await Promise.all([
        scanEnvironment(),
        getSystemInfo(),
      ]);
      set({
        diagnostics: nextDiagnostics,
        systemInfo: nextSystemInfo,
        envLoading: false,
        lastEnvLoad: Date.now(),
      });
    } catch (error) {
      set({
        envLoading: false,
        envError: error instanceof Error ? error.message : String(error),
      });
    }
  },

  loadTools: async (force = false) => {
    const { tools, lastToolsLoad, toolsLoading } = get();
    if (!force && toolsLoading) return;
    if (!force && tools.length > 0 && Date.now() - lastToolsLoad < TOOLS_TTL_MS) {
      return;
    }

    set({ toolsLoading: true, toolsError: "" });
    try {
      const nextTools = await listTools();
      set({
        tools: nextTools,
        toolsLoading: false,
        lastToolsLoad: Date.now(),
      });
    } catch (error) {
      set({
        toolsLoading: false,
        toolsError: error instanceof Error ? error.message : String(error),
      });
    }
  },

  fixAndRefresh: async (issueId, value) => {
    const result = await fixIssue(issueId, value);
    await get().loadEnvironment(true);
    await get().loadTools(true);
    return result.message;
  },

  manageToolAndRefresh: async (toolId, action) => {
    const result = await manageTool(toolId, action);
    await get().loadTools(true);
    await get().loadEnvironment(true);
    return result.message;
  },
}));
