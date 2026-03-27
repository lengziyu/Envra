import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";
export type RegistryMode = "official" | "china" | "custom";

interface SettingsState {
  theme: ThemeMode;
  registryMode: RegistryMode;
  customRegistry: string;
  installPath: string;
  proxy: string;
  setTheme: (theme: ThemeMode) => void;
  setRegistryMode: (mode: RegistryMode) => void;
  setCustomRegistry: (value: string) => void;
  setInstallPath: (value: string) => void;
  setProxy: (value: string) => void;
}

export const useAppSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      registryMode: "china",
      customRegistry: "",
      installPath: "~/Projects",
      proxy: "",
      setTheme: (theme) => set({ theme }),
      setRegistryMode: (registryMode) => set({ registryMode }),
      setCustomRegistry: (customRegistry) => set({ customRegistry }),
      setInstallPath: (installPath) => set({ installPath }),
      setProxy: (proxy) => set({ proxy }),
    }),
    { name: "envra-settings" }
  )
);
