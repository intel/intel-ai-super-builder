import React, { useState, useEffect, useContext } from "react";
import SideBar from "./sidebar/Sidebar";
import Status from "./status/Status";
import ModelDownloader from "./modelDownloader/modelDownloader";
import CommitIdAlert from "./modelDownloader/CommitIdAlert";
import Topbar from "./topbar/Topbar";
import "./App.css";
import { listen } from "@tauri-apps/api/event";
import { ModelDownloaderContext } from "./context/ModelDownloaderContext";
import { WorkflowContext } from "./context/WorkflowContext";
import ModalWrapper from "./generalUseModal/generalUseModal";
import StatusNotification from "./statusNotification/StatusNotification";
import useDataStore from "../stores/DataStore";
import { useTranslation } from "react-i18next";
import { IconButton } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import GlobalThemeProvider from "./themes/GlobalThemeProvider";

function App() {
  const { t } = useTranslation();
  const { config, assistant } = useDataStore();
  const [isMinHWModalOpen, setIsMinHWModalOpen] = useState(false);
  const [isNonValidHWModalOpen, setIsNonValidHWModalOpen] = useState(false);
  const { selectedWorkflow, renderSelectedWorkflow } =
    useContext(WorkflowContext);
  const { downloadWindowsOpen, setDownloadWindowsOpen, setModelCards } =
    useContext(ModelDownloaderContext);
  const [isCommitIdAlertOpen, setIsCommitIdAlertOpen] = useState(false);
  const { commitIdValidation } = useDataStore();

  useEffect(() => {
    if (assistant.all_models) {
      setModelCards(assistant.all_models);
    }
  }, [assistant]);

  useEffect(() => {
    const unlistenModelAdded = listen("new-model-added", (event) => {
      if (event.payload) {
        useDataStore.getState().getDBConfig();
      }
    });

    return () => {
      unlistenModelAdded.then((fn) => fn());
    };
  }, []);

  // Check for orphaned models on app load
  useEffect(() => {
    const checkOrphanedModels = () => {
      // Show alert if there are orphaned models that need deletion
      if (commitIdValidation.orphanedModels?.length > 0) {
        console.log("Orphaned models detected, showing alert");
        setIsCommitIdAlertOpen(true);
      }
    };

    // Wait a bit for data to load, then check
    const timer = setTimeout(checkOrphanedModels, 2000);

    return () => clearTimeout(timer);
  }, [commitIdValidation.orphanedModels]);

  return (
    <GlobalThemeProvider isSubWindow={false}>
      <div className="mainwindow" data-testid="app-main-window">
        <Topbar>
          <div
            className="dl-button-container"
            title={t("minimum_hardware.model_download_status")}
          >
            <IconButton
              onClick={() => setDownloadWindowsOpen(!downloadWindowsOpen)}
              size="small"
              className="window-control"
              data-testid="model-download-toggle-button"
              sx={{
                color: assistant?.header_text_bg_color,
                padding: "8px",
                borderRadius: 0,
                "& .MuiSvgIcon-root": {
                  color: assistant?.header_text_bg_color,
                },
              }}
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </div>
          <ModalWrapper
            isOpen={isMinHWModalOpen || isNonValidHWModalOpen}
            toggleOpen={() => {
              setIsMinHWModalOpen(false);
              setIsNonValidHWModalOpen(false);
            }}
            header={
              isNonValidHWModalOpen
                ? t("non_validate_hardware.title")
                : t("minimum_hardware.title")
            }
            hideFooter={isNonValidHWModalOpen ? false : true}
            buttonName={"OK"}
            data-testid="hardware-requirements-modal"
          >
            {isNonValidHWModalOpen ? (
              <div>
                <p>{t("non_validate_hardware.part_1")}</p>
                <p>{t("non_validate_hardware.part_2")}</p>
              </div>
            ) : (
              <div>
                <p>{t("minimum_hardware.part_1")}</p>
                <p>{t("minimum_hardware.part_2")}</p>
                <ul>
                  <li>{t("minimum_hardware.part_3")}</li>
                  <li>{t("minimum_hardware.part_4")}</li>
                  <li>{t("minimum_hardware.part_5")}</li>
                  <li>{t("minimum_hardware.part_6")}</li>
                  <li>{t("minimum_hardware.part_7")}</li>
                </ul>
              </div>
            )}
          </ModalWrapper>
          {assistant.models["chat_model"] !== "chat_model" && (
            <ModelDownloader />
          )}
        </Topbar>
        <div className="appbody">
          <div className="sidebar">
            <SideBar />
          </div>
          <div className="chatbox">
            {/* Display custom UI based on currently selected workflow */}
            {renderSelectedWorkflow()}
          </div>
        </div>
        <div>
          <Status
            setIsMinHWModalOpen={setIsMinHWModalOpen}
            setIsNonValidHWModalOpen={setIsNonValidHWModalOpen}
          />
        </div>
        {/* Commit ID Alert */}
        <CommitIdAlert isOpen={isCommitIdAlertOpen} />

        <StatusNotification />
      </div>
    </GlobalThemeProvider>
  );
}

export default App;
