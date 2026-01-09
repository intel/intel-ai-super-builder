import * as React from 'react';
import AssistantLogo from "../assistantLogo/assistantLogo";
import "./generalUseModal.css";
import { useRef, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import useDataStore from "../../stores/DataStore";

const ModalWrapper = ({
  children,
  isOpen,
  toggleOpen,  // This prop is crucial for closing
  header,
  buttonName,
  hideFooter,
  footerContent,
  'data-testid': dataTestId,
}) => {
  const { assistant } = useDataStore();
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [children]);

  const close = () => {
    toggleOpen(false);
  };


  const defaultFooter = (
    <div className={hideFooter ? "no-footer" : "info-footer"}>
      <Button className="footer-button" variant="contained" onClick={close} sx={{borderRadius:"0px"}} data-testid="modalwrapper-close-button">
        {buttonName}
      </Button>
    </div>
  );

  return (
    <Dialog
      open={isOpen}
      onClose={(event, reason) => {
        if (
          reason === "backdropClick" ||
          reason === "escapeKeyDown" ||
          (event?.target && document.getElementById("app-topbar")?.contains(event.target))
        ) {
          return;
        }
        close();
      }}
      scroll="paper"
      maxWidth="md"
      data-testid={dataTestId}
    >
      <DialogTitle className="info-header" id="scroll-dialog-title" sx={{ p: 0 }}>
        <div className="info-logo"
        style={{
          "--logo-container-background-color":
            assistant?.header_bg_color,
        }}>
          <AssistantLogo transparentDefaultBackground={true} />
        </div>
        <span className="info-title">
          {header}
        </span>
      </DialogTitle>

      <DialogContent className="info-content" dividers={scroll === 'paper'}>
        {children}

      </DialogContent>
      <DialogActions className="dialog-actions">
        {footerContent || defaultFooter}
      </DialogActions>
    </Dialog>
  );
};

export default ModalWrapper;
