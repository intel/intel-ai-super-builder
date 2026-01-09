import React, { useEffect, useState, useRef, use } from "react";
import { listen } from "@tauri-apps/api/event";
import "./DragAndDrop.css";
import FileManagement from "../fileManagement/FileManagement";
import McpManagement from "../mcpManagement/McpManagement";
import Button from "@mui/material/Button";
import { FileManagementContext } from "../context/FileManagementContext";
import { ChatContext } from "../context/ChatContext";
import { useContext } from "react";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import EditNoteIcon from "@mui/icons-material/EditNote";
import CancelIcon from "@mui/icons-material/Cancel";
import ClipLoader from "react-spinners/ClipLoader";
import { useTranslation } from "react-i18next";

import useMcpStore from "../../stores/McpStore";
import useDataStore from "../../stores/DataStore";

const DragAndDrop = () => {
  const config  = useDataStore((state) => state.config);
  const mcpManagementOpen = useMcpStore((state) => state.mcpManagementOpen);
  const [isDragAndDropVisible, setDragAndDropIsVisible] = useState(true);
  const [FilePaths, setFiles] = useState([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isMcpLibraryOpen, setIsMcpLibraryOpen] = useState(false);
  const {
    uploadFiles,
    uploadFolders,
    fileResponse,
    fileStatus,
    lastModifiedFiles,
    validExtensions,
    displayFileError,
    cancelFileUpload,
  } = useContext(FileManagementContext);
  let unlistenFileDrop, unlistenFileDropHover, unlistenFileDropCancelled;
  const { isChatReady } = useContext(ChatContext);
  const [componentVisibility, setComponentVisibility] = useState(false);

  const { t } = useTranslation();

  // reference for useEffect to access current state of context
  const isChatReadyRef = useRef(isChatReady);
  useEffect(() => {
    isChatReadyRef.current = isChatReady;
  }, [isChatReady]);

  useEffect(() => {
    setComponentVisibility(config.is_admin);
  }, [config]);

  const toggleDragAndDropVisibility = () =>
    setDragAndDropIsVisible(!isDragAndDropVisible);
  const openLibrary = () => {
    setIsLibraryOpen(true);
  };
  const closeLibrary = () => setIsLibraryOpen(false);

  const openMcpLibrary = () => {
    useMcpStore.getState().openMcpManagement();
  };

  useEffect(() => {
    if (isDragAndDropVisible) {
      unlistenFileDrop = listen("tauri://drag-drop", async (event) => {
        console.log(event);
        console.log("Files dropped:", event.payload.paths);

        if (isChatReadyRef.current) {
          await uploadFiles(event.payload.paths);
        } else {
          console.log("Not ready for drag and drop yet.");
          displayFileError();
        }
      });

      unlistenFileDropCancelled = listen("tauri://drag-leave", (event) => {
        console.log("File drop cancelled");
      });
    }

    return () => {
      if (unlistenFileDrop) unlistenFileDrop.then((unlisten) => unlisten());
      if (unlistenFileDropHover)
        unlistenFileDropHover.then((unlisten) => unlisten());
      if (unlistenFileDropCancelled)
        unlistenFileDropCancelled.then((unlisten) => unlisten());
    };
  }, [isDragAndDropVisible]);

  const handleFileButtonClick = async () => {
    await uploadFiles("");
  };

  const handleFolderButtonClick = async () => {
    await uploadFolders("");
  };

  const handleCancelButtonClick = async () => {
    console.log("Cancel started");
    await cancelFileUpload();
    console.log("Cancel done");
  };

  useEffect(() => {
    console.log("FilePaths stored: ", FilePaths);
  }, [FilePaths]);

  if (!componentVisibility) {
    return null;
  }
  return (
    <div className="drag-n-drop-container">
      <div onClick={toggleDragAndDropVisibility} className="instructions" data-testid="dragdrop-toggle-button">
        <div
          className={`dragAndDropVisibility ${isDragAndDropVisible ? "" : "rotated"
            }`}
        />
        <span className="medium-text large-font">{t('draganddrop.title')}</span>
        <span className="light-text">
          {" "}
          {t('draganddrop.subtitle')}
          {" "}
        </span>
      </div>
      {isDragAndDropVisible && (
        <div className="drag-drop-area">
          <img
            className="drag-and-drop-logo"
            src="/images/dragndrop/normal_u169.png"
            alt="Drag and Drop"
          />
          <div className="drag-and-drop-files">
            <p className="dragndrop-large-text">{t("draganddrop.area")}</p>
            <p className="dragndrop-small-text">
              {/* Limit 1 GB per file <br /> */}
              {validExtensions.map((ext) => ext.toUpperCase()).join(", ")}
            </p>
          </div>


          <div className="drag-and-drop-status dragndrop-small-text error">
            {fileStatus === "completed" && (
              <p className="dragndrop-small-text">{fileResponse}</p>
            )}
            {(fileStatus === "uploading" || fileStatus === "removing" ||
              fileStatus === "stopping" || fileStatus === "start-uploading") && (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p className="dragndrop-small-text">{fileResponse}</p>
                </div>
              )}
            {(fileStatus === "uploaded" || fileStatus === "removed") && (
              <div className="completed-container">
                <p style={{ marginBottom: "5px" }}>{fileResponse}</p>
                {lastModifiedFiles && (
                  <ul style={{ marginTop: "0" }}>
                    {lastModifiedFiles.map((file, index) => (
                      <li key={index} style={{ marginLeft: "-5px" }}>
                        {file}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>


          <div className="drag-and-drop-buttons">
            {(fileStatus === "uploading") ? (
              <Button
                className="cancel-upload"
                onClick={handleCancelButtonClick}
                startIcon={<CancelIcon />}
                data-testid="dragdrop-cancel-upload-button"
              >
                Cancel
              </Button>
            ) : (
              <div className="add-buttons-group">
                <Button
                  className="add-files"
                  variant="contained"
                  onClick={handleFileButtonClick}
                  startIcon={<AddCircleIcon />}
                  disabled={!isChatReady}
                  data-testid="dragdrop-add-files-button"
                >
                  {t('draganddrop.button.fiels')}
                </Button>
                <Button
                  className="add-folders"
                  variant="contained"
                  onClick={handleFolderButtonClick}
                  startIcon={<AddCircleIcon />}
                  disabled={!isChatReady}
                  data-testid="dragdrop-add-folders-button"
                >
                  {t('draganddrop.button.folders')}
                </Button>
              </div>
            )

            }


            <Button
              className="manage-files"
              variant="contained"
              onClick={openLibrary}
              startIcon={<EditNoteIcon />}
              disabled={!isChatReady}
              data-testid="dragdrop-manage-files-button">
              <span>{t('draganddrop.button.manage')}</span>
            </Button>
            <FileManagement
              isOpen={isLibraryOpen}
              onClose={closeLibrary}
              onOpen={openLibrary}
            />
            {mcpManagementOpen && <McpManagement />}
          </div>
        </div>
      )}
    </div>
  );
};

export default DragAndDrop;
