import "../WorkflowGlobalStyles.css";
import "./WorkflowSuperAgent.css";
import React, { useState, useEffect, useContext } from "react";
import ActiveFileView from "../../fileManagement/ActiveFileView";
import Chat from "../../chat/Chat";
import { WorkflowContainer } from "../WorkflowGlobalStyles";
import { Button, Badge, Tooltip } from "@mui/material";
import McpManagement from "../../mcpManagement/McpManagement";
import MCPIcon from "../../../assets/images/mcp-logo.svg";
import useMcpStore from "../../../stores/McpStore";

const WorkflowSuperAgent = ({ loading, invoke }) => {
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [attachedFilesVisible, setAttachedFilesVisible] = useState(false);
  const onActiveFileChange = (newAttachedFiles) => {
    setAttachedFiles(newAttachedFiles);
  };
  const selectedFileLimit = 3;
  const mcpManagementOpen = useMcpStore((state) => state.mcpManagementOpen);
  const runningMcpAgents = useMcpStore((state) => state.runningMcpAgents);
  const getActiveMcpAgents = useMcpStore((state) => state.getActiveMcpAgents);

  const toggleMcpLibrary = () => {
    if (mcpManagementOpen) {
      useMcpStore.getState().closeMcpManagement();
    } else {
      useMcpStore.getState().openMcpManagement();
    }
  };

  useEffect(() => {
    useMcpStore.getState().closeMcpManagement(); // Start settings closed anytime workflow is loaded
    getActiveMcpAgents(); // make sure the agent list is updated on load
  }, []);

  const getRunningAgentsCount = () => {
    // subtract 1 since super agent should be excluded from count when agents are running
    const runningAgentCount = runningMcpAgents.length - 1;
    if (runningAgentCount <= 0) {
      return 0; // make sure count doesn't go into the negatives when super agent isn't loaded
    }
    return runningAgentCount;
  };

  return (
    <WorkflowContainer
      settingsButton={
        <Badge
          badgeContent={
            <Tooltip
              title={
                runningMcpAgents.length <= 1
                  ? "No MCP agents are running"
                  : getRunningAgentsCount() + " active MCP agents"
              }
              placement="top-start"
            >
              <span>{getRunningAgentsCount()}</span>
            </Tooltip>
          }
          color={runningMcpAgents.length <= 1 ? "error" : "success"}
          showZero
        >
          <Button variant="contained" onClick={toggleMcpLibrary} data-testid="workflow-mcp-manager-button">
            <img className="mcp-workflow-icon" src={MCPIcon} alt="MCP Logo"  />
            MCP Manager
          </Button>
        </Badge>
      }
    >
      {mcpManagementOpen && <McpManagement />}
      <ActiveFileView
        expanded={attachedFilesVisible}
        setExpanded={setAttachedFilesVisible}
        onSelectionChange={onActiveFileChange}
        allowedFileTypes={["pdf", "docx", "txt", "md", "xlsx", "csv"]}
        selectedFileLimit={selectedFileLimit}
        fileInstructionsText={`Add or select up to ${selectedFileLimit} files`}
      />
      <Chat
        readyToChat={true}
        onMessageSend={() => setAttachedFilesVisible(false)}
        onResubmitSend={() => setAttachedFilesVisible(false)}
        activeFiles={attachedFiles}
        queryType="SuperAgent"
        loading={loading}
      />
    </WorkflowContainer>
  );
};
export default WorkflowSuperAgent;
