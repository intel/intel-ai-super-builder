import "./DownloadBody.css";
import {
  Button,
  Icon,
  CircularProgress,
  Typography,
  Checkbox,
} from "@mui/material";
import Link from "@mui/material/Link";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import ErrorIcon from "@mui/icons-material/Error";
import { useContext, useState, useEffect } from "react";
import { ModelDownloaderContext } from "../context/ModelDownloaderContext";
import ModelLink from "../modelLink/ModelLink";
import CommitIdNotification from "./CommitIdNotification";
import useDataStore from "../../stores/DataStore";
import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";

import { Grid, Stack } from "@mui/material";

const DownloadBody = ({
  downloadStatus,
  setDownloadStatus,
  fileDownload,
  progress,
  modelStatuses,
}) => {
  const {
    downloadData,
    downloadConsent,
    setDownloadInProgress,
    setDownloadConsent,
    setDownloadWindowsOpen,
    setWaitingForConsent,
    getDownloadLink,
  } = useContext(ModelDownloaderContext);
  const { getDBConfig } = useDataStore();
  const { t } = useTranslation();

  useEffect(() => {
    console.log(modelStatuses);
  }, [modelStatuses]);

  const [isChecked, setIsChecked] = useState(false);

  const handleConfirm = () => {
    console.log("confirm download");
    setDownloadConsent(true);
    setDownloadInProgress(true);
    setWaitingForConsent(false);
  };

  const handleCancel = () => {
    setDownloadConsent(false);
    setDownloadWindowsOpen(false);
    const requiredModels = [
      "bge-reranker-base-int8-ov",
      "bge-base-en-v1.5-int8-ov",
    ];

    const missingModels = downloadData?.missing_models || [];

    const containsRequiredModels = requiredModels.some((model) =>
      missingModels.includes(model)
    );

    const containsOtherModels = missingModels.some(
      (model) => !requiredModels.includes(model)
    );

    if (
      !containsRequiredModels ||
      (containsOtherModels && missingModels.length < 3)
    ) {
      console.log("fetching config");
      getDBConfig();
      setDownloadStatus("All downloads complete");
    }
  };

  const handleClose = () => {
    setDownloadWindowsOpen(false);
  };

  // Maps model types to a displayed string representation
  const formatModelType = (type) => {
    const translationPath = "model_downloader.body." + type;
    let modelTypeTranslation = t(translationPath);
    if (modelTypeTranslation === translationPath) {
      console.log(`No translation defined for model type ${type}, parsing string instead...`);
      modelTypeTranslation = type
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
    return modelTypeTranslation;
  };

  console.log(downloadStatus, modelStatuses);

  return (
    <div className="download-body">
      <CommitIdNotification />

      {downloadStatus === "Awaiting consent to download models" &&
        !downloadConsent &&
        downloadData?.missing_models?.length > 0 && (
          <div className="consent-container">
            <p className="consent-message">
              {t("model_downloader.body.consent_message")}
            </p>
            <ul className="consent-model">
              {" "}
              {downloadData?.missing_models?.map((model) => (
                <li key={model}>
                  <span className="model-name">{model}</span>
                  <ModelLink modelName={model} />
                </li>
              ))}
            </ul>

            <div className="consent-button-group">
              <div className="consent-confirm-container">
                <Checkbox
                  size="large"
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                  data-testid="model-download-consent-checkbox"
                />{" "}
                {/* Added checkbox */}
                <p className="consent-confirm-text">
                  {t("model_downloader.body.confirm_text")}
                </p>
              </div>
              <div className="consent-button-options">
                <Button
                  className="consent-button-option"
                  variant="contained"
                  onClick={handleConfirm}
                  disabled={!isChecked} // Disable button until checkbox is checked
                  data-testid="model-download-proceed-button"
                >
                  <p>{t("model_downloader.body.button_proceed")}</p>
                </Button>
                <Button
                  className="consent-button-option"
                  variant="text"
                  onClick={handleCancel}
                  data-testid="model-download-cancel-button"
                >
                  <p>{t("model_downloader.body.button_cancel")}</p>
                </Button>
              </div>
            </div>
          </div>
        )}

      {downloadStatus !== "Awaiting consent to download models" && (
        <>
          {downloadStatus === "Downloading" && (
            <div className="download-status-container">
              <CircularProgress size={50} sx={{ mr: 2 }} />
              <Typography variant="body1" className="download-status-text">
                {t("model_downloader.body.status_downloading")} {fileDownload}
                ... {progress}%
              </Typography>
            </div>
          )}

          <Stack spacing={1} sx={{ width: "100%", mt: 2 }}>
            {/* Model Folder Path Row */}
            {downloadData && (
              <Grid
                container
                alignItems="flex-start"
                sx={{
                  padding: 1,
                }}
              >
                <Grid item xs={12}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      textAlign: "left",
                      color: "var(--text-primary-color)",
                    }}
                  >
                    {t("model_downloader.body.model_folder")}{" "}
                    {downloadData.models_dir_path}
                  </Typography>
                </Grid>
              </Grid>
            )}

            {/* Model Status Rows */}
            {modelStatuses.map(({ modelType, modelName, statusMessage }) => (
              <Grid
                key={modelType}
                container
                alignItems="center"
                spacing={2}
                sx={{
                  padding: 1,
                }}
              >
                <Grid item xs={1} sx={{ textAlign: "center" }}>
                  {statusMessage === "Ready" ? (
                    <CheckCircleIcon sx={{ color: "green", fontSize: 18 }} />
                  ) : statusMessage === "Downloading" ? (
                    <CircularProgress size={18} />
                  ) : (
                    <ErrorIcon sx={{ color: "red", fontSize: 18 }} />
                  )}
                </Grid>
                <Grid item xs={3}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, color: "var(--text-primary-color)" }}
                  >
                    {formatModelType(modelType)}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography
                    variant="body2"
                    sx={{ color: "var(--text-secondary-color)" }}
                  >
                    {modelName}
                  </Typography>
                </Grid>
                <Grid item xs={3} sx={{ textAlign: "right" }}>
                  <ModelLink modelName={modelName} getLink={getDownloadLink} />
                </Grid>
              </Grid>
            ))}
          </Stack>

          {downloadStatus !== "Downloading" && (
            <div className="setup-complete-button-group">
              {downloadStatus === "All downloads complete" ||
              downloadStatus === "Nothing to download!" ? (
                <Button size="m" variant="contained" onClick={handleClose} data-testid="model-download-complete-button">
                  <CheckCircleOutlineIcon
                    sx={{ fontSize: 18, verticalAlign: "middle", mr: 1 }}
                  />
                  {t("model_downloader.body.status_complete")}
                </Button>
              ) : (
                <>
                  <Button
                    className="setup-fail-button"
                    size="m"
                    variant="outlined"
                    onClick={handleClose}
                    data-testid="model-download-failed-close-button"
                  >
                    <CancelOutlinedIcon
                      sx={{ fontSize: 18, verticalAlign: "middle", mr: 1 }}
                    />
                    {t("model_downloader.body.status_failed")}
                  </Button>

                  <div className="troubleshooting-link">
                    {t("model_downloader.body.troubleshooting_prefix")}{" "}
                    <Link
                      component="button"
                      onClick={async () => {
                        await openUrl(
                          "https://github.com/intel/intel-ai-assistant-builder?tab=readme-ov-file#tips-troubleshooting-known-issues"
                        );
                      }}
                      data-testid="model-download-troubleshooting-link"
                    >
                      {t("model_downloader.body.troubleshooting_link")}
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DownloadBody;
