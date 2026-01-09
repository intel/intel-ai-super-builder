import React from "react";
import { Modal, Box, Button, Typography } from "@mui/material";
import "./FluidModal.css";
import AssistantLogo from "../assistantLogo/assistantLogo";
import { useTranslation } from "react-i18next";

const FluidModal = ({
  open,
  handleClose,
  children,
  header,
  assistant,
  footer,
  width = "80%",
  'data-testid': dataTestId,
}) => {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      data-testid={dataTestId}
    >
      <Box className="modal-box" sx={{ width: width }}>
        <div className="modal-header">
          <div
            className="info-logo-fluid"
            style={{
              "--logo-container-background-color": assistant?.header_bg_color,
            }}
          >
            <AssistantLogo assistant={assistant} transparentDefaultBackground={true} />
          </div>
          <Typography id="modal-title" variant="h6" component="h2">
            {header}
          </Typography>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          {footer ? (
            footer
          ) : (
            <Button
              onClick={handleClose}
              className="close-fluid-button"
              variant="contained"
              sx={{ borderRadius: "0px" }}
              data-testid={dataTestId + "-close-button"}
            >
              {t("fluidmodel.close_button")}
            </Button>
          )}
        </div>
      </Box>
    </Modal>
  );
};

export default FluidModal;
