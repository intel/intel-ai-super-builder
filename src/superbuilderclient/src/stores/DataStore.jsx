import React, { useContext } from "react";
import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

const useDataStore = create((set) => ({
  // system_info
  system_info: null,
  getSystemInfo: async () => {
    try {
      const response = await invoke("mw_say_hello");
      const sysInfo = JSON.parse(response);
      console.debug("Fetched System Info:", sysInfo);
      useDataStore.getState().setSystemInfo(sysInfo);
      return sysInfo;
    } catch (error) {
      console.error("Failed to fetch System Info:", error);
    }
  },
  setSystemInfo: (sysInfo) => {
    set({ system_info: sysInfo });
  },

  // config
  config: {
    version: "0.0.0",
    default_doc_path: "test_files/",
    local_model_hub: "local_models/",
    is_admin: true,
    ActiveAssistant: {
      full_name: "AB",
      short_name: "AB",
      header_bg_color: "#999",
      header_text_bg_color: "#000",
      sidebar_box_bg_color: "#666",
      sidebar_box_refresh_bg_color: "#333",
      sidebar_box_refresh_hover_bg_color: "#999",
      models: {
        chat_model: "chat_model",
        embedding_model: "embedding_model",
        ranker_model: "ranker_model",
      },
      features: [],
      recommended_models: [
        {
          model: "chat_model",
        },
      ],
    },
  },
  assistant: {
    full_name: "AB",
    short_name: "AB",
    header_bg_color: "#999",
    header_text_bg_color: "#000",
    sidebar_box_bg_color: "#666",
    sidebar_box_refresh_bg_color: "#333",
    sidebar_box_refresh_hover_bg_color: "#999",
    models: {
      chat_model: "chat_model",
      embedding_model: "embedding_model",
      ranker_model: "ranker_model",
    },
    features: [],
    recommended_models: [
      {
        model: "chat_model",
      },
    ],
  },
  assistantName: "AB",
  assistantLogo: "default",

  // Commit ID validation state
  commitIdValidation: {
    hasUpdates: false,
    message: "",
    orphanedModels: [], // Only models that need deletion
  },

  // Set commit ID validation
  setCommitIdValidation: (validation) => {
    set({ commitIdValidation: validation });
  },

  // Clear validation when deletion is complete
  clearCommitIdValidation: () => {
    set({
      commitIdValidation: {
        hasUpdates: false,
        message: "",
        orphanedModels: [],
      },
    });
  },

  getDBConfig: async () => {
    try {
      const response = await invoke("get_config", { assistant: "" });
      if (!response) throw new Error(`GRPC error! status: ${response}`);
      const dbConfig = JSON.parse(response);
      console.log("Database Config Fetched.");
      console.debug("DB Config:", dbConfig);

      // Check for orphaned models that need deletion
      if (dbConfig.CommitIdValidation?.orphaned_model_names?.length > 0) {
        console.log(
          `Found ${dbConfig.CommitIdValidation.orphaned_model_names.length} orphaned models that need deletion:`,
          dbConfig.CommitIdValidation.orphaned_model_names
        );

        useDataStore.getState().setCommitIdValidation({
          hasUpdates: dbConfig.CommitIdValidation.has_updates || false,
          message:
            dbConfig.CommitIdValidation.message || "Orphaned models detected",
          orphanedModels: dbConfig.CommitIdValidation.orphaned_model_names,
        });
      } else {
        console.log("No orphaned models need deletion");
        useDataStore.getState().clearCommitIdValidation();
      }

      useDataStore.getState().parseConfig(dbConfig);
      set({
        config: dbConfig,
        assistant: dbConfig.ActiveAssistant,
        assistantName: dbConfig.ActiveAssistant.full_name,
        assistantLogo: dbConfig.ActiveAssistant.logo_image,
      });
      if (useDataStore.getState().enableAllFeature) {
        useDataStore.getState().parseEnableAllFeature();
      }
    } catch (error) {
      console.error("Failed to fetch DB Config:", error);
    }
  },

  parseConfig: (dbConfig) => {
    if (dbConfig === null) return;

    if (dbConfig.ActiveAssistant && dbConfig.ActiveAssistant.models) {
      dbConfig.ActiveAssistant.models = dbConfig.ActiveAssistant.models.reduce(
        (acc, model) => {
          acc[model.model_type] = model.full_name;
          return acc;
        },
        {}
      );
    }
    if (dbConfig.ActiveAssistant) {
      if (dbConfig.ActiveAssistant.recommended_models) {
        dbConfig.ActiveAssistant.recommended_models = JSON.parse(
          dbConfig.ActiveAssistant.recommended_models
        );
      } else {
        dbConfig.ActiveAssistant.recommended_models = [];
      }
    }
  },

  setConfig: (config) => {
    set({ config: config });
  },

  setAssistant: (assistant) => {
    set({ assistant: assistant });
  },

  setAssistantName: (name) => {
    set({ assistantName: name });
  },

  setAssistantLogo: (logo) => {
    set({ assistantLogo: logo });
  },

  setViewModel: async (viewModel) => {
    const viewModelString = JSON.stringify(viewModel);
    await invoke("set_user_config_view_model", { vm: viewModelString });
  },

  exportConfig: async (assistantName, exportPath) => {
    console.log("Exporting Config...", assistantName, exportPath);
    try {
      const response = await invoke("export_user_config", {
        assistantName: assistantName,
        exportPath: exportPath,
      });
      if (!response) throw new Error(`GRPC error! status: ${response}`);
      console.log("Config Exported.");
      return response;
    } catch (error) {
      console.error("Failed to export Config:", error);
    }
  },

  importConfig: async (importPath) => {
    console.log("Importing Config...", importPath);
    try {
      const response = await invoke("import_user_config", {
        importPath: importPath,
      });
      if (!response) throw new Error(`GRPC error! status: ${response}`);
      console.log("Config Imported.");
      return true;
    } catch (error) {
      console.error("Failed to import Config:", error);
      return false;
    }
  },

  enableAllFeature: false,

  setEnableAllFeature: (status) => {
    set({ enableAllFeature: status });
  },

  parseEnableAllFeature: async () => {
    try {
      const allFeatures = [
        // "GeneralFile",
        "Summarize",
        "Table",
        "Image",
        // "GenImage",
        "Resume",
        "Clear",
      ];
      const newAssistant = {
        ...useDataStore.getState().assistant,
        features: allFeatures,
      };
      const newConfig = {
        ...useDataStore.getState().config,
        ActiveAssistant: newAssistant,
      };
      useDataStore.getState().setAssistant(newAssistant);
      useDataStore.getState().setConfig(newConfig);
      console.log("Enabled all features");
    } catch (error) {
      console.error("Enable all features failed:", error);
    }
  },
}));

export default useDataStore;
