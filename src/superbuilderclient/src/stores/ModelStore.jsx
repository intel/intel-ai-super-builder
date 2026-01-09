import React from "react";
import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import useDataStore from "./DataStore";
import DOMPurify from "dompurify";

const useModelStore = create((set) => ({
  status: "",
  error: "",
  setStatus: (status) => {
    set({ status: status });
  },
  setError: (error) => {
    set({ error: error });
  },
  modelIsConverted: false,
  modelID: "",
  modelName: "",
  modelPath: "", // Add modelPath to store the path
  isHfInputModelPath: false, //check if input is model path or hf id.
  modelJson: "", //json string of model vm sent to MW on update_db call.
  modelParametersInput: "",
  setModelParametersInput: (params) => {
    set({ modelParametersInput: params });
  },

  hfDownloadOptions: [
    {
      key: "huggingface",
      label: "https://huggingface.co",
      url: "https://huggingface.co",
    },
    {
      key: "hf-mirror",
      label: "https://hf-mirror.com",
      url: "https://hf-mirror.com",
    },
    {
      key: "www.modelscope.cn",
      label: "https://www.modelscope.cn",
      url: "https://www.modelscope.cn",
    },
  ],

  hfModelInput: "",
  setHFModelInput: (model) => {
    set({ hfModelInput: model });
  },

  setHFDownloadWindows: async () => {
    const modelConversionWindow = new WebviewWindow("modelConversionWindow", {
      url: "model_conversion_window.html",
      decorations: false,
      resizable: true,
      height: 580,
      width: 660,
      title: "Model Convert",
    });

    modelConversionWindow.once("tauri://created", () => {
      console.log("modelConversionWindow created successfully");
    });

    modelConversionWindow.once("tauri://error", async (e) => {
      if (modelConversionWindow.isMinimized()) {
        await modelConversionWindow.unminimize();
        console.log("Window is restored");
      } else {
        console.error("Error creating webview window:", e);
      }
    });
  },
   validateParametersInput: (userInput) => {
    //input should already be santizied, check for harmful input.
    //check for excessively long input
    const maxInputLength = 1000;
    if (userInput.length > maxInputLength) {
      console.log("Input is too long.");
      set({ error: "Input is too long." });
      return false;
    }
  
    //check for presence of potentially dangerous characters
    const dangerousCharacters = /[<>;'"`]/;
    if (dangerousCharacters.test(userInput)) {
      console.log("Input contains potentially dangerous characters.");
      set({ error: "Input contains potentially dangerous characters." });
      return false;
    }
    console.log("Input is safe");
    return true;
  },

  missingModels: [],
  setMissingModels: (models) => {
    set({ missingModels: models });
  },
  resetMissingModels: () => {
    set({ missingModels: [] });
  },
  checkMissingModels: async (modelNames) => {
    try {
      const response = await invoke("get_missing_models", {
        modelsAbsPath: useDataStore.getState().config.local_model_hub,
        models: modelNames,
      });
      console.debug("Missing Models:", response);
      set({ missingModels: response.missing_models });
      return response.missing_models;
    } catch (error) {
      console.error("Failed to check missing models:", error);
    }
  },

  downloadProgress: 0,
  setDownloadProgress: (progress) => {
    set({ downloadProgress: progress });
  },
  downloadHFModel: async (modelID, tokenId = null) => {
    const modelName = modelID.split("/").pop();
    const fullPath = useDataStore.getState().config.local_model_hub + modelName;
    const urlObj = new URL(
      useDataStore.getState().config.download_endpoint + "/" + modelID
    );
    const fileUrl = urlObj.toString();
    try {
      set({ downloading: true, status: "Downloading..." });
      const params = {
        fileUrl: fileUrl,
        localPath: fullPath,
      };
      if (tokenId !== null && tokenId.trim() !== "") {
        params.tokenId = tokenId;
      }
      await invoke("download_file", params);
      set({ downloading: false });
      return true;
    } catch (error) {
      console.error("Failed to download model:", error);
      set({
        downloading: false,
        status: "Error in downloading model.",
        error: error,
      });
      throw error;
    }
  },

  checkOpenVinoModel: async (model) => {
    try {
      set({ status: "Checking Model readiness..." });
      console.dir("Checking Model readiness...");
      console.dir(useDataStore.getState().config.local_model_hub + model);
      // const response = await invoke("check_openvino_model", {
      //   folderPath: useDataStore.getState().config.local_model_hub + model,
      // });
      // console.debug("OpenVINO Model:", response);
      // set({ modelReady: response });
      return response;
    } catch (error) {
      set({ status: "Failed to check the model!", error: error });
      console.error("Failed to check OpenVINO model:", error);
    }
  },

  uploadModel: async (modelType) => {
    set({ status: "Uploading Model..." });
    try {
      const downloadLink = useModelStore.getState().isHfInputModelPath
        ? ""
        : useDataStore.getState().config.download_endpoint +
          "/" +
          useModelStore.getState().modelID;
      const modelObj = {
        short_name: useModelStore.getState().modelName,
        full_name: useModelStore.getState().modelName,
        model_type: modelType,
      };
      const reply = await invoke("upload_model", {
        downloadLink: downloadLink,
        sourceDir: useModelStore.getState().modelPath,
        model: modelObj.full_name,
        modelType: modelObj.model_type,
      });

      const modelJson = JSON.stringify([modelObj]);
      set({
        status: `${useModelStore.getState().modelName} uploaded!`,
        modelIsConverted: false,
        modelJson: modelJson,
      });
    } catch (error) {
      console.error("error in uploadModel: ", error);
      set({
        status: "Error in Uploading Model",
        modelIsConverted: false,
        error: error,
      });
      return false;
    }
    return true;
  },

  setModel: async (modelJson) => {
    try {
      console.debug("setModel input: ", modelJson);
      await invoke("update_db_models", {
        assistant: useDataStore.getState().config.ActiveAssistant.short_name,
        modelsJson: modelJson,
      });
      console.log("Model updated in DB successfully");
    } catch (error) {
      console.error("Failed to update model in DB:", error);
      return false;
    }
    return true;
  },

  convertModel: async (isHfInputModelPath = false, tokenId = null) => {
    const modelID = useModelStore.getState().hfModelInput;
    const separator = isHfInputModelPath ? "\\" : "/";
    const modelName = modelID.split(separator).pop();
    console.log(modelName);

    const modelPath = isHfInputModelPath
      ? modelID
      : useDataStore.getState().config.local_model_hub + modelName;

    try {
      set({ status: "Converting to OpenVino Model..." });
      const request = { modelPath: modelPath};
      const parameters = useModelStore.getState().modelParametersInput;
      if(parameters !== "") {
        const sanitizedParams = DOMPurify.sanitize(parameters);
        if(!useModelStore.getState().validateParametersInput(sanitizedParams)) {
          set({ status: "Invalid parameter formats found: " + invalidParameters.join(", ")});
          return;
        };
        request.parameters = sanitizedParams;
      }

      if (tokenId !== null && tokenId.trim() !== "") {
        request.tokenId = tokenId;
      }

      await invoke("convert_model", request);

      set({
        status: `${modelName} converted model is stored at \n ${modelPath}`,
        modelIsConverted: true,
        modelID: modelID,
        modelName: modelName,
        modelPath: modelPath,
        isHfInputModelPath: isHfInputModelPath,
      });

      return true;
    } catch (error) {
      console.error("Failed to convert Model:", error);
      set({ status: "Error in Converting Model", error: error });
      throw error;
    }
  },

  removeModelName: "",
  setRemoveModelname: (modelName) => {
    set({ removeModelName: modelName });
  },
  removeModelDialog: false,
  openRemoveModelDialog: () => {
    set({ removeModelDialog: true });
  },
  closeRemoveModelDialog: () => {
    set({ removeModelDialog: false });
  },
  removeModel: async () => {
    try {
      const response = await invoke("remove_model", {
        modelName: useModelStore.getState().removeModelName,
      });
      console.debug("Model removed:", response);
    } catch (error) {
      console.error("Failed to remove Model:", error);
    }
  },
}));

export default useModelStore;
