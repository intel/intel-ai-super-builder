import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Button,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { useTranslation } from "react-i18next";
import useMcpStore from "../../stores/McpStore";
import useAppStore from "../../stores/AppStore";
import { ChatContext } from "../context/ChatContext";
import {
  useMarketplaceProvider,
  MARKETPLACE_PROVIDERS,
} from "../../hooks/useMarketPlaceProvider";
import McpMarketPlaceProviderSelector from "./McpMarketPlaceProviderSelector";
import ModelScopeGrid from "./ModelScopeGrid";
import DockerHubGrid from "./DockerHubGrid";
import "./McpMarketPlace.css";

const McpMarketPlace = ({ isOpen = false, onClose = () => {} }) => {
  const { t } = useTranslation();
  const { isChatReady, setIsChatReady } = useContext(ChatContext);
  const mcpServers = useMcpStore((state) => state.mcpServers);
  const runningMcpServers = useMcpStore((state) => state.runningMcpServers);
  const loadingMcpServers = useMcpStore((state) => state.loadingMcpServers);

  const marketplaceServers = useMcpStore((state) => state.marketplaceServers);
  const marketplaceLoading = useMcpStore((state) => state.marketplaceLoading);
  const getMarketplaceServers = useMcpStore(
    (state) => state.getMarketplaceServers
  );

  const [processingItems, setProcessingItems] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const { selectedProvider, handleProviderChange, providers } =
    useMarketplaceProvider();

  // Filter servers based on search query
  const filteredServers = marketplaceServers.filter((item) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(query) ||
      item.chineseName?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.chineseDescription?.toLowerCase().includes(query) ||
      item.publisher?.toLowerCase().includes(query) ||
      item.keywords?.some((keyword) => keyword.toLowerCase().includes(query))
    );
  });

  // Fetch marketplace items from API
  useEffect(() => {
    if (isOpen) {
      if (selectedProvider === MARKETPLACE_PROVIDERS.MODELSCOPE) {
        getMarketplaceServers(1, 100, "", "", false);
      } else if (selectedProvider === MARKETPLACE_PROVIDERS.DOCKERHUB) {
      }
    }
  }, [isOpen, selectedProvider, getMarketplaceServers]);

  const handleClose = () => {
    // Close the marketplace and open MCP Management
    useMcpStore.getState().closeMcpMarketplace();
    useMcpStore.getState().openMcpManagement();
  };

  const handleAdd = async (item) => {
    if (!isChatReady) return;

    setProcessingItems((prev) => new Set(prev).add(item.id));
    setIsChatReady(false);

    try {
      console.debug("Getting Mcp server info to add:", item.name);

      const serverinfo = await useMcpStore
        .getState()
        .getModelScopeMcpServerById(item.id);

      if (serverinfo?.length > 0) {
        await Promise.all(
          serverinfo.map(async (serverConfig) => {
            // Generate unique server name to avoid conflicts
            const uniqueServerName = useMcpStore
              .getState()
              .generateMcpServerName(serverConfig.name, item.id);
            console.debug(
              "Adding MCP Server:",
              uniqueServerName,
              "(original:",
              serverConfig.name,
              ")"
            );

            // Set the input for the server
            useMcpStore.getState().setMcpInput({
              mcpServerName: uniqueServerName,
              mcpServerCommand: serverConfig.command,
              mcpServerCommandArgs: serverConfig.args ? serverConfig.args : [],
              mcpServerUrl: serverConfig.url ? serverConfig.url : "",
              mcpServerEnv: serverConfig.env ? serverConfig.env : "",
              mcpServerDisabled: false,
            });

            const response = await useMcpStore.getState().addMcpServer();

            if (response) {
              useAppStore
                .getState()
                .showNotification(
                  `Successfully added "${uniqueServerName}"`,
                  "success"
                );
            }
          })
        );
      }
    } catch (error) {
      console.error("Failed to add MCP Server:", error);
      useAppStore
        .getState()
        .showNotification(`Failed to add "${item.name}": ${error}`, "error");
    } finally {
      setProcessingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
      setIsChatReady(true);
    }
  };
  const handleRemove = async (item) => {
    if (!isChatReady) return;

    setProcessingItems((prev) => new Set(prev).add(item.id));
    setIsChatReady(false);

    try {
      console.debug("Removing MCP Server:", item.name);

      // Get the actual server configurations for this marketplace item
      const marketplaceServersById =
        useMcpStore.getState().marketplaceServersById;
      let serverConfigs = marketplaceServersById[item.id];

      // If not cached, fetch the server details
      if (!serverConfigs || serverConfigs.length === 0) {
        console.debug("Fetching server details for remove:", item.id);
        serverConfigs = await useMcpStore
          .getState()
          .getModelScopeMcpServerById(item.id);
      }

      if (!serverConfigs || serverConfigs.length === 0) {
        throw new Error(
          "Could not determine server configurations for this marketplace item"
        );
      }

      // Find all added servers that belong to this marketplace item
      const serversToRemove = [];
      const runningServers = [];

      for (const serverConfig of serverConfigs) {
        // Generate the unique server name that was used during adding
        const uniqueServerName = useMcpStore
          .getState()
          .generateMcpServerName(serverConfig.name, item.id);

        const addedServer = mcpServers.find(
          (server) => server.server_name === uniqueServerName
        );

        if (addedServer) {
          // Check if this server is running
          if (runningMcpServers.includes(uniqueServerName)) {
            runningServers.push(uniqueServerName);
          } else {
            serversToRemove.push(addedServer);
          }
        }
      }

      // Check if any servers are running
      if (runningServers.length > 0) {
        useAppStore
          .getState()
          .showNotification(
            `Cannot remove "${
              item.name
            }". The following servers are running: ${runningServers.join(
              ", "
            )}. Please stop them first.`,
            "warning"
          );
        return;
      }

      // Check if there are any servers to remove
      if (serversToRemove.length === 0) {
        useAppStore
          .getState()
          .showNotification(
            `No added servers found for "${item.name}"`,
            "info"
          );
        return;
      }

      // Remove all servers for this marketplace item
      console.debug(
        `Removing ${serversToRemove.length} server(s) for ${item.name}:`,
        serversToRemove.map((s) => s.server_name)
      );

      // Set selected servers for removal
      useMcpStore.getState().setSelectedMcpServer(serversToRemove);
      useMcpStore
        .getState()
        .setSelectedMcpServerId(serversToRemove.map((s) => s.id));

      const response = await useMcpStore.getState().removeMcpServer();

      if (response) {
        useAppStore
          .getState()
          .showNotification(
            `Successfully removed "${item.name}" (${
              serversToRemove.length
            } server${serversToRemove.length > 1 ? "s" : ""})`,
            "success"
          );
        // Refresh the local server list which will also update marketplace removed status
        await useMcpStore.getState().getLocalMcpServers();
      }
    } catch (error) {
      console.error("Failed to remove MCP Server:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to remove "${item.name}": ${error.message || error}`,
          "error"
        );
    } finally {
      setProcessingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
      setIsChatReady(true);
    }
  };

  const handleRefresh = () => {
    // Force refresh - bypass cache
    getMarketplaceServers(1, 100, "", "", true);
    useMcpStore.getState().getLocalMcpServers();
  };

  return (
    <div className={`marketplace-panel ${isOpen ? "open" : ""}`}>
      <Box className="marketplace-container">
        {/* Header */}
        <Box className="marketplace-header">
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h5" component="h1" color="text.primary">
              {t("mcp.marketplace.title", "MCP Marketplace")}
            </Typography>
            {/* Provider Selector */}
            <McpMarketPlaceProviderSelector
              selectedProvider={selectedProvider}
              onProviderChange={handleProviderChange}
              disabled={marketplaceLoading}
            />
          </Box>

          {/* Search Bar */}
          <Box className="marketplace-search-container">
            <TextField
              size="small"
              placeholder={t("mcp.marketplace.search", "Search...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: "100%",
                "& .MuiOutlinedInput-root": {
                  backgroundColor:
                    "var(--bg-secondary-color, rgba(0, 0, 0, 0.02))",
                  fontSize: "0.875rem",
                },
              }}
            />
            {!marketplaceLoading && searchQuery && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: "block" }}
              >
                {t(
                  "mcp.marketplace.showing_results",
                  `Showing ${filteredServers.length} of ${marketplaceServers.length} items`
                )}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
            <Tooltip title={t("mcp.marketplace.refresh", "Refresh")}>
              <IconButton
                onClick={handleRefresh}
                disabled={marketplaceLoading}
                color="primary"
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={t("mcp.marketplace.close", "Close")}>
              <IconButton onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Content */}
        <Box className="marketplace-content">
          {/* Loading State */}
          {marketplaceLoading && (
            <Box className="marketplace-loading">
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>
                {t("mcp.marketplace.loading", "Loading...")}
              </Typography>
            </Box>
          )}

          {/* Grid */}
          {!marketplaceLoading && (
            <>
              {selectedProvider === MARKETPLACE_PROVIDERS.MODELSCOPE && (
                <ModelScopeGrid
                  servers={filteredServers}
                  processingItems={processingItems}
                  onAdd={handleAdd}
                  onRemove={handleRemove}
                  isChatReady={isChatReady}
                  loadingServers={loadingMcpServers}
                  runningServers={runningMcpServers}
                />
              )}

              {selectedProvider === MARKETPLACE_PROVIDERS.DOCKERHUB && (
                <DockerHubGrid
                  servers={filteredServers}
                  processingItems={processingItems}
                  onAdd={handleAdd}
                  onRemove={handleRemove}
                  isChatReady={isChatReady}
                />
              )}
            </>
          )}

          {/* Empty State */}
          {!marketplaceLoading && filteredServers.length === 0 && (
            <Box className="marketplace-empty">
              <SearchIcon sx={{ fontSize: 64, opacity: 0.3 }} />
              <Typography variant="h6" sx={{ mt: 2, opacity: 0.6 }}>
                {searchQuery
                  ? t("mcp.marketplace.no_results", `No results found`)
                  : t("mcp.marketplace.empty", "No items available")}
              </Typography>
              {searchQuery && (
                <Button variant="text" onClick={() => setSearchQuery("")}>
                  {t("mcp.marketplace.clear_search", "Clear search")}
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </div>
  );
};

export default McpMarketPlace;
