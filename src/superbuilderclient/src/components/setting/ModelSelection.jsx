import React, { useEffect, useState, useContext } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormHelperText,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";
import { exists } from "@tauri-apps/plugin-fs";
import CheckIcon from "@mui/icons-material/Check";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import { useTranslation } from "react-i18next";

import { ChatContext } from "../context/ChatContext";
import { RagReadyContext } from "../context/RagReadyContext";
import { ModelDownloaderContext } from "../context/ModelDownloaderContext";

import useDataStore from "../../stores/DataStore";
import useModelStore from "../../stores/ModelStore";

const ModelSelection = () => {
  const { t } = useTranslation();
  const config = useDataStore((state) => state.config);
  const assistant = useDataStore((state) => state.assistant);
  const { setAssistant, setConfig, setViewModel, getDBConfig } = useDataStore();

  const hfDownloadOptions = useModelStore((state) => state.hfDownloadOptions);
  const removeModelDialog = useModelStore((state) => state.removeModelDialog);
  const {
    removeModelName,
    removeModel,
    openRemoveModelDialog,
    closeRemoveModelDialog,
  } = useModelStore();

  const { isChatReady, newChatModelNeeded } = useContext(ChatContext);
  const { ready } = useContext(RagReadyContext);
  const { waitingForConsent } = useContext(ModelDownloaderContext);

  const [downloadedModels, setDownloadedModels] = useState({});

  const modelSwitch = async (type, model_name) => {
    console.log("Model Switch:", type, model_name);
    const updatedAssistant = {
      ...assistant,
      models: {
        ...assistant.models,
        [type]: model_name,
      },
    };
    const updatedConfig = {
      ...config,
      ActiveAssistant: updatedAssistant,
    };
    setAssistant(updatedAssistant);
    setConfig(updatedConfig);
  };

  const endPointSwitch = async (endpoint) => {
    console.log("Endpoint Switch:", endpoint);
    const updatedConfig = {
      ...config,
      download_endpoint: endpoint,
    };

    const newViewModel = Object.keys(updatedConfig).reduce((acc, key) => {
      if (
        typeof updatedConfig[key] !== "object" ||
        updatedConfig[key] === null
      ) {
        acc[key] = updatedConfig[key];
      }
      return acc;
    }, {});
    setViewModel(newViewModel);
    await getDBConfig();
  };

  const handleRemoveClick = (modelName) => {
    console.log("Remove Model Clicked:", modelName);
    useModelStore.getState().setRemoveModelname(modelName);
    openRemoveModelDialog();
  };

  const modelRemove = async () => {
    closeRemoveModelDialog();
    await removeModel();
    await getDBConfig();
  };

  const isModelDownloaded = async (modelName) => {
    const modelPath = config.local_model_hub;
    try {
      const existsResult = await invoke("path_exists", {
        path: modelPath + modelName,
      });
      setDownloadedModels((prev) => ({ ...prev, [modelName]: existsResult }));
    } catch (error) {
      console.error(`Error checking model ${modelName}:`, error);
      setDownloadedModels((prev) => ({ ...prev, [modelName]: false }));
    }
  };

  // When models list changes, check their download status
  useEffect(() => {
    if (config.ActiveAssistant?.all_models) {
      config.ActiveAssistant.all_models.forEach((model) => {
        isModelDownloaded(model.full_name);
      });
    }
  }, [config.ActiveAssistant]);

  return (
    <Box>
      <Box className="model-switch-card">
        <Typography>
          {t("setting.models.current.currentllm")}
        </Typography>
        <FormControl fullWidth size="small">
          <Select
            data-testid="chat-model-select"
            value={config.ActiveAssistant.models.chat_model}
            renderValue={(value) => value}
            onChange={(event) => {
              const modelName = event.target.value;
              modelSwitch("chat_model", modelName);
            }}
            disabled={
              config.ActiveAssistant.all_models === undefined
                ? true
                : newChatModelNeeded
                ? false
                : ready && isChatReady
                ? false
                : waitingForConsent
                ? false
                : true
            }
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 48 * 4.5 + 8,
                  overflowY: "auto",
                },
                'data-testid': 'model-select-menu-paper',
              },
            }}
            sx={{ width: "100%", fontSize: "14px" }}
          >
            <MenuItem
              disabled
              value=""
              sx={{
                fontSize: "14px",
              }}
            >
              <em>{t("setting.models.recommended")}</em>
            </MenuItem>
            {config.ActiveAssistant.recommended_models?.map((model, index) => (
              <MenuItem
                key={index}
                value={model.model}
                data-testid={`chat-model-option-${model.model}`}
                sx={{
                  justifyContent: "space-between",
                  fontSize: "14px",
                  paddingRight: "4px",
                }}
              >
                {model.model}
                {config.ActiveAssistant.models.chat_model === model.model && (
                  <CheckIcon fontSize="small" sx={{ color: "green" }} />
                )}
                {config.ActiveAssistant.models.chat_model !== model.model &&
                  (downloadedModels[model.model] === true ? (
                    <DeleteIcon
                      data-testid="delete-recommended-model-icon"
                      fontSize="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemoveClick(model.model);
                      }}
                      sx={{ color: "red" }}
                    />
                  ) : (
                    <DownloadIcon
                      fontSize="small"
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      sx={{ color: "grey" }}
                    />
                  ))}
              </MenuItem>
            ))}
            <MenuItem
              disabled
              value=""
              sx={{
                fontSize: "14px",
              }}
            >
              <em>{t("setting.models.other")}</em>
            </MenuItem>
            {config.ActiveAssistant.all_models
              .filter(
                (model) =>
                  !config.ActiveAssistant.recommended_models.some(
                    (recommended) => recommended.model === model.full_name
                  ) && model.model_type === "chat_model"
              )
              .map((model, index) => (
                <MenuItem
                  key={index}
                  value={model.full_name}
                  data-testid={`chat-model-option-${model.full_name}`}
                  sx={{
                    justifyContent: "space-between",
                    fontSize: "14px",
                    paddingRight: "4px",
                  }}
                >
                  {model.full_name}
                  {config.ActiveAssistant.models.chat_model ===
                    model.full_name && (
                    <CheckIcon fontSize="small" sx={{ color: "green" }} />
                  )}
                  {config.ActiveAssistant.models.chat_model !==
                    model.full_name &&
                    (downloadedModels[model.full_name] === true ? (
                      <DeleteIcon
                        data-testid="delete-other-model-icon"
                        fontSize="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRemoveClick(model.full_name);
                        }}
                        sx={{ color: "red" }}
                      />
                    ) : (
                      <DownloadIcon
                        fontSize="small"
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                        sx={{ color: "grey" }}
                      />
                    ))}
                </MenuItem>
              ))}
          </Select>
          <FormHelperText sx={{ fontSize: "11px" }}>
            {config.ActiveAssistant.all_models === undefined
              ? t("setting.models.current.no_other_model")
              : ready
              ? t("setting.models.current.currentllm_tips")
              : waitingForConsent
              ? t("setting.models.current.currentllm_tips")
              : t("setting.models.current.loading") +
                config.ActiveAssistant.models.chat_model}
          </FormHelperText>
        </FormControl>
      </Box>

      <Box className="model-switch-card">
        <Typography>
          {t("setting.models.current.embedding")}
        </Typography>
        <FormControl fullWidth size="small">
          <Select
            data-testid="embedding-model-select"
            value={config.ActiveAssistant.models.embedding_model}
            renderValue={(value) => value}
            onChange={(event) => {
              const modelName = event.target.value;
              modelSwitch("embedding_model", modelName);
            }}
            disabled={
              config.ActiveAssistant.all_models === undefined
                ? true
                : newChatModelNeeded
                ? false
                : ready && isChatReady
                ? false
                : waitingForConsent
                ? false
                : true
            }
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 48 * 4.5 + 8,
                  overflowY: "auto",
                },
              },
            }}
            sx={{ width: "100%", fontSize: "14px" }}
          >
            {config.ActiveAssistant.all_models
              .filter((model) => model.model_type === "embedding_model")
              .map((model, index) => (
                <MenuItem
                  key={index}
                  value={model.full_name}
                  sx={{ justifyContent: "space-between", fontSize: "14px" }}
                >
                  {model.full_name}
                  {config.ActiveAssistant.models.embedding_model ===
                    model.full_name && <CheckIcon sx={{ color: "green" }} />}
                </MenuItem>
              ))}
          </Select>
          <FormHelperText sx={{ fontSize: "11px" }}>
            {config.ActiveAssistant.all_models === undefined
              ? t("setting.models.current.no_other_model")
              : ready
              ? t("setting.models.current.currentllm_tips")
              : waitingForConsent
              ? t("setting.models.current.currentllm_tips")
              : t("setting.models.current.loading") +
                config.ActiveAssistant.models.embedding_model}
          </FormHelperText>
        </FormControl>
      </Box>

      <Box className="model-switch-card">
        <Typography>
          {t("setting.models.current.ranker")}
        </Typography>
        <FormControl fullWidth size="small">
          <Select
            data-testid="ranker-model-select"
            value={config.ActiveAssistant.models.ranker_model}
            renderValue={(value) => value}
            onChange={(event) => {
              const modelName = event.target.value;
              modelSwitch("ranker_model", modelName);
            }}
            disabled={
              config.ActiveAssistant.all_models === undefined
                ? true
                : newChatModelNeeded
                ? false
                : ready && isChatReady
                ? false
                : waitingForConsent
                ? false
                : true
            }
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 48 * 4.5 + 8,
                  overflowY: "auto",
                },
              },
            }}
            sx={{ width: "100%", fontSize: "14px" }}
          >
            {config.ActiveAssistant.all_models
              .filter((model) => model.model_type === "ranker_model")
              .map((model, index) => (
                <MenuItem
                  key={index}
                  value={model.full_name}
                  sx={{ justifyContent: "space-between", fontSize: "14px" }}
                >
                  {model.full_name}
                  {config.ActiveAssistant.models.ranker_model ===
                    model.full_name && <CheckIcon sx={{ color: "green" }} />}
                </MenuItem>
              ))}
          </Select>
          <FormHelperText sx={{ fontSize: "11px" }}>
            {config.ActiveAssistant.all_models === undefined
              ? t("setting.models.current.no_other_model")
              : ready
              ? t("setting.models.current.ranker_tips")
              : waitingForConsent
              ? t("setting.models.current.ranker_tips")
              : t("setting.models.current.loading") +
                config.ActiveAssistant.models.ranker_model}
          </FormHelperText>
        </FormControl>
      </Box>

      <Box className="model-switch-card">
        <Typography>
          {t("setting.models.current.endpoint")}
        </Typography>
        <FormControl fullWidth size="small">
          <Select
            data-testid="download-endpoint-select"
            value={config.download_endpoint}
            renderValue={(value) => value}
            onChange={(event) => {
              endPointSwitch(event.target.value);
            }}
            disabled={
              newChatModelNeeded
                ? false
                : ready && isChatReady
                ? false
                : waitingForConsent
                ? false
                : true
            }
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 48 * 4.5 + 8,
                  overflowY: "auto",
                },
              },
            }}
            sx={{ width: "100%", fontSize: "14px" }}
          >
            {hfDownloadOptions.map((option, index) => (
              <MenuItem
                key={index}
                value={option.label}
                sx={{ justifyContent: "space-between", fontSize: "14px" }}
              >
                {option.label}
                {config.download_endpoint === option.label && (
                  <CheckIcon sx={{ color: "green" }} />
                )}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText sx={{ fontSize: "11px", marginX: "0px" }}>
            {t("setting.models.current.endpoint_tips1")} <br />
            {t("setting.models.current.endpoint_tips2")}
          </FormHelperText>
        </FormControl>
      </Box>

      <Dialog open={removeModelDialog} onClose={closeRemoveModelDialog} data-testid="remove-model-dialog" >
        <DialogTitle>{t("setting.models.deletion.title")}</DialogTitle>
        <DialogContent>
          {t("setting.models.deletion.description")} {removeModelName}.
          <br />
          {t("setting.models.deletion.description_2")}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRemoveModelDialog} data-testid="cancel-remove-model-button">
            {t("setting.models.deletion.button.cancel")}
          </Button>
          <Button
            data-testid="confirm-remove-model-button"
            onClick={() => modelRemove()}
            variant="contained"
            color="error"
          >
            {t("setting.models.deletion.button.remove")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ModelSelection;
