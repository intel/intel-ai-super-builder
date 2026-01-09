import React, { useState } from "react";
import {
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import useMcpStore from "../../stores/McpStore";
import FluidModal from "../FluidModal/FluidModal";
import useDataStore from "../../stores/DataStore";
import McpServerInfo from "./McpServerInfo";

const McpToolsDialog = () => {
  const { t } = useTranslation();
  const assistant = useDataStore((state) => state.assistant);
  const mcpToolsDialogOpen = useMcpStore((state) => state.mcpToolsDialogOpen);
  const mcpToolsDialogServerName = useMcpStore(
    (state) => state.mcpToolsDialogServerName
  );
  const mcpToolsDialogServerConfig = useMcpStore(
    (state) => state.mcpToolsDialogServerConfig
  );
  const mcpToolsDialogAgentName = useMcpStore(
    (state) => state.mcpToolsDialogAgentName
  );
  const mcpToolsDialogNeedsConfirmation = useMcpStore(
    (state) => state.mcpToolsDialogNeedsConfirmation
  );
  const mcpToolsDialogPendingServers = useMcpStore(
    (state) => state.mcpToolsDialogPendingServers
  );
  const mcpToolsDialogCurrentServerIndex = useMcpStore(
    (state) => state.mcpToolsDialogCurrentServerIndex
  );
  const mcpServerTools = useMcpStore((state) => state.mcpServerTools);
  const mcpServers = useMcpStore((state) => state.mcpServers);
  const fetchingMcpServerTools = useMcpStore(
    (state) => state.fetchingMcpServerTools
  );
  const closeMcpToolsDialog = useMcpStore((state) => state.closeMcpToolsDialog);
  const confirmMcpTools = useMcpStore((state) => state.confirmMcpTools);
  const rejectMcpTools = useMcpStore((state) => state.rejectMcpTools);

  // Local state for active tab
  const [activeTab, setActiveTab] = useState(0);

  // Calculate current server number and total for display
  const currentServerNumber = mcpToolsDialogCurrentServerIndex + 1;
  const totalServers = mcpToolsDialogPendingServers.length;

  // Reset active tab when dialog opens
  React.useEffect(() => {
    if (mcpToolsDialogOpen) {
      setActiveTab(0);
    }
  }, [mcpToolsDialogOpen]);

  const handleClose = () => {
    if (mcpToolsDialogNeedsConfirmation) {
      // If confirmation is needed, treat close as rejection
      handleReject();
    } else {
      closeMcpToolsDialog();
    }
  };

  const handleConfirm = () => {
    confirmMcpTools();
  };

  const handleReject = () => {
    rejectMcpTools();
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handlePreviousServer = () => {
    if (activeTab > 0) {
      setActiveTab(activeTab - 1);
    }
  };

  const handleNextServer = () => {
    if (activeTab < totalServers - 1) {
      setActiveTab(activeTab + 1);
    }
  };

  // Get current server info based on active tab
  const currentServerName =
    mcpToolsDialogPendingServers[activeTab] || mcpToolsDialogServerName;

  // Get current server config and tools
  const currentServerConfig = mcpServers.find(
    (server) => server.server_name === currentServerName
  );
  const currentTools = mcpServerTools[currentServerName] || [];

  return (
    <FluidModal
      open={mcpToolsDialogOpen}
      handleClose={handleClose}
      header={
        <strong style={{ color: "var(--text-primary-color)" }}> 
          {mcpToolsDialogNeedsConfirmation
            ? totalServers > 1
              ? t("mcp.tools_dialog.confirm_title_multi", {
                  total: totalServers,
                })
              : t("mcp.tools_dialog.confirm_title")
            : t("mcp.tools_dialog.title")}
        </strong>
      }
      width="60%"
      assistant={assistant}
      footer={
        <div className="mcpmodal-footer">
          {mcpToolsDialogNeedsConfirmation ? (
            <>
              <div className="button">
                <Button
                  size="m"
                  variant="text"
                  onClick={handleReject}
                  color="error"
                >
                  {t("mcp.tools_dialog.reject")}
                </Button>
              </div>
              <div className="button">
                <Button size="m" variant="contained" onClick={handleConfirm}>
                  {t("mcp.tools_dialog.confirm")}
                </Button>
              </div>
            </>
          ) : (
            <div className="button">
              <Button size="m" variant="contained" onClick={handleClose}>
                {t("mcp.tools_dialog.close")}
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div className="mcpmodal">
        <div className="mcpmodal-container">
          {mcpToolsDialogNeedsConfirmation && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {totalServers > 1
                ? t("mcp.tools_dialog.consent_message_multi", {
                    agentName: mcpToolsDialogAgentName,
                    total: totalServers,
                  })
                : t("mcp.tools_dialog.consent_message", {
                    agentName: mcpToolsDialogAgentName,
                  })}
            </Alert>
          )}

          {fetchingMcpServerTools ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: 4,
              }}
            >
              <CircularProgress />
              <Typography sx={{ marginLeft: 2 }}>
                {t("mcp.tools_dialog.loading")}
              </Typography>
            </Box>
          ) : totalServers > 1 ? (
            // Multi-server view with horizontal sliding
            <Box>
              {/* Server Navigation Header */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                  pb: 2,
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <IconButton
                  onClick={handlePreviousServer}
                  disabled={activeTab === 0}
                  sx={{
                    "&:disabled": {
                      opacity: 0.3,
                    },
                  }}
                >
                  <ChevronLeft />
                </IconButton>

                <Box sx={{ flex: 1, textAlign: "center" }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 600,
                      fontFamily: "monospace",
                      fontSize: "1rem",
                    }}
                  >
                    {currentServerName}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      display: "block",
                      mt: 0.5,
                    }}
                  >
                    {t("mcp.tools_dialog.server_indicator", {
                      current: activeTab + 1,
                      total: totalServers,
                    })}
                  </Typography>
                </Box>

                <IconButton
                  onClick={handleNextServer}
                  disabled={activeTab === totalServers - 1}
                  sx={{
                    "&:disabled": {
                      opacity: 0.3,
                    },
                  }}
                >
                  <ChevronRight />
                </IconButton>
              </Box>

              {/* Server Content */}
              <McpServerInfo
                serverName={currentServerName}
                serverConfig={currentServerConfig}
                tools={currentTools}
                isLoading={fetchingMcpServerTools}
                showServerName={false}
                show="full"
              />
            </Box>
          ) : (
            // Single server view
            <McpServerInfo
              serverName={currentServerName}
              serverConfig={currentServerConfig}
              tools={currentTools}
              isLoading={fetchingMcpServerTools}
              showServerName={true}
              show="full"
            />
          )}
        </div>
      </div>
    </FluidModal>
  );
};

export default McpToolsDialog;
