import React, { useContext, useEffect, useState } from "react";
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
} from "./mcpTableShared";

export default function McpServerTable({ layoutMode = "vertical" }) {
  const { t } = useTranslation();
  const rawMcpServers = useMcpStore((state) => state.mcpServers);
  const selectedMcpServer = useMcpStore((state) => state.selectedMcpServer);
  const runningMcpServers = useMcpStore((state) => state.runningMcpServers);
  const loadingMcpServers = useMcpStore((state) => state.loadingMcpServers);
  const { isChatReady, setIsChatReady } = useContext(ChatContext);

  const [rowSelectionModel, setRowSelectionModel] = useState({
    type: "include",
    ids: new Set(),
  });

  // Use shared utility to generate unique rows
  const mcpServers = React.useMemo(
    () => generateUniqueRows(rawMcpServers, "server_name"),
    [rawMcpServers]
  );

  // Helper function to create actions column
  const createActionsColumn = () => ({
    field: "actions",
    headerName: t("mcp.server_table.actions"),
    flex: 1,
    minWidth: 175,
    sortable: false,
    filterable: false,
    renderCell: (params) => {
      const isWide = window.innerWidth > 1330;
      const loadingPosition = isWide ? "end" : "center";
      return (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            height: "100%",
            width: "100%",
          }}
        >
          <Button
            size="small"
            variant="contained"
            className="mcp-table-status-btn"
            disabled={
              !isChatReady ||
              loadingMcpServers.includes(params.row.server_name) ||
              runningMcpServers.includes(params.row.server_name)
            }
            sx={{ marginLeft: 1 }}
            onClick={() => handleDetailsClick(params.row.id)}
          >
            {t("mcp.server_table.edit")}
          </Button>
        </Box>
      );
    },
  });

  useEffect(() => {
    // Initialize row selection model with empty set
    if (selectedMcpServer.length == 0) {
      setRowSelectionModel({ type: "include", ids: new Set() });
    }
  }, [selectedMcpServer]);

  const handleSelectionChange = (selectionModel) => {
    console.debug("Selection Model:", selectionModel);
    setRowSelectionModel(selectionModel);

    let selectedIds;

    // Handle different selection model formats
    if (selectionModel.type === "exclude") {
      // When "select all" is used, we get {type: 'exclude', ids: Set()}
      // This means select all rows except those in the ids Set
      selectedIds = mcpServers
        .filter((server) => !selectionModel.ids.has(server.id))
        .map((server) => server.id);
    } else {
      // Normal selection - {type: 'include', ids: Set()}
      selectedIds = Array.from(selectionModel.ids);
    }

    console.debug("Selected MCP Server IDs:", selectedIds);
    useMcpStore.getState().setSelectedMcpServerId(selectedIds);

    const selectedServers = mcpServers.filter((server) =>
      selectedIds.includes(server.id)
    );
    console.debug("Selected MCP Servers:", selectedServers);
    useMcpStore.getState().setSelectedMcpServer(selectedServers);
  };

  const handleDetailsClick = (id) => {
    const selectedServer = mcpServers.find((server) => server.id === id);
    console.log("Selected MCP Server for details:", selectedServer);
    useMcpStore
      .getState()
      .openMcpInput("Update", selectedServer.url === "" ? "command" : "url");
    useMcpStore.getState().setMcpInput({
      mcpServerId: selectedServer.id,
      mcpServerName: selectedServer.server_name || "",
      mcpServerUrl: selectedServer.url || "",
      mcpServerEnv: selectedServer.env || "",
      mcpServerCommand: selectedServer.command || "",
      mcpServerCommandArgs: selectedServer.args || "",
      mcpServerDisabled: selectedServer.disabled || false,
    });
    if (runningMcpServers.includes(selectedServer.server_name)) {
      useMcpStore.getState().getMcpServerTools(selectedServer.server_name);
    }
  };

  const handleStartMcpServer = async (name) => {
    setIsChatReady(false);
    await useMcpStore.getState().startMcpServers(name);
    setIsChatReady(true);
  };

  const handleStopMcpServer = async (name) => {
    setIsChatReady(false);
    await useMcpStore.getState().stopMcpServers(name);
    setIsChatReady(true);
  };

  const commandColumns = React.useMemo(
    () => [
      createTextColumn("server_name", t("mcp.server_table.name"), 0.5, 120),
      createTextColumn("command", t("mcp.server_table.command"), 0.6, 150),
      createTextColumn("args", t("mcp.server_table.command_args"), 1, 200),
      createTextColumn("url", t("mcp.server_table.url"), 1, 200),
      createTextColumn("env", t("mcp.server_table.env"), 0.7, 150),
      createActionsColumn(),
    ],
    [t, runningMcpServers, loadingMcpServers, isChatReady]
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
          rows={mcpServers}
          columns={commandColumns}
          onRowDoubleClick={(params) => handleDetailsClick(params.row.id)}
          checkboxSelection
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={(newRowSelectionModel) => {
            handleSelectionChange(newRowSelectionModel);
          }}
          sx={dataGridStyle}
          {...MCP_DATAGRID_PROPS}
        />
      </Paper>
    </Box>
  );
}
