import { createContext, useContext, useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { stat } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
import { RagReadyContext } from "./RagReadyContext";
import { readDir } from "@tauri-apps/plugin-fs";
import { join } from '@tauri-apps/api/path';
import { useTranslation } from 'react-i18next';
import { AppStatusContext } from "./AppStatusContext";

function createData(id, name, created, modified, added, type, size, status, path, embedded) {
  return {
    id,
    name,
    created,
    modified,
    added,
    type,
    size,
    status,
    path,
    embedded,
  };
}

class fileEntry {
  constructor(id, name, created, modified, added, type, size, status, dirPath, embedded) {
    this.id = id;
    this.name = name;
    this.dirPath = dirPath;
    if (status != "") {
      this.status = status;
    } else {
      this.status = "not_ready";
    }
    this.created = created;
    this.modified = modified;
    this.added = added;
    this.type = type;
    this.size = size;
    this.embedded = embedded;
  }

  createDataFromObject() {
    return createData(
      this.id,
      this.name,
      this.created.toString(),
      this.modified.toString(),
      this.added.toString(),
      this.type,
      this.size,
      this.status,
      this.dirPath,
      this.embedded,
    );
  }
}

const FileManagementContext = createContext({
  ready: false,
  setReady: () => {},
});

const FileManagementProvider = ({ children }) => {
  const { t } = useTranslation();
  const [rows, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [completedFiles, setCompletedFiles] = useState([]);
  const [fileStatus, setFileStatus] = useState("completed");
  const [currentFileProgress, setCurrentFileProgress] = useState(0); // current file upload progress out of 100
  const [currentFile, setCurrentFile] = useState(""); // current file being uploaded
  const [fileResponse, setFileResponse] = useState("");
  const [lastModifiedFiles, setlastModifiedFiles] = useState([]); // most recently deleted or added files
  const { setIsAppReady : setIsChatReady  } = useContext(AppStatusContext);
  const [filesLoaded, setFilesLoaded] = useState(false); // keep track of when vectordb files are loaded and ready for display
  const validExtensions = ["pdf", "docx", "txt", "md", "pptx", "xlsx", "csv"];
  const uploadingFilesCount = useRef(0); // keep track of how many files attempted to be uploaded
  const uploadCanceling = useRef(false); // keep track of upload cancel inside event listener
  const { ready: ragReady } = useContext(RagReadyContext);

  const createRows = async (fileList, status, start_id) => {
    // construct row objects for each file given in file list
    let newRows = [];
    for (let i = 0; i < fileList.length; i++) {
      let filePath = fileList[i][0]; // get the filepath (key)
      let storedMetadata = fileList[i][1]; // get any metadata associated with the file
      let fileName = getFileName(filePath);
      let createdAt = "";
      let modifiedAt = "";
      let addedAt = new Date().toISOString();
      let fileSize = 0;
      let fileType = filePath
        .substring(filePath.lastIndexOf(".") + 1, filePath.length)
        .toLowerCase();
      let fileDir = getFilePath(filePath);
      let embedded = storedMetadata.embedded != null ? storedMetadata.embedded : true; // assume the file was embedded in vectordb unless metadata says otherwise;
      try {
        // Attempt to extract metdata from file store, read current metadata as a backup in case not stored
        let currentMetadata = await stat(filePath);
        // console.log(currentMetadata);
        // console.log("Stored Metadata: ", storedMetadata);
        modifiedAt = storedMetadata.modified || currentMetadata.mtime.toString();
        createdAt = storedMetadata.created || currentMetadata.birthtime.toString();
        fileSize = storedMetadata.size || currentMetadata.size.toString();
        addedAt = storedMetadata.date_added || currentMetadata.birthtime.toISOString(); // use the date created as a backup if date added not found
        fileType = storedMetadata.type || fileType;
      } catch (error) {
        console.log("Error reading file " + fileName + " at path " + filePath);
      }

      if (fileName != "") {
        const fileData = new fileEntry(
          fileDir + fileName, // unique id is full path
          fileName,
          createdAt,
          modifiedAt,
          addedAt,
          fileType,
          fileSize,
          status,
          fileDir,
          embedded
        );
        let newData = fileData.createDataFromObject();
        newRows.push(newData);
      }
    }
    return newRows;
  };

  const updateTable = async () => {
    console.log("Updating Table....");

    try {
      // get the file list data and split into 3 lists
      const fileListJSON = await invoke("get_file_list");
      // console.log("Files JSON: ", fileListJSON);
      
      // Check if the response is an error message
      if (fileListJSON.startsWith("ERROR:")) {
        console.error("Backend returned error:", fileListJSON);
        setFiles([]);
        setCompletedFiles([]);
        setFilesLoaded(true);
        return;
      }
      
      const fileList = JSON.parse(fileListJSON);
      console.log("Files: ", fileList);

      const completedFileRows = await createRows(fileList, "ready", 0);
      setCompletedFiles(completedFileRows);
      setFiles(completedFileRows);
      // console.log(completedFileRows);

      setSelectedFiles([]); // clear all selected items in the table
      setFilesLoaded(true); // files are ready for display (if not already true)
    } catch (error) {
      console.error("Failed to update file table:", error);
      setFiles([]);
      setCompletedFiles([]);
      setFilesLoaded(true);
    }
  };

  const isValidExtension = (filepath, allowedTypes) => {
    const ext = filepath.split(".").pop().toLowerCase();
    return allowedTypes.map((ext) => ext.toLowerCase()).includes(ext);
  };

  const displayFileError = () => {
    setFileResponse(
      t('draganddrop.file_manage.resp_display_file_error')
    );
    setFileStatus("completed");
  };

  const cancelFileUpload = async () => {
    if (fileStatus !== "uploading") {
      console.log("Files are not being uploaded, nothing to cancel.");
      return;
    }
    console.log("Canceling file upload...");
    uploadCanceling.current = true; // since the event listener can't access fileStatus
    setFileStatus("stopping");
    setFileResponse(
      t('draganddrop.file_manage.resp_cancel_file_upload')
    );
    await invoke("stop_upload_file"); // send cancel signal to upload file backend
    uploadCanceling.current = false; // reset flag
    console.log("File upload canceled.");
  };

  const requestFiles = async (allowedTypes=[]) => {
    setIsChatReady(false);
    const validExt = allowedTypes.length > 0 ? allowedTypes : validExtensions // use all valid file types if none specified
    let filepaths;
    // Check for mocked file paths for testing purposes as Windows file dialog cannot be automated
    if (window.__TEST_MOCK_PATHS__) {
        console.log("[Test] Using mocked file paths:", window.__TEST_MOCK_PATHS__);
        filepaths = window.__TEST_MOCK_PATHS__;
        window.__TEST_MOCK_PATHS__ = null; 
    } else {
        filepaths = await open({
            title: t('draganddrop.file_manage.add_file_window_title'),
            multiple: true,
            directory: false,
            filters: [{ name: "Files", extensions: validExt }],
        });
    }
    setIsChatReady(true);
    return filepaths;
  };

  const uploadFiles = async (initFilePaths, allowedTypes=[], uploadType="") => {
    if (initFilePaths.length <= 0) {
      console.log("Files uploaded were not valid files, exiting...");
      return null;
    }
    setIsChatReady(false);
    let filepaths = [];
    let uploadedFilepaths = [];
    const validExt = allowedTypes.length > 0 ? allowedTypes : validExtensions // use all valid file types if none specified
    try {
      uploadingFilesCount.current = initFilePaths.length;
      console.log("Filtering files by extension...", initFilePaths);
      initFilePaths.forEach((filePath) => {
        if (isValidExtension(filePath, validExt)) {
          filepaths.push(filePath);
        }
      });
      console.log(filepaths);
      if (filepaths) {
        setFileResponse(t('draganddrop.file_manage.resp_upload_files_preparing'));
        setFileStatus("start-uploading");
        setlastModifiedFiles([]);
        const uploadFileResponse = await invoke("upload_file", { paths: JSON.stringify(filepaths), uploadMethod: uploadType }); // upload files (will send back a stream)
        uploadedFilepaths = JSON.parse(uploadFileResponse);
        await updateTable(); // refresh table
      }
    } catch (error) {
      console.error("Error in adding file(s):", error);
      setIsChatReady(true);
    }
    setIsChatReady(true);
    return uploadedFilepaths; // return the files that were able to be uploaded
  };

  // returns list of all filepaths in given folder path, recursive true will navigate through subfolders
  const getFilesInFolder = async (parent, entries, recursive) => {
    let filepaths = [];
    for (const entry of entries) {
      // console.log(`Entry: ${entry.name}`);
      const entryPath = await join(parent, entry.name);
      if (entry.isFile) {
        filepaths.push(entryPath); // entry is a file so append to filepath list
      }
      else if (entry.isDirectory && recursive) {
        const recursiveDir = await readDir(entryPath);
        getFilesInFolder(entryPath, recursiveDir, recursive);
      }
    }
    return filepaths;
  };

  // Separate from uploadFiles in case we want to display differently on FileManagement UI
  // If uploadSubfolders set to true, will upload any valid files in subfolders of the current path
  const uploadFolders = async (initFolderPaths, uploadSubfolders = false, uploadType="") => {
    setIsChatReady(false); // prevent chat or file requests
    try {
      // needs a check for repeat file loading
      let folderpaths = [];
      if (initFolderPaths == "") {
        folderpaths = await open({
          title: t('draganddrop.file_manage.add_folder_window_title'),
          multiple: true,
          directory: true,
        });
      } else {
        folderpaths = initFolderPaths;
      }

      // exit if user did not select files
      if (folderpaths == null || folderpaths.length <= 0) {
        console.log("No folders were selected, exiting...");
        setIsChatReady(true); // allow chat and file requests
        return;
      }

      console.log(folderpaths);

      // Get all filepaths in each folder path selected
      let filepaths = [];
      for (const folderpath of folderpaths) {
        const entries = await readDir(folderpath); // get all file entries (recursively if selected)
        let currentFolderFiles = await getFilesInFolder(
          folderpath,
          entries,
          uploadSubfolders
        ); // get a list of all files, including subfolder files if recursive=true
        filepaths.push(...currentFolderFiles); // merge list with other folder files
      }

      if (filepaths && filepaths.length > 0) {
        console.log("Uploading files found in folder paths: ", filepaths);
        await uploadFiles(filepaths, [], uploadType); // send in file paths to upload file and let it filter valid files
      } else {
        console.log("No files found in folder paths: ", folderpaths);
      }
    } catch (error) {
      console.error("Error in adding folder(s):", error);
      setIsChatReady(true); // allow chat and file requests
      return error;
    }
    setIsChatReady(true); // allow chat and file requests
  };

  // Remove all files that have been selected by the user
  const removeSelectedFiles = async () => {
    setIsChatReady(false); // prevent chat or file requests
    const readyFiles = selectedFiles.filter((file) => file.status === "ready"); // only call remove files API on files that were able to be uploaded
    // change all selected files status to pending so user knows removal is in progress
    readyFiles.forEach((file) => {
      file.status = "not_ready";
    });
    setlastModifiedFiles([]);
    setFileResponse(t('draganddrop.file_manage.resp_removing_selected_files'));
    setFileStatus("removing");
    await invoke("remove_file", {
      files: JSON.stringify(readyFiles.map((file) => file.path + file.name)),
    });
    await updateTable(); // update the table with the list of files after removal
    const removedFiles = readyFiles.map((file) => file.path + file.name);
    setlastModifiedFiles(removedFiles);
    setFileResponse(t('draganddrop.file_manage.resp_removed_selected_files'));
    setFileStatus("removed");
    setSelectedFiles([]); // clear all selections
    setIsChatReady(true); // allow chat or file requests
  };

  // Remove a set of given filepaths
  const removeFiles = async (filepaths) => {
    setIsChatReady(false); // prevent chat or file requests
    setlastModifiedFiles([]);
    setFileResponse(t('draganddrop.file_manage.resp_removing_selected_files'));
    setFileStatus("removing");
    await invoke("remove_file", {
      files: JSON.stringify(filepaths),
    });
    await updateTable(); // update the table with the list of files after removal
    setlastModifiedFiles(filepaths);
    setFileResponse(t('draganddrop.file_manage.resp_removed_selected_files'));
    setFileStatus("removed");
    setSelectedFiles([]); // clear all selections
    setIsChatReady(true); // allow chat or file requests
  }

  // Run when the client is ready
  useEffect(() => {
    if (ragReady) {
      updateTable(); // get the current file list on client ready
    }
  }, [ragReady]);

  useEffect(() => {
    let isSubscribed = true;

    // Subscribe to upload file progress event
    let unlistenData;
    const setupDataListener = async () => {
      unlistenData = await listen("upload-progress", (event) => {
        // Do not update messages if the component has been removed.
        if (!isSubscribed) {
          return;
        }
        const {
          files_uploaded,
          current_file_uploading,
          current_file_progress,
        } = event.payload;
        setCurrentFile(current_file_uploading);
        setCurrentFileProgress(current_file_progress);
        // prevents stopping status from being replaced with uploading again
        if (uploadCanceling.current === false) {
          setFileStatus("uploading"); // upload actually started so set to uploading
        }
      });
    };
    setupDataListener();

    // Subscribe to upload file completion event
    let unlistenCompleted;
    const setupCompletedListener = async () => {
      unlistenCompleted = await listen("upload-completed", (event) => {
        // Do not update the state if the component has been removed.
        if (!isSubscribed) {
          return;
        }
        console.log("Files Added: ", event.payload);
        if (
          event.payload ===
          "ERROR: Could not get response. Backend service may not be available."
        ) {
          setFileResponse(
            t('draganddrop.file_manage.resp_upload_completed_1')
          );
          setFileStatus("completed");
        } else if (event.payload !== "" && event.payload !== "[]") {
          const uploadedFilesList = JSON.parse(event.payload);
          setlastModifiedFiles(uploadedFilesList);
          // Different response depending on if some files failed to upload
          if (uploadedFilesList.length === uploadingFilesCount.current) {
            setFileResponse("Files added:");
          } else {
            setFileResponse(
              t('draganddrop.file_manage.resp_upload_completed_2')
            );
          }
          setFileStatus("uploaded");
        } else {
          setFileResponse(
            t('draganddrop.file_manage.resp_upload_completed_3')
          );
          setFileStatus("completed");
        }
        setCurrentFile("");
        setCurrentFileProgress(0);
      });
    };
    setupCompletedListener();

    return () => {
      isSubscribed = false;
      if (unlistenData) unlistenData();
      if (unlistenCompleted) unlistenCompleted();
    };
  }, []);

  function getFileName(filePath) {
    return filePath.substring(filePath.lastIndexOf("\\") + 1, filePath.length);
  }
  function getFilePath(filePath) {
    return filePath.substring(0, filePath.lastIndexOf("\\") + 1);
  }

  /**
   * Opens file dialog and returns selected files by user
   * @param {*} validExtensions List of valid file extension types
   * @returns List of filepaths selected by user, or null if cancelled
   */
  const openFileDialog = async (validExtensions=["pdf"]) => {
      let filepaths = await open({
          title: "Select file(s)",
          multiple: true,
          directory: false,
          filters: [
              {
              name: "Files",
              extensions: validExtensions, // Filter by extension
              },
          ],
      });
      return filepaths
  };

  return (
    <FileManagementContext.Provider
      value={{
        rows,
        completedFiles,
        uploadFiles,
        uploadFolders,
        cancelFileUpload,
        removeSelectedFiles,
        setSelectedFiles,
        updateTable,
        fileStatus,
        fileResponse,
        lastModifiedFiles,
        validExtensions,
        displayFileError,
        filesLoaded,
        setFilesLoaded,
        removeFiles,
        currentFile,
        currentFileProgress,
        openFileDialog,
        requestFiles,
      }}
    >
      {children}
    </FileManagementContext.Provider>
  );
};

export { FileManagementContext, FileManagementProvider };
