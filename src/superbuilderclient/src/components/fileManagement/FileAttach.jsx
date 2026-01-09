import React, { useState, useEffect, useContext, useRef } from "react";
import "./FileAttach.css";
import Button from '@mui/material/Button';
import { FileManagementContext } from "../context/FileManagementContext";

const FileAttach = ({validExtensions, fileLimit=-1, onFilesSelected, disable=false}) => {
    const { openFileDialog } = useContext(FileManagementContext);
    const [ selectingFiles, setSelectingFiles ] = useState(false); // is the user currently selecting a file
    const [ selectedFiles, setSelectedFiles ] = useState([]); // list of file paths
    const [ selectedFileNames, setSelectedFileNames ] = useState(""); // list of file names
    const [ fileError, setFileError ] = useState(""); // displayed error if file attachment fails
    
    /**
     * Allows user to select files and returns list of filepaths selected.
     * List size is limited to a given fileLimit (if specified)
     */
    const selectFile = async () => {
        setSelectingFiles(true);
        let filepaths = await openFileDialog(validExtensions); // open file dialog
        if (!filepaths) {
            filepaths = []; // clear previous selected files if cancel
        }
        // cutoff files exceeding limit
        if (fileLimit > -1 && filepaths.length > fileLimit) {
            filepaths = filepaths.splice(0, fileLimit);
            setFileError(`Maximum of ${fileLimit} file(s) allowed.`);
        } else {
            setFileError("");
        }
        setSelectedFiles(filepaths);
        setSelectedFileNames(getAttachedFileNames(filepaths));
        if (onFilesSelected) {
            onFilesSelected(filepaths); // send callback to parent
        }
        setSelectingFiles(false);
    };

    /**
     * Given a list of file paths, returns a corresponding list of file names
     */
    const getAttachedFileNames = (filepaths) => {
        if (!filepaths || filepaths.length <= 0) {
            return "";
        }
        let filepathNames = filepaths.map((filepath) => getFileName(filepath, 50)).join(", ");
        return filepaths.length + " selected file(s): " + filepathNames;
    };

    /**
     * Given a filepath return the file name.
     * If the name exceeds a given length limit then splice and add an ellipsis (...)
     */
    const getFileName = (filepath, lengthLimit = 0) => {
        let filepathSplit = filepath.split("\\");
        let fileName = filepathSplit[filepathSplit.length - 1];
        if (fileName.length <= lengthLimit) {
            return fileName;
        }
        return fileName.substring(0, lengthLimit) + "...";
    };

    return (
        <div className="file-container">
            <div className="file-attach-container">
                <img
                    className="drag-and-drop-logo"
                    src="/images/dragndrop/normal_u169.png"
                    alt="Drag and Drop"
                />
                <div className="file-attach-names">
                    {selectedFileNames === "" ? (
                        <p>
                            Allowed file types: 
                            <br/> 
                            {validExtensions.map((ext) => ext.toUpperCase()).join(", ")}
                        </p>
                    ):
                    (
                        <p>
                            {selectedFileNames}
                        </p>
                    )}
                </div>
                <Button
                    variant="contained"
                    onClick={() => selectFile()}
                    disabled={selectingFiles || disable}
                    data-testid="file-attach-button"
                >
                    Attach Files
                </Button>
            </div>
            <div className="file-attach-error">{fileError}</div>
        </div>
    );
};

export default FileAttach;