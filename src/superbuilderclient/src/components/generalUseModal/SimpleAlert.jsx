import React, { useState, useEffect, useContext } from "react";
import "./SimpleAlert.css";
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

const SimpleAlert = ({
    isOpen=false,
    title="Title",
    content="Content",
    confirmText="Yes",
    denyText="No",
    onConfirm=()=>{},
    onDeny=()=>{},
    onClose=()=>{},
}) => {
  return (
    <Dialog
        open={isOpen}
        onClose={onClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
    >
        <DialogTitle id="alert-dialog-title">
            {title}
        </DialogTitle>
        <DialogContent>
            <DialogContentText id="alert-dialog-description">
                {content}
            </DialogContentText>
        </DialogContent>
        <DialogActions className="simple-alert-options">
            <Button onClick={onConfirm} autoFocus variant="contained" data-testid="dialog-model-switch-confirm-button">
                {confirmText}
            </Button>
            <Button onClick={onDeny} data-testid="dialog-model-switch-skip-button">
                {denyText}
            </Button>
        </DialogActions>
    </Dialog>
  );
};
export default SimpleAlert;