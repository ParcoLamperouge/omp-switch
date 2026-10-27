import { invoke } from "@tauri-apps/api/core";
import type { DiscoveredModel } from "./yamlUtils";
export type { DiscoveredModel } from "./yamlUtils";

export interface ProfileMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Profile extends ProfileMeta {
  modelsYml: string;
  configYml: string;
}

export interface ValidationIssue {
  file: string;
  level: "error" | "warning";
  message: string;
}

export interface LiveStatus {
  activeId: string | null;
  effectiveId: string | null;
  drift: boolean;
  liveExists: boolean;
}



export const listProfiles = () => invoke<ProfileMeta[]>("list_profiles");

export const readProfile = (id: string) => invoke<Profile>("read_profile", { id });

export const readGlobalModels = () => invoke<string>("read_global_models");
export const listAuthenticatedModels = () =>
  invoke<DiscoveredModel[]>("list_authenticated_models");


export const saveGlobalModels = (modelsYml: string) =>
  invoke<void>("save_global_models", { modelsYml });

export const createProfile = (name: string, modelsYml: string, configYml: string) =>
  invoke<ProfileMeta>("create_profile", { name, modelsYml, configYml });

export const importLive = (name: string) => invoke<ProfileMeta>("import_live", { name });

export const duplicateProfile = (id: string, name: string) =>
  invoke<ProfileMeta>("duplicate_profile", { id, name });

export const updateProfile = (id: string, name: string, modelsYml: string, configYml: string) =>
  invoke<void>("update_profile", { id, name, modelsYml, configYml });

export const updateProfileConfig = (id: string, configYml: string) =>
  invoke<void>("update_profile_config", { id, configYml });

export const deleteProfile = (id: string) => invoke<void>("delete_profile", { id });

export const switchProfile = (id: string) => invoke<void>("switch_profile", { id });

export const getStatus = () => invoke<LiveStatus>("get_status");

export const validatePair = (
  modelsYml: string,
  configYml: string,
  discoveredModels: DiscoveredModel[] = []
) => invoke<ValidationIssue[]>("validate_pair", { modelsYml, configYml, discoveredModels });

export const checkRunning = () => invoke<string[]>("check_running");

export const revealLiveDir = () => invoke<void>("reveal_live_dir");
