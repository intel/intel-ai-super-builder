import React, { useContext } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Paper, Box, Button } from "@mui/material";
import { useTranslation } from "react-i18next";

import "./McpServerTable.css";
import useMcpStore from "../../stores/McpStore";
import { ChatContext } from "../context/ChatContext";
import {
  MCP_TABLE_STYLES,
  createTextColumn,
  generateUniqueRows,
  MCP_DATAGRID_PROPS,
  createActionButton,
} from "./mcpTableShared";

export default function McpAgentTable({ layoutMode = "vertical" }) {
  const { t } = useTranslation();
  const rawMcpAgents = useMcpStore((state) => state.mcpAgents);
  const loadingMcpAgents = useMcpStore((state) => state.loadingMcpAgents);
  const runningMcpAgents = useMcpStore((state) => state.runningMcpAgents);
  const mcpServers = useMcpStore((state) => state.mcpServers);
  const mcpRemoveModalOpen = useMcpStore((state) => state.mcpRemoveModalOpen);
  const { isChatReady, setIsChatReady } = useContext(ChatContext);

  // Use shared utility to generate unique rows
  const mcpAgents = React.useMemo(
    () => generateUniqueRows(rawMcpAgents, "name"),
    [rawMcpAgents]
  );

  // Helper function to create server IDs column
  const createServerIdsColumn = () => ({
    field: "server_ids",
    headerName: t("mcp.agent_table.mcp_server"),
    flex: 1,
    minWidth: 150,
    renderCell: (params) => {
      if (!params.value || !Array.isArray(params.value)) {
        return <Box sx={MCP_TABLE_STYLES.cellText}>{""}</Box>;
      }

      // Filter out server IDs that no longer exist
      const validServerNames = params.value
        .map((id) => {
          const server = mcpServers.find((s) => s.id === id);
          return server ? server.server_name : null;
        })
        .filter((name) => name !== null);

      if (validServerNames.length === 0) {
        return (
          <Box
            sx={{
              ...MCP_TABLE_STYLES.cellText,
              color: "#999",
              fontStyle: "italic",
            }}
          >
            {t("mcp.agent_table.no_mcpserver")}
          </Box>
        );
      }

      const names = validServerNames.join(", ");
      return <Box sx={MCP_TABLE_STYLES.cellText}>{names}</Box>;
    },
  });

  // Helper function to create actions column
  const createActionsColumn = () => ({
    field: "actions",
    headerName: t("mcp.agent_table.actions"),
    flex: 1,
    minWidth: 234,
    sortable: false,
    filterable: false,
    renderCell: (params) => {
      const isRunning = runningMcpAgents.includes(params.row.name);
      const isLoading = loadingMcpAgents.includes(params.row.name);

      return (
        <Box sx={MCP_TABLE_STYLES.actionsContainer}>
          {isRunning
            ? createActionButton(
                t("mcp.server_table.stop"),
                "mcp-table-status-btn status-btn-stop",
                !isChatReady,
                () => handleStopMcpAgent(params.row.name),
                isLoading,
                t("mcp.server_table.stopping")
              )
            : createActionButton(
                t("mcp.server_table.start"),
                "mcp-table-status-btn status-btn-start",
                !isChatReady ||
                  (params.row.server_ids && params.row.server_ids.length === 0),
                () => handleStartMcpAgent(params.row.name),
                isLoading,
                t("mcp.server_table.starting")
              )}

          {createActionButton(
            t("mcp.server_table.edit"),
            "mcp-table-status-btn",
            !isChatReady || isRunning,
            () => handleDetailsClick(params.row.id)
          )}

          {createActionButton(
            t("mcp.agent_table.remove"),
            "mcp-table-status-btn status-btn-remove",
            !isChatReady || isRunning,
            () => handleRemoveMcpAgent(params.row.id)
          )}
        </Box>
      );
    },
  });

  const handleDetailsClick = (id) => {
    const selectedAgent = mcpAgents.find((agent) => agent.id === id);
    console.log("Selected MCP Agent:", selectedAgent);
    useMcpStore.getState().openMcpAgentInput("Update");
    useMcpStore.getState().setMcpAgentInput({
      id: selectedAgent.id,
      agentName: selectedAgent.name || "",
      description: selectedAgent.desc || "",
      systemMessage: selectedAgent.message || "",
      mcpServerIds: selectedAgent.server_ids || []
    });
  };

  const handleRemoveMcpAgent = (id) => {
    setIsChatReady(false);
    const selectedAgent = mcpAgents.find((agent) => agent.id === id);
    useMcpStore.getState().setSelectedMcpAgent([selectedAgent]);
    useMcpStore.getState().setMcpRemoveType("agent");
    useMcpStore.getState().setMcpRemoveModalOpen(true);
    setIsChatReady(true);
  };

  const handleStartMcpAgent = async (name) => {
    setIsChatReady(false);
    await useMcpStore.getState().startMcpAgent(name);
    setIsChatReady(true);
  };

  const handleStopMcpAgent = async (name) => {
    setIsChatReady(false);
    await useMcpStore.getState().stopMcpAgent(name);
    setIsChatReady(true);
  };

  const commandColumns = React.useMemo(
    () => [
      createTextColumn("name", t("mcp.agent_table.agent_name"), 0.5, 120),
      createTextColumn("desc", t("mcp.agent_table.agent_description"), 1, 150),
      createTextColumn("message", t("mcp.agent_table.system_prompt"), 1, 200),
      createServerIdsColumn(),
      createActionsColumn(),
    ],
    [t, mcpServers, runningMcpAgents, loadingMcpAgents, isChatReady]
  );

  const paperStyle =
    layoutMode === "horizontal"
      ? MCP_TABLE_STYLES.paperHorizontal
      : MCP_TABLE_STYLES.paper;
  const dataGridStyle =
    layoutMode === "horizontal"
      ? MCP_TABLE_STYLES.dataGridHorizontal
      : MCP_TABLE_STYLES.dataGrid;

  return (
    <Box sx={MCP_TABLE_STYLES.container}>
      <Paper sx={paperStyle}>
        <DataGrid
          rows={mcpAgents}
          columns={commandColumns}
          onRowDoubleClick={(params) => handleDetailsClick(params.row.id)}
          sx={dataGridStyle}
          {...MCP_DATAGRID_PROPS}
        />
      </Paper>
    </Box>
  );
}
