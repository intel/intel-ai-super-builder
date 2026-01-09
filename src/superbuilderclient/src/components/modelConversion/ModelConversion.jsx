import React, { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen, emit } from "@tauri-apps/api/event";
import {
  Box,
  TextField,
  Button,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  Tooltip,
  Checkbox,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MinimizeIcon from "@mui/icons-material/Minimize";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import { IconButton } from "@mui/material";
import useModelStore from "../../stores/ModelStore";
import useDataStore from "../../stores/DataStore";
import FluidModal from "../FluidModal/FluidModal";
import AssistantLogo from "../assistantLogo/assistantLogo";
import DOMPurify from "dompurify"; // Ensure DOMPurify is imported
import "./ModelConversion.css";
import InfoIcon from '@mui/icons-material/InfoOutlined';

import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { getSettingLanguage } from "../../i18n";

const appWindow = getCurrentWindow();

const ModelLink = ({ modelName }) => {
  // First strictly validate the model name format
  if (!modelName || typeof modelName !== "string") {
    return null;
  }

  // Only allow characters valid for HuggingFace model names
  // Typically organization/model format like "Qwen/Qwen2-7B-Instruct"
  const modelNameRegex = /^[a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-]+$/;
  if (!modelNameRegex.test(modelName)) {
    return null;
  }

  // Explicitly construct the URL with hardcoded domain to prevent manipulation
  const baseUrl = "https://huggingface.co/";

  // Construct and validate URL in a deterministic way
  try {
    // Create a URL object to validate the structure
    const urlObj = new URL(modelName, baseUrl);

    // Ensure hostname is exactly huggingface.co
    if (urlObj.hostname !== "huggingface.co") {
      return null;
    }

    // Ensure protocol is https:
    if (urlObj.protocol !== "https:") {
      return null;
    }

    // Get the safe URL string
    const safeURL = urlObj.href;

    // Final safety check - reject any URLs containing dangerous schemes
    if (/^(javascript|data|vbscript):/i.test(safeURL)) {
      return null;
    }

    return (
      <a
        href={safeURL}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--primary-main-color)" }}
      >
        View Model Card
      </a>
    );
  } catch (e) {
    console.error("Invalid URL construction:", e);
    return null;
  }
};

const ModelConversion = () => {
  const { t } = useTranslation();
  const [selectedModelType, setSelectedModelType] = useState("chat_model");
  const [tokenId, setTokenId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [consentNeeded, setConsentNeeded] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const status = useModelStore((state) => state.status);
  const error = useModelStore((state) => state.error);
  const hfModelInput = useModelStore((state) => state.hfModelInput);
  const downloadProgress = useModelStore((state) => state.downloadProgress);
  const modelJson = useModelStore((state) => state.modelJson);
  const {
    setHFModelInput,
    checkMissingModels,
    resetMissingModels,
    downloadHFModel,
    checkOpenVinoModel,
    convertModel,
    setDownloadProgress,
    setStatus,
    setError,
    modelIsConverted,
    uploadModel,
    setModel,
    setModelParametersInput,
    modelParametersInput,
    validateParametersInput,
  } = useModelStore();
  const config = useDataStore((state) => state.config);

  const { getDBConfig } = useDataStore();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const handleResize = async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const minimizeWindow = () => appWindow.minimize();
  const toggleMaximizeWindow = () => appWindow.toggleMaximize();

  useEffect(() => {
    resetMissingModels();
    getDBConfig();
  }, []); 

  useEffect(() => {
    const unlisten = listen("download-progress", (event) => {
      const [downloadFile, progressData] = event.payload;
      setDownloadProgress(progressData);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const unlistenPromise = listen("load-convert-form", async (eventData) => {
      console.log("Event received:", eventData);
      if (eventData.payload.language) {
        const settingLanguage = await getSettingLanguage();
        i18n.changeLanguage(settingLanguage);
      }
    });
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const handleActivateModel = async () => {
    const setActiveModelSuccess = await setModel(modelJson);
    await emit("new-model-added", setActiveModelSuccess);
    const appWindow = getCurrentWindow();
    await appWindow.minimize();
    handleClose();
  };

  const isValidWindowsPath = (path) => {
    const windowsPathRegex =
      /^[a-zA-Z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*$/;
    return windowsPathRegex.test(path);
  };

  const handleEnabler = async () => {
    try {
      const isWindowsPath = isValidWindowsPath(hfModelInput);
      if (!isWindowsPath) {
        const response = await fetch(
          `${config.download_endpoint}/api/models/${hfModelInput}`
        );
        if (!response.ok) {
          setStatus(
            `Model ${hfModelInput} not found in ${config.download_endpoint}`
          );
          return;
        }
        const result = await checkMissingModels([hfModelInput.split("/")[1]]);
        if (result.length !== 0) {
          const result = await downloadHFModel(hfModelInput, tokenId);
          if (result) {
            console.log("result: ", result);
            resetMissingModels();
            setDownloadProgress(0);
          }
        }
      }
      const success = await convertModel(isWindowsPath, tokenId);
      console.log("Model conversion success:", success);
      if (success) {
        const uploadSuccess = await uploadModel(selectedModelType);
        await emit("new-model-added", uploadSuccess);
        setHFModelInput("");
        setTokenId("");
      }
    } catch (error) {
      console.error("Error in download/convert model", error);
      setDownloadProgress(0);
      setStatus("Error in Upload");
      setError(error);
    }
  };

  const checkConsentNeeded = () => {
    if (isValidWindowsPath(hfModelInput)) {
      setConsentNeeded(false);
    } else {
      setConsentNeeded(true);
    }
  };

  const modelInputChange = (e) => {
    setHFModelInput(e.target.value);
    setStatus("");
    setError("");
  };

  const parametersInputChange = (e) => {
    setModelParametersInput(e.target.value);
    setStatus("");
    setError("");
  };

  const tokenIdChange = (e) => {
    setTokenId(e.target.value);
  };

  const handleClose = async () => {
    try {
      await appWindow.close();
    } catch (error) {
      console.error("Error closing the window:", error);
    }
  };

  const handleModalOpen = () => {
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        margin: "-8px",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          height: "var(--topbar-height)",
          backgroundColor: config.ActiveAssistant.header_bg_color,
          "--header-text-color": config.ActiveAssistant.header_text_bg_color,
          color: config.ActiveAssistant.header_text_bg_color,
        }}
        data-tauri-drag-region
      >
        <div
          className="info-logo-fluid"
          style={{
            "--logo-container-background-color":
              config.ActiveAssistant.header_bg_color,
              paddingLeft: "4px",
          }}
        >
          <AssistantLogo assistant={config.ActiveAssistant} transparentDefaultBackground={true}/>
        </div>
        <Typography
          sx={{
            width: "100%",
            pointerEvents: "none",
            textAlign: "center",
          }}
        >
          {t("setting.models.conversion.title")}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <IconButton
            className="window-control"
            onClick={minimizeWindow}
            data-testid="model-conversion-window-minimize-button"
          >
            <MinimizeIcon fontSize="small" />
          </IconButton>
          <IconButton
            className="window-control"
            onClick={toggleMaximizeWindow}
            data-testid="model-conversion-window-maximize-button"
          >
            {isMaximized ? <CloseFullscreenIcon fontSize="small" /> : <OpenInFullIcon fontSize="small" />}
          </IconButton>
          <IconButton
            className="window-control"
            id="close"
            onClick={handleClose}
            data-testid="model-conversion-window-close-button"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
      <Box
        width="95%"
        p={2}
        justifyItems={"center"}
        className="convert-model-box"
        sx={{ 
          flexGrow: 1,
          overflowY: "auto",
          backgroundColor: "var(--bg-color)",
          color: "var(--text-primary-color)"
        }}
      >
        <div className="textfield-label-container">
          <Typography className="textfield-title">
            <span style={{ color: "red" }}>*</span>{" "}
            {t("setting.models.conversion.form_1")}
          </Typography>
          <TextField
            value={hfModelInput}
            placeholder="ex: Qwen/Qwen2-7B-Instruct or C:\Path\To\Model\Folder"
            onChange={modelInputChange}
            onFocus={() => {
              setStatus("");
              setError("");
            }}
            onBlur={checkConsentNeeded}
            sx={{ display: "flex", width: "90%" }}
            fullWidth
            disabled={
              status !== "" &&
              !status.includes("ready") &&
              !status.includes("not found") &&
              !status.includes("Failed") &&
              !status.includes("uploaded") &&
              !status.includes("Error")
            }
            data-testid="model-conversion-input-field"
          />
        </div>
        <div className="textfield-label-container">
          <Typography className="textfield-title">
            {t("setting.models.conversion.form_2")}
          </Typography>
          <TextField
            value={tokenId}
            placeholder="ex: xyzpdq123-455"
            variant="outlined"
            onChange={tokenIdChange}
            sx={{ display: "flex", width: "100%" }}
            fullWidth
            disabled={
              status !== "" &&
              !status.includes("ready") &&
              !status.includes("not found") &&
              !status.includes("Failed") &&
              !status.includes("uploaded") &&
              !status.includes("Error")
            }
            data-testid="model-conversion-token-input-field"
          />
        </div>
        <div className="textfield-label-container">
          <div className="label-tooltip-container">
            <Typography className="textfield-title">
              {t("setting.models.conversion.form_3")}
            </Typography>
            <Tooltip title={t("setting.models.conversion.tips_3_1")} arrow>
              <a
                href={
                  "https://huggingface.co/docs/optimum/en/intel/openvino/export"
                }
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-block" }} // Ensures the link wraps the image correctly
              >
                {/* <img
                  className="infoshape"
                  src="/images/normal_u151.svg"
                  alt="Info Icon"
                  style={{ cursor: "pointer" }} // Optional: change cursor to pointer
                /> */}
                <InfoIcon color="primary" fontSize="small"/>
              </a>
            </Tooltip>
          </div>
          <TextField
            value={modelParametersInput}
            placeholder="ex: --flag1 value --flag2 value"
            variant="outlined"
            onChange={parametersInputChange}
            onBlur={(e) =>
              validateParametersInput(DOMPurify.sanitize(e.target.value))
            }
            onFocus={() => {
              setStatus("");
            }}
            sx={{ display: "flex", width: "100%" }} // Adjust width to account for image
            fullWidth
            disabled={
              status !== "" &&
              !status.includes("ready") &&
              !status.includes("not found") &&
              !status.includes("Failed") &&
              !status.includes("uploaded") &&
              !status.includes("Error")
            }
            data-testid="model-conversion-parameters-input-field"
          />
        </div>
        {status !== "" && (
          <Typography justifySelf={"center"}>
            {status === "Downloading..."
              ? `${status} ${downloadProgress}%`
              : status}
          </Typography>
        )}
        {error && (
          <Typography color="error" justifySelf={"center"}>
            {error.toString()}
          </Typography>
        )}
        <div className="textfield-label-container">
          <FormControl component="fieldset" className="small-form-control">
            <div
              className="radio-group-with-label"
              sx={{ display: "flex", width: "100%" }}
            >
              <Typography className="textfield-title">
                <span style={{ color: "red" }}>* </span>{" "}
                {t("setting.models.conversion.model_type")}{" "}
              </Typography>
              <RadioGroup
                row
                aria-label="model"
                name="model"
                value={selectedModelType}
                onChange={(e) => setSelectedModelType(e.target.value)}
              >
                <FormControlLabel
                  value="chat_model"
                  control={
                    <Radio
                      disabled={status.includes("uploaded")}
                      color={"default"}
                    />
                  }
                  label={t("setting.models.conversion.chat")}
                  data-testid="model-conversion-chat-model-radio"
                />
                <FormControlLabel
                  value="embedding_model"
                  control={
                    <Radio
                      disabled={status.includes("uploaded")}
                      color={"default"}
                    />
                  }
                  label={t("setting.models.conversion.embedder")}
                  data-testid="model-conversion-embedding-model-radio"
                />
                <FormControlLabel
                  value="ranker_model"
                  control={
                    <Radio
                      disabled={status.includes("uploaded")}
                      color={"default"}
                    />
                  }
                  label={t("setting.models.conversion.reranker")}
                  data-testid="model-conversion-ranker-model-radio"
                />
              </RadioGroup>
            </div>
          </FormControl>
        </div>
        {consentNeeded && (
          <FormControlLabel
            sx={{ display: "flex" }}
            label={
              <>
                {t("setting.models.conversion.agreement")}
                <ModelLink modelName={hfModelInput} />
              </>
            }
            control={
              <Checkbox
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
              />
            }
            data-testid="model-conversion-consent-checkbox"
          />
        )}
        <Button
          variant="contained"
          color="primary"
          disabled={status !== "" || (consentNeeded && !consentGiven)}
          onClick={handleEnabler}
          sx={{ display: "flex", width: "75%", textTransform: "none" }}
          data-testid="model-convert-button"
        >
          {t("setting.models.conversion.convert_button")}
        </Button>
        <Typography variant="body1" sx={{ padding: "20px" }}>
          {t("setting.models.conversion.notice_1")}{" "}
          <span style={{ fontWeight: "bold" }}>
            {t("setting.models.conversion.notice_2")}
          </span>{" "}
          {t("setting.models.conversion.notice_3")}
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          height: "37px",
          backgroundColor: "#f0f0f0",
        }}
      >
        <Button
          variant="outlined"
          color="primary"
          onClick={() => appWindow.close()}
          sx={{ width: "50%", textTransform: "none" }}
          data-testid="model-conversion-close-window-button"
        >
          {t("setting.models.conversion.close_button")}
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={!status.includes("uploaded") || selectedModelType === ""}
          onClick={handleActivateModel}
          sx={{ width: "50%", textTransform: "none" }}
          data-testid="model-conversion-activate-model-button"
        >
          {t("setting.models.conversion.active_button")}
        </Button>
      </Box>
    </Box>
  );
};

export default ModelConversion;
