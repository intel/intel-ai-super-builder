import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import useAppStore from "./AppStore";
import {
  saveMarketplaceCache,
  loadMarketplaceCache,
  saveLocalServersCache,
  loadLocalServersCache,
  saveMarketplaceServersByIdCache,
  loadMarketplaceServersByIdCache,
} from "../utils/mcpCache";

const useMcpStore = create((set, get) => ({
  mcpManagementOpen: false,
  openMcpManagement: () => set({ mcpManagementOpen: true }),
  closeMcpManagement: () => set({ mcpManagementOpen: false }),

  mcpMarketplaceOpen: false,
  openMcpMarketplace: () => set({ mcpMarketplaceOpen: true }),
  closeMcpMarketplace: () => set({ mcpMarketplaceOpen: false }),

  // Add a refresh trigger
  refreshTrigger: 0,
  triggerRefresh: () =>
    set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),

  // MCP Server Management
  mcpInputOpen: false,
  mcpInputType: "",
  mcpInputSource: "",
  mcpInput: {},
  openMcpInput: (type, source) =>
    set({ mcpInputOpen: true, mcpInputType: type, mcpInputSource: source }),
  closeMcpInput: () =>
    set({
      mcpInputOpen: false,
      mcpInputType: "",
      mcpInputSource: "url",
      mcpServerTools: [],
    }),
  setMcpInput: (input) =>
    set({
      mcpInput: input,
    }),

  setMcpInputSource: (source) =>
    set({
      mcpInputSource: source,
    }),

  mcpServers: [],
  getLocalMcpServers: async () => {
    try {
      const response = await invoke("get_mcp_servers");
      const parsedJSONResult = JSON.parse(response);
      console.log("Parsed MCP Server JSON Result:", parsedJSONResult);
      set({ mcpServers: parsedJSONResult });

      // Save to cache
      await saveLocalServersCache(parsedJSONResult);

      // Update the installed status for marketplace servers after fetching local servers
      get().updateMarketplaceInstalledStatus();
    } catch (error) {
      console.error("Failed to fetch MCP Servers:", error);
    }
  },

  addMcpServer: async () => {
    try {
      const server = get().mcpInput;
      console.debug("Adding MCP Server:", server);
      const response = await invoke("add_mcp_server", {
        serverName: server.mcpServerName.trim(),
        url: server.mcpServerUrl.trim(),
        env: server.mcpServerEnv,
        command: server.mcpServerCommand,
        args: server.mcpServerCommandArgs,
        disabled: server.mcpServerDisabled,
      });
      console.log(response);
      if (response.success) {
        console.log("MCP Server added successfully:", server.mcpServerName);
        get().getLocalMcpServers(); // Refresh the list after adding
      } else {
        console.error("Failed to add MCP Server:", response.message);
        useAppStore
          .getState()
          .showNotification(
            `Failed to add MCP Server "${server.mcpServerName}": ${response.message}`,
            "error"
          );
        return false;
      }
      return true;
    } catch (error) {
      console.error("Failed to add MCP Server:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to add MCP Server "${server.mcpServerName}": ${error}`,
          "error"
        );
      return false;
    }
  },

  updateMcpServer: async () => {
    try {
      const server = get().mcpInput;
      console.debug("Updating MCP Server:", server);
      const response = await invoke("edit_mcp_server", {
        id: server.mcpServerId,
        serverName: server.mcpServerName.trim(),
        url: server.mcpServerUrl.trim(),
        env: server.mcpServerEnv,
        command: server.mcpServerCommand,
        args: server.mcpServerCommandArgs,
        disabled: server.mcpServerDisabled,
      });
      console.log(response);

      if (response.success) {
        console.log("MCP Server updated successfully:", server.mcpServerName);
        get().getLocalMcpServers(); // Refresh the list after adding
      } else {
        console.error("Failed to update MCP Server:", response.message);
        useAppStore
          .getState()
          .showNotification(
            `Failed to update MCP Server "${server.mcpServerName}": ${response.message}`,
            "error"
          );
        return false;
      }
      return true;
    } catch (error) {
      console.error("Failed to update MCP Server:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to update MCP Server "${server.mcpServerName}": ${error}`,
          "error"
        );
      return false;
    }
  },

  removeMcpServer: async () => {
    try {
      const selectedServers = get().selectedMcpServer;
      for (const server of selectedServers) {
        console.debug("Removing MCP Server:", server.server_name);
        const response = await invoke("remove_mcp_server", {
          serverName: server.server_name,
        });
        get().getLocalMcpServers();
        if (response === "MCP server removed successfully.") {
          console.log("MCP Server removed successfully:", server.server_name);
          // get().getLocalMcpServers(); // Refresh the list after removal
        }
      }
      // Clear the selected servers after successful removal
      set({ selectedMcpServer: [] });
      return true;
    } catch (error) {
      console.error("Failed to remove MCP servers:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to remove MCP Server "${server.server_name}": ${error}`,
          "error"
        );
      return false;
    }
  },

  loadingMcpServers: [],
  startMcpServers: async (name) => {
    try {
      console.debug("Starting MCP Servers...", name);
      set({ loadingMcpServers: [name] });
      const response = await invoke("start_mcp_server", {
        serverName: name,
      });
      if (response === "MCP server loaded successfully.") {
        console.log("MCP Servers loaded successfully.");
        useMcpStore.getState().getActiveMcpServers();
      }
    } catch (error) {
      console.error("Failed to load MCP Servers:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to start MCP Server "${name}": ${error}`,
          "error"
        );
    } finally {
      set({ loadingMcpServers: [] });
    }
  },

  stopMcpServers: async (name) => {
    try {
      console.debug("Stopping MCP Servers...", name);
      set({ loadingMcpServers: [name] });
      const response = await invoke("stop_mcp_server", {
        serverName: name,
      });
      console.log("Stop MCP Servers Response:", response);
      if (response === `MCP Server(${name}) Stopped`) {
        console.log("MCP Servers stopped successfully.");
        useMcpStore.getState().getActiveMcpServers();
      }
    } catch (error) {
      console.error("Failed to stop MCP Servers:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to stop MCP Server "${name}": ${error}`,
          "error"
        );
    } finally {
      set({ loadingMcpServers: [] });
    }
  },

  mcpServerTools: {},
  fetchingMcpServerTools: false,
  mcpToolsDialogOpen: false,
  mcpToolsDialogServerName: "",
  mcpToolsDialogServerConfig: null,
  mcpToolsDialogAgentName: "",
  mcpToolsDialogNeedsConfirmation: false,
  mcpToolsDialogPendingServers: [],
  mcpToolsDialogCurrentServerIndex: 0,
  openMcpToolsDialog: (serverName, agentName = "", needsConfirmation = false, serverConfig = null) =>
    set({
      mcpToolsDialogOpen: true,
      mcpToolsDialogServerName: serverName,
      mcpToolsDialogServerConfig: serverConfig,
      mcpToolsDialogAgentName: agentName,
      mcpToolsDialogNeedsConfirmation: needsConfirmation
    }),
  closeMcpToolsDialog: () =>
    set({
      mcpToolsDialogOpen: false,
      mcpToolsDialogServerName: "",
      mcpToolsDialogServerConfig: null,
      mcpToolsDialogAgentName: "",
      mcpToolsDialogNeedsConfirmation: false,
      mcpServerTools: {},
      mcpToolsDialogPendingServers: [],
      mcpToolsDialogCurrentServerIndex: 0
    }),
  confirmMcpTools: () => {
    // User confirmed all servers - close the dialog
    set({
      mcpToolsDialogOpen: false,
      mcpToolsDialogNeedsConfirmation: false,
      mcpToolsDialogPendingServers: [],
      mcpToolsDialogCurrentServerIndex: 0
    });
  },
  rejectMcpTools: async () => {
    const agentName = get().mcpToolsDialogAgentName;

    // Close dialog first
    set({
      mcpToolsDialogOpen: false,
      mcpToolsDialogNeedsConfirmation: false,
      mcpServerTools: {}
    });

    // Stop the agent if there's an agent name
    if (agentName) {
      await get().stopMcpAgent(agentName);
      useAppStore
        .getState()
        .showNotification(
          `MCP Agent "${agentName}" stopped.`,
          "info"
        );
    }
  },
  resetMcpServerTools: () => set({ mcpServerTools: {} }),
  getMcpServerTools: async (server_name, showDialog = false, agentName = "", needsConfirmation = false) => {
    try {
      set({ fetchingMcpServerTools: true });
      console.debug("Fetching MCP Server Tools...");
      const response = await invoke("get_mcp_server_tools", {
        serverName: server_name,
      });
      const parsedJSONResult = JSON.parse(response);
      console.log(server_name, "Tools:", parsedJSONResult);

      // Store tools in a map indexed by server name
      const currentTools = get().mcpServerTools;
      set({ mcpServerTools: { ...currentTools, [server_name]: parsedJSONResult } });

      // Open dialog if requested and tools were fetched successfully
      if (showDialog && parsedJSONResult.length > 0) {
        // Find the server config
        const serverConfig = get().mcpServers.find(s => s.server_name === server_name);

        set({
          mcpToolsDialogOpen: true,
          mcpToolsDialogServerName: server_name,
          mcpToolsDialogServerConfig: serverConfig || null,
          mcpToolsDialogAgentName: agentName,
          mcpToolsDialogNeedsConfirmation: needsConfirmation
        });
      }
    } catch (error) {
      console.log("Failed to fetch MCP Server Tools:", error);
      // Handle GRPC style error messages
      const errorMessage = error.toString().includes("Status(StatusCode=")
        ? error.split('Detail="')[1].split('"')[0]
        : error.message || "Failed to fetch MCP Server Tools";

      // Store error in the map
      const currentTools = get().mcpServerTools;
      set({
        mcpServerTools: {
          ...currentTools,
          [server_name]: [
            {
              name: "Error",
              description: errorMessage,
              type: "error",
            },
          ]
        },
      });

      // Show dialog even on error if requested
      if (showDialog) {
        set({
          mcpToolsDialogOpen: true,
          mcpToolsDialogServerName: server_name,
          mcpToolsDialogAgentName: agentName,
          mcpToolsDialogNeedsConfirmation: needsConfirmation
        });
      }
    } finally {
      set({ fetchingMcpServerTools: false });
    }
  },

  selectedMcpServerId: [],
  setSelectedMcpServerId: (selected) => set({ selectedMcpServerId: selected }),

  selectedMcpServer: [],
  setSelectedMcpServer: (selected) => set({ selectedMcpServer: selected }),

  runningMcpServers: [],
  getActiveMcpServers: async () => {
    try {
      console.debug("Fetching active MCP Servers...");
      const response = await invoke("get_active_mcp_servers");
      console.log("Raw response from get_active_mcp_servers:", response);
      const parsedJSONResult = JSON.parse(response);
      console.log("Active MCP Servers (parsed):", parsedJSONResult);
      console.log("Active MCP Servers type:", typeof parsedJSONResult, "isArray:", Array.isArray(parsedJSONResult));
      set({ runningMcpServers: parsedJSONResult });
    } catch (error) {
      console.error("Failed to fetch active MCP Servers:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to fetch active MCP Servers: ${error}`,
          "error"
        );
    }
  },

  // MCP Agent Management
  mcpAgentInputOpen: false,
  mcpAgentInput: {},
  mcpAgentInputType: "",
  openMcpAgentInput: (type) =>
    set({
      mcpAgentInputOpen: true,
      mcpAgentInputType: type,
    }),
  closeMcpAgentInput: () =>
    set({
      mcpAgentInputOpen: false,
      mcpAgentInputType: "",
    }),
  setMcpAgentInput: (input) =>
    set({
      mcpAgentInput: input,
    }),

  selectedMcpAgent: [],
  setSelectedMcpAgent: (selected) => set({ selectedMcpAgent: selected }),

  mcpAgents: [],
  getMcpAgent: async () => {
    try {
      const response = await invoke("get_mcp_agents");
      const parsedJSONResult = JSON.parse(response);
      console.log("Parsed MCP Agents JSON Result:", parsedJSONResult);
      set({ mcpAgents: parsedJSONResult });
    } catch (error) {
      console.error("Failed to fetch MCP Servers:", error);
    }
  },

  addMcpAgent: async () => {
    try {
      const agentInput = get().mcpAgentInput;
      console.log("Adding MCP Agent Input:", agentInput);
      console.debug("Adding MCP Agent:", agentInput);

      const response = await invoke("add_mcp_agent", {
        agentName: agentInput.agentName.trim(),
        agentDesc: agentInput.description,
        agentMessage: agentInput.systemMessage,
        serverIds: agentInput.mcpServerIds || [],
      });

      console.log("Add MCP Agent Response:", response);
      if (response.success) {
        console.log("MCP Agent added successfully:", agentInput.agentName);
        get().getMcpAgent(); // Refresh the list after adding
        return true;
      } else {
        console.error("Failed to add MCP Agent:", response.message);
        useAppStore
          .getState()
          .showNotification(
            `Failed to add MCP Agent "${agentInput.agentName}": ${response.message}`,
            "error"
          );
        return false;
      }
    } catch (error) {
      console.error("Failed to add MCP Agent:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to add MCP Agent "${agentInput.agentName}": ${error}`,
          "error"
        );
      return false;
    }
  },

  updateMcpAgent: async () => {
    try {
      const agentInput = get().mcpAgentInput;
      console.debug("Updating MCP Agent:", agentInput);

      const response = await invoke("edit_mcp_agent", {
        agentId: agentInput.id,
        agentName: agentInput.agentName,
        agentDesc: agentInput.description,
        agentMessage: agentInput.systemMessage,
        serverIds: agentInput.mcpServerIds || [],
      });

      console.log("Update MCP Agent Response:", response);
      if (response) {
        console.log("MCP Agent updated successfully:", agentInput.agentName);
        get().getMcpAgent(); // Refresh the list after updating
        return true;
      } else {
        console.error("Failed to update MCP Agent");
        useAppStore
          .getState()
          .showNotification(
            `Failed to update MCP Agent "${agentInput.agentName}": ${response.message}`,
            "error"
          );
        return false;
      }
    } catch (error) {
      console.error("Failed to update MCP Agent:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to update MCP Agent "${agentInput.agentName}": ${error}`,
          "error"
        );
      return false;
    }
  },

  removeMcpAgent: async () => {
    try {
      const selectedAgents = get().selectedMcpAgent;
      for (const agent of selectedAgents) {
        console.debug("Removing MCP Agent:", agent.name);

        const response = await invoke("remove_mcp_agent", {
          agentName: agent.name,
        });

        console.log("Remove MCP Agent Response:", response);
        if (response) {
          console.log("MCP Agent removed successfully:", agent.name);
        } else {
          console.error("Failed to remove MCP Agent:", agent.name);
          useAppStore
            .getState()
            .showNotification(
              `Failed to remove MCP Agent "${agent.name}": ${response.message}`,
              "error"
            );
        }
      }
      get().getMcpAgent(); // Refresh the list after removal
      return true;
    } catch (error) {
      console.error("Failed to remove MCP agents:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to remove MCP Agent "${agent.name}": ${error}`,
          "error"
        );
      return false;
    }
  },

  // Remove MCP Server / Agent Modal
  mcpRemoveModalOpen: false,
  setMcpRemoveModalOpen: (open) => set({ mcpRemoveModalOpen: open }),
  mcpRemoveType: "",
  setMcpRemoveType: (type) => set({ mcpRemoveType: type }),

  loadingMcpAgents: [],
  startMcpAgent: async (name) => {
    try {
      console.debug("Starting MCP Agent...", name);

      // Get server_ids from mcpAgents by name
      const mcpAgents = get().mcpAgents;
      const agent = mcpAgents.find((agent) => agent.name === name);
      const serverIds = agent ? agent.server_ids : [];
      // Get server names from serverIds using mcpServers
      const mcpServers = get().mcpServers;
      const serverNames = serverIds
        .map((serverId) => {
          const server = mcpServers.find((server) => server.id === serverId);
          return server ? server.server_name : null;
        })
        .filter((name) => name !== null);

      set({ loadingMcpAgents: [name], loadingMcpServers: serverNames });
      const response = await invoke("start_mcp_agent", {
        agentName: name,
      });

      console.log("Start MCP Agent Response:", response);
      if (response) {
        console.log("MCP Agent started successfully:", name);
        get().getActiveMcpAgents();
        get().getActiveMcpServers();

        // Fetch and display tools for all servers in this agent
        if (serverNames.length > 0) {
          // Initialize the consent flow with all servers
          set({
            mcpToolsDialogPendingServers: serverNames,
            mcpToolsDialogCurrentServerIndex: 0,
            mcpServerTools: {} // Reset tools
          });

          // Fetch tools for all servers in parallel
          const toolsFetchPromises = serverNames.map(serverName =>
            get().getMcpServerTools(serverName, false, name, false)
          );

          await Promise.all(toolsFetchPromises);

          // After all tools are fetched, open the dialog
          set({
            mcpToolsDialogOpen: true,
            mcpToolsDialogServerName: serverNames[0], // Default to first server
            mcpToolsDialogAgentName: name,
            mcpToolsDialogNeedsConfirmation: true
          });
        }
      }
    } catch (error) {
      console.error("Failed to start MCP Agent:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to start MCP Agent "${name}": ${error}`,
          "error"
        );
    } finally {
      set({ loadingMcpAgents: [], loadingMcpServers: [] });
    }
  },

  stopMcpAgent: async (name) => {
    try {
      console.debug("Stopping MCP Agent...", name);
      set({ loadingMcpAgents: [name] });
      const response = await invoke("stop_mcp_agent", {
        agentName: name,
      });

      console.log("Stop MCP Agent Response:", response);
      if (response) {
        console.log("MCP Agent stopped successfully:", name);

        get().getActiveMcpAgents();
        get().getActiveMcpServers();
      }
    } catch (error) {
      console.error("Failed to stop MCP Agent:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to stop MCP Agent "${name}": ${error}`,
          "error"
        );
    } finally {
      set({ loadingMcpAgents: [] });
    }
  },

  runningMcpAgents: [],

  getActiveMcpAgents: async () => {
    try {
      const response = await invoke("get_active_mcp_agents");
      const parsedJSONResult = JSON.parse(response);
      console.log("Active MCP Agent:", parsedJSONResult);
      set({ runningMcpAgents: parsedJSONResult });
    } catch (error) {
      console.error("Failed to fetch active MCP Servers:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to fetch active MCP Agents: ${error}`,
          "error"
        );
    }
  },

  marketplaceServers: [],
  marketplaceLoading: false,
  marketplaceTotalPages: 0,
  marketplaceCurrentPage: 1,
  marketplaceLastFetch: null, // Timestamp of last fetch
  marketplaceCacheTimeout: 24 * 60 * 60 * 1000, // 1 day in milliseconds (configurable)

  // Set marketplace cache timeout in milliseconds
  setMarketplaceCacheTimeout: (timeoutMs) => set({ marketplaceCacheTimeout: timeoutMs }),

  // Helper function to generate unique MCP server name from marketplace server
  // Format: {serverName}_{marketplaceItemId}
  generateMcpServerName: (serverName, marketplaceItemId) => {
    return `${serverName}_${marketplaceItemId}`;
  },

  // Helper function to check if a server name matches a marketplace item
  // This checks both the original name and the generated unique name
  isServerFromMarketplaceItem: (localServerName, marketplaceServerName, marketplaceItemId) => {
    const uniqueName = get().generateMcpServerName(marketplaceServerName, marketplaceItemId);
    return localServerName === uniqueName;
  },

  // Helper function to check if a marketplace item is installed
  checkMarketplaceItemInstalled: (marketplaceItem, mcpServers, marketplaceServersById) => {
    // Check the cache to see what servers this marketplace item contains
    const cachedServers = marketplaceServersById[marketplaceItem.id];

    // If we have cached server info for this item, check those specific server names
    if (cachedServers && cachedServers.length > 0) {
      return cachedServers.some(serverInfo => {
        const uniqueName = get().generateMcpServerName(serverInfo.name, marketplaceItem.id);
        return mcpServers.some(localServer => localServer.server_name === uniqueName);
      });
    }

    // Fallback: check if any server name contains the marketplace item ID
    // This handles cases where we haven't fetched the details yet
    return mcpServers.some((server) => {
      return server.server_name.endsWith(`_${marketplaceItem.id}`);
    });
  },

  // Update installed status for all marketplace servers
  updateMarketplaceInstalledStatus: () => {
    const state = get();
    const updatedServers = state.marketplaceServers.map(server => ({
      ...server,
      installed: state.checkMarketplaceItemInstalled(
        server,
        state.mcpServers,
        state.marketplaceServersById
      )
    }));
    set({ marketplaceServers: updatedServers });
  },

  getMarketplaceServers: async (pageNumber = 1, pageSize = 20, category = "", search = "", forceRefresh = false) => {
    try {
      const state = get();

      // Step 1: Try to load from Tauri Store cache first (instant display)
      if (!forceRefresh && category === "" && search === "" && pageNumber === 1) {
        console.log("Checking for cached marketplace data...");
        const cachedData = await loadMarketplaceCache();

        if (cachedData && cachedData.marketplaceServers?.length > 0) {
          console.log(" Using cached marketplace data (stale-while-revalidate):", {
            servers: cachedData.marketplaceServers.length,
            timestamp: new Date(cachedData.marketplaceLastFetch).toLocaleString()
          });

          // Immediately set the cached data (no loading spinner)
          set({
            marketplaceServers: cachedData.marketplaceServers,
            marketplaceLastFetch: cachedData.marketplaceLastFetch,
            marketplaceCurrentPage: pageNumber,
            marketplaceLoading: false, // Don't show loading for cached data
          });

          // Update installed status with cached local servers if available
          const cachedLocalServers = await loadLocalServersCache();
          if (cachedLocalServers && cachedLocalServers.mcpServers?.length > 0) {
            set({ mcpServers: cachedLocalServers.mcpServers });
          }

          // Also restore marketplaceServersById cache
          const cachedServersById = await loadMarketplaceServersByIdCache();
          if (cachedServersById) {
            set({ marketplaceServersById: cachedServersById.marketplaceServersById || {} });
          }

          state.updateMarketplaceInstalledStatus();

          // Continue to fetch fresh data in background (don't return here)
          console.log("Fetching fresh data in background...");
        }
      }

      // Step 2: Show loading only if we don't have cached data
      const hasCachedData = get().marketplaceServers.length > 0;
      if (!hasCachedData) {
        set({ marketplaceLoading: true });
      }

      console.log(" Calling fetch_modelscope_mcp_servers with:", { pageNumber, pageSize, category, search });

      const response = await invoke("fetch_modelscope_mcp_servers", {
        pageNumber: pageNumber,
        pageSize: pageSize,
        category: category,
        search: search
      });

      console.log(" Received response from backend");

      const result = JSON.parse(response);
      // console.log("MCP Marketplace Servers:", result);

      const currentState = get();

      // Transform the API response to match our internal structure
      const transformedServers = result.data?.mcp_server_list?.map(server => {
        const marketplaceItem = {
          id: server.id,
          name: server.locales?.en?.name || server.name,
          chineseName: server.chinese_name || server.locales?.zh?.name,
          description: server.locales?.en?.description || server.description,
          chineseDescription: server.locales?.zh?.description,
          keywords: [...(server.categories || []), ...(server.tags || [])],
          icon: server.logo_url || "📦",
          publisher: server.publisher,
          viewCount: server.view_count,
          categories: server.categories || [],
          command: "",
          args: "",
          url: "",
          env: "",
        };

        // Check if this item is installed
        return {
          ...marketplaceItem,
          installed: currentState.checkMarketplaceItemInstalled(
            marketplaceItem,
            currentState.mcpServers,
            currentState.marketplaceServersById
          )
        };
      }) || [];

      const newState = {
        marketplaceServers: transformedServers,
        marketplaceCurrentPage: pageNumber,
        marketplaceLastFetch: Date.now(), // Update last fetch timestamp
        marketplaceTotalPages: Math.ceil((result.data?.total_count || 0) / pageSize)
      };

      set(newState);

      // Step 3: Save fresh data to Tauri Store cache
      if (category === "" && search === "" && pageNumber === 1) {
        await saveMarketplaceCache({
          marketplaceServers: transformedServers,
        });

        // Also save marketplaceServersById cache
        const serversById = get().marketplaceServersById;
        if (Object.keys(serversById).length > 0) {
          await saveMarketplaceServersByIdCache(serversById);
        }
      }
    } catch (error) {
      console.error("Failed to fetch MCP Marketplace Servers:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to fetch MCP Marketplace Servers: ${error.message}`,
          "error"
        );
      set({ marketplaceServers: [] });
    } finally {
      set({ marketplaceLoading: false });
    }
  },

  marketplaceServersById: {}, // Cache: { marketplaceId: [serverConfigs...] }

  getModelScopeMcpServerById: async (id) => {
    try {
      console.log(" Calling fetch_modelscope_mcp_by_id with:", { id });
      const response = await invoke("fetch_modelscope_mcp_by_id", {
        id: id
      });

      console.log(" Received response from backend");

      const result = JSON.parse(response);
      console.log("MCP Marketplace Servers:", result);

      // Transform the API response to match our internal structure
      // path: result.data.server_config[0].mcpServers
      // "mcpServers": {
      //           "fetch": {
      //             "args": [
      //               "mcp-server-fetch"
      //             ],
      //             "command": "uvx"
      //           }
      //         }
      // The mcpServers is an object with server names as keys
      const mcpServersObject = result.data?.server_config?.[0]?.mcpServers || {};

      // Convert the object into an array of server configurations
      const transformedServers = Object.entries(mcpServersObject).map(([serverName, config]) => ({
        name: serverName,           // e.g., "fetch"
        command: config.command,    // e.g., "uvx"
        args: (config.args || []).join(' ')     // e.g., ["mcp-server-fetch"]
      }));

      // Update the cache with this marketplace item's servers
      const updatedServersById = {
        ...get().marketplaceServersById,
        [id]: transformedServers
      };

      set({
        marketplaceServersById: updatedServersById
      });

      // Save to Tauri Store cache
      await saveMarketplaceServersByIdCache(updatedServersById);

      return transformedServers;
    } catch (error) {
      console.error(`Failed to fetch MCP Marketplace Server ${id}: ${error}`);
      useAppStore
        .getState()
        .showNotification(
          `Failed to fetch MCP Marketplace Server ${id}: ${error.message}`,
          "error"
        );
      return [];
    }
  },
}));

export default useMcpStore;
