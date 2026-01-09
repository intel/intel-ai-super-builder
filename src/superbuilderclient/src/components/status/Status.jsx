import React, { useEffect, useState, useRef, useContext } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./Status.css";
import { RagReadyContext } from "../context/RagReadyContext";
import { ModelDownloaderContext } from "../context/ModelDownloaderContext";
import { ChatContext } from "../context/ChatContext";
import useDataStore from "../../stores/DataStore";
import { useTranslation } from "react-i18next";

const MAX_RETRIES = 10;
const RETRY_INTERVAL = 5000;

const Status = ({ setIsMinHWModalOpen, setIsNonValidHWModalOpen }) => {
  const { t } = useTranslation();
  const {
    downloadInProgress,
    setDownloadInProgress,
    setDownloadData,
    downloadConsent,
    downloadFailed,
    setWaitingForConsent,
    setDownloadWindowsOpen,
  } = useContext(ModelDownloaderContext);
  const { config, assistant, getDBConfig } = useDataStore();
  const downloadInProgressRef = useRef(downloadInProgress);
  const downloadFailedRef = useRef(downloadFailed);
  const isFirstRun = useRef(true);
  const { newChatModelNeeded, setNewChatModelNeeded } = useContext(ChatContext);
  const [currentModel, setCurrentModel] = useState(null);

  useEffect(() => {
    console.log("download in progress flag " + downloadInProgress);
    downloadInProgressRef.current = downloadInProgress;
    if (downloadInProgress.current) {
      setStatus(t("status.downloading_models"));
    }
  }, [downloadInProgress]);

  useEffect(() => {
    if (downloadFailed) {
      downloadFailedRef.current = downloadFailed;
      setDownloadInProgress(false);
      setStatus(t("status.downloading_retry"));
    }
  }, [downloadFailed]);

  const [status, setStatus] = useState(null);
  const { setReady } = useContext(RagReadyContext);
  const [checkedMW, setCheckedMW] = useState(false);
  const [checkedModel, setCheckedModel] = useState(false);
  const [checkedPyllm, setCheckedPyllm] = useState(false);

  useEffect(() => {
    if (status == t("status.could_not_load_model")) {
      setNewChatModelNeeded(true);
    } else {
      setNewChatModelNeeded(false);
    }
    console.log(
      "status changed, setting newchatmodelneeded: ",
      newChatModelNeeded
    );

    // Handle loading cursor
    const isLoading = [
      t("status.checking_api_service"),
      t("status.downloading_models"),
      t("status.loading_models"), t("status.updating_model"),
      t("status.checking_local_llm"),
      t("status.downloading_retry"),
      t("status.downloading_retry_1"),
      t("status.checking_backend"),
    ].some((keyword) => status?.includes(keyword));
  
    document.body.classList.toggle("status-loading", isLoading);
  
    // Cleanup on component unmount
    return () => {
      document.body.classList.remove("status-loading");
    };
  }, [status]);

  const mw = async (retries) => {
    try {
      setStatus(t("status.checking_api_service"));
      const result = await invoke("connect_client");
      if (result == null || result == undefined) {
        await getDBConfig();
        const data = await useDataStore.getState().getSystemInfo();

        //Check if minimum hardware requirements are met
        if (!data.IsMinHWReqMet) {
          setIsMinHWModalOpen(true);
          setStatus(t("status.hardware_not_met"));
          return false;
        } else if (!data.IsValidated) {
          setIsNonValidHWModalOpen(true);
        }

        return true;
      } else {
        throw new Error(result);
      }
    } catch (error) {
      if (retries > 1) {
        console.log(
          `${error}. Tried ${MAX_RETRIES - retries + 1} times. Retry in ${
            RETRY_INTERVAL / 1000
          } seconds`
        );
        // setStatus("API service is not ready");
        await new Promise((resolve) =>
          setTimeout(() => resolve(), RETRY_INTERVAL)
        );
        return mw(retries - 1);
      } else {
        setStatus(t("status.failed_to_connect_service"));
        console.log(
          `${error}. Tried ${
            MAX_RETRIES - retries + 1
          } times. No more retry. Please fix the issue and restart.`
        );
      }
      return false;
    }
  };

  const model = async (retries) => {
    try {
      if (downloadInProgressRef.current) {
        throw new Error("downloading");
      }
      if (downloadFailedRef.current) {
        throw new Error("download failed");
      }
      console.log("PASSED DOWNLOADINPROGRESS", downloadInProgress);

      if (assistant.models.chat_model !== "chat_model") {
        setStatus(t("status.checking_local_llm"));
        setCurrentModel(assistant.models); // set the current model to the assistant models
        const modelNames = Object.values(assistant.models);
        const localPath = config.local_model_hub;
        console.log(modelNames, " path ", localPath);
        const missingModelsResponse = await invoke("get_missing_models", {
          modelsAbsPath: localPath,
          models: modelNames,
        });
        console.log("Missing models:", missingModelsResponse);
        setDownloadData(missingModelsResponse);
        if (
          missingModelsResponse.missing_models &&
          missingModelsResponse.missing_models.length > 0
        ) {
          if (downloadConsent === false) {
            setStatus(t("status.awaiting_download_models"));
            setWaitingForConsent(true);
            setDownloadWindowsOpen(true);
            return false;
          } else {
            setWaitingForConsent(false);
            throw new Error("downloading");
          }
        }
        setWaitingForConsent(false);
        return true;
      }
    } catch (error) {
      if (error.message == "downloading") {
        setStatus(t("status.downloading_models"));
        await new Promise((resolve) =>
          setTimeout(() => resolve(), RETRY_INTERVAL)
        );
        return model(retries);
      } else {
        if (retries > 1) {
          console.log(
            `${error}. Tried ${MAX_RETRIES - retries + 1} times. Retry in ${
              RETRY_INTERVAL / 1000
            } seconds`
          );
          setStatus(
            t("status.downloading_retry_1") +
              ` ${MAX_RETRIES - retries + 1} ` +
              t("status.downloading_retry_2")
          );
          await new Promise((resolve) =>
            setTimeout(() => resolve(), RETRY_INTERVAL)
          );
          return model(retries - 1);
        } else {
          setStatus(t("status.failed_to_download_models"));
          console.log(
            `${error}. Tried ${
              MAX_RETRIES - retries + 1
            } times. No more retry. Please fix the issue and restart.`
          );
        }
      }
    }
  };

  const pyllm = async (retries) => {
    try {
      setStatus(t("status.checking_backend"));
      const result = await invoke("pyllm_say_hello");
      if (result == "ready") {
        const status = await loadmodels();
        if (status) {
          setStatus("Ready");
          setReady(true);
          return true;
        } else {
          setStatus(t("status.could_not_load_model"));
          return false;
        }
      } else {
        throw new Error(result);
      }
    } catch (error) {
      console.error(error);
      if (retries > 1) {
        console.log(
          `${error}. Tried ${MAX_RETRIES - retries + 1} times. Retry in ${
            RETRY_INTERVAL / 1500
          } seconds`
        );
        // setStatus("Backend is not ready.");
        await new Promise((resolve) =>
          setTimeout(() => resolve(), RETRY_INTERVAL)
        );
        return pyllm(retries - 1);
      } else {
        setStatus(t("status.backend_not_ready"));
        console.log(
          `${error}. Tried ${
            MAX_RETRIES - retries + 1
          } times. No more retry. Please fix the issue and restart.`
        );
      }
      return false;
    }
  };

  const loadmodels = async () => {
    setStatus(t("status.loading_models"));
    const status = await invoke("load_models");
    return status; // true if successful chat model load, false otherwise
  };

  useEffect(() => {
    const executeCallsInOrder = async () => {
      try {
        console.log("Checking all components...");
        const resultA = await mw(MAX_RETRIES);
        if (resultA) {
          console.log("API service is ready");
          setCheckedMW(true);
        } else {
          setDownloadInProgress(false);
          return;
        }

        const resultB = await model(MAX_RETRIES);
        if (resultB) {
          console.log("Models are downloaded");
          setCheckedModel(true);
        } else {
          return;
        }

        const resultC = await pyllm(MAX_RETRIES);
        if (resultC) {
          console.log("Backend is ready");
          setCheckedPyllm(true);
        } else {
          return;
        }
      } catch (error) {
        console.error("An error occurred:", error);
      }
    };

    executeCallsInOrder();
  }, []);

  useEffect(() => {
    if (isFirstRun.current && checkedModel === false) {
      console.log("First run");
      // Skip the effect on the first render
      isFirstRun.current = false;
      return;
    }
    console.log("Config has changed:", config);

    const checkModel = async () => {
      try {
        const result = await model(MAX_RETRIES);
        if (result) {
          setStatus(t("status.updating_model") + assistant.models.chat_model);
          setReady(false); /*
          const response = await invoke("update_db_models", {
            assistant: config.ActiveAssistant.short_name,
            modelsJson: config.ActiveAssistant.models.chat_model
          });*/
          console.log("Setting DB for new models");
          const foundModels = Object.keys(assistant.models).map((key) => {
            const modelName = assistant.models[key];
            return assistant.all_models?.find(
              (entry) => entry.full_name === modelName
            );
          });
          console.log("Setting DB for new models", JSON.stringify(foundModels));
          await invoke("update_db_models", {
            assistant: assistant.short_name,
            modelsJson: model ? JSON.stringify(foundModels) : null,
          });
          console.log("Model switch is done");
          if (checkedPyllm === false) {
            const resultPy = await pyllm(MAX_RETRIES);
            if (resultPy) {
              console.log("Backend is ready");
              setCheckedPyllm(true);
            } else {
              return;
            }
          } else {
            const status = await loadmodels();
            if (status) {
              if (
                currentModel &&
                (currentModel.chat_model !== assistant.models.chat_model ||
                  currentModel.embeddings_model !==
                    assistant.models.embeddings_model ||
                  currentModel.ranker_model !== assistant.models.ranker_model)
              ) {
                getDBConfig();
              }
              setStatus("Ready");
              setReady(true);
            } else {
              setStatus(t("status.could_not_load_model"));
            }
          }
        }
      } catch (error) {
        console.error("An error occurred:", error);
        setStatus(t("status.could_not_load_model_2"), error);
      }
    };

    checkModel();
  }, [assistant, downloadConsent]);

  return (
    <div>
      {status !== "Ready" && <footer className="footer" data-testid="system-status-display">{status}</footer>}
    </div>
  );
};

export default Status;
