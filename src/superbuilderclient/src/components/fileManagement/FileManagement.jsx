import React, { useState, useEffect } from 'react';
import FileTable from "./FileTable";
import "./FileManagement.css";
import Button from '@mui/material/Button';
import ArrowCircleLeft from '@mui/icons-material/ArrowCircleLeft';
import { useContext } from 'react';
import { ChatContext } from '../context/ChatContext';
import { FileManagementContext } from '../context/FileManagementContext';

import { useTranslation } from 'react-i18next';

const FileManagement = ({ isOpen, onClose, onOpen}) => {
    const { t } = useTranslation();
    const [isDisabled, setIsDisabled] = useState(true);
    const { isChatReady } = useContext(ChatContext);
    const { rows, uploadFiles, removeSelectedFiles, setSelectedFiles, updateTable, fileStatus, cancelFileUpload} = useContext(FileManagementContext);

    // Update the list of files that have been selected by the user
    const handleSelectionChange = (selectedRows) => {
        setSelectedFiles(selectedRows);
    };

    function enableRemoveButton() {
        setIsDisabled(false);
    }

    function disableRemoveButton() {
        setIsDisabled(true);
    }

    // Don't render modal if it's not open
    if (!isOpen) {
        return null;
    }
    
   return (
    <div className="fm-modal-overlay" onClick={(e) => e.stopPropagation()}>
        
        <Button variant="contained" className='close-button' onClick={onClose} data-testid="file-management-close-button">
        <ArrowCircleLeft />    {t('draganddrop.file_manage.back')}</Button>

        <div className='filebox'>
            <FileTable rows={rows} enableRemoveButton = {enableRemoveButton} disableRemoveButton = {disableRemoveButton} onSelectionChange={handleSelectionChange}/>
        </div>

        <div className='add-remove-button-container'>
            {fileStatus !== "uploading" ? (
                <Button disabled={!isChatReady} variant="contained" onClick={()=>uploadFiles("")} className="add-buttons" data-testid="file-management-add-files-button">{t('draganddrop.file_manage.add')}</Button>
            ) : 
            (
                <Button variant="contained" onClick={()=>cancelFileUpload()} className="cancel-buttons" data-testid="file-management-cancel-upload-button">{t('draganddrop.file_manage.cancel')}</Button>
            )
            }
            
            <Button id = "remove" disabled = {isDisabled || !isChatReady} variant="contained" className="remove-buttons" onClick={removeSelectedFiles} data-testid="file-management-remove-files-button"> {t('draganddrop.file_manage.remove')}</Button>      
        </div>
        
    </div>
   )

}

export default FileManagement


