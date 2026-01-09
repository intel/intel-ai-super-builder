import React, { useState, useEffect, useContext, useRef } from "react";
import "./WorkflowOptions.css";
import { AppStatusContext } from "../context/AppStatusContext";
import { WorkflowContext } from "../context/WorkflowContext";
import { ChatContext } from "../context/ChatContext";
import useDataStore from "../../stores/DataStore";
import ImageGenerationIcon from "@mui/icons-material/Photo";
import SummarizeQueryIcon from "@mui/icons-material/Summarize";
import DocumentScoreIcon from '@mui/icons-material/FormatListNumbered';
import QueryTablesIcon from '@mui/icons-material/TableView';
import ResumeQueryIcon from '@mui/icons-material/Groups';
import ChatIcon from '@mui/icons-material/QuestionAnswer';
import MCPIcon from '../../assets/images/mcp-logo.svg'; 

const WorkflowOptions = ({onWorkflowSelected}) => {
    const { isAppReady } = useContext(AppStatusContext);
    const { setWorkflow, selectedWorkflow, getWorkflowLabel } = useContext(WorkflowContext);
    const { newSession } = useContext(ChatContext);

    const switchWorkflow = (newWorkflow) => {
        newSession(); // clear current messages by starting new session
        setWorkflow(newWorkflow); // set new active workflow UI
    };

    const WorflowOption = ({
        classNames="",
        workflowType="Generic",
        icon,
        isSelected=false,
        workflowSelected,
        "data-testid": dataTestId
    }) => {
        const label = getWorkflowLabel(workflowType);
        return (
            <div
                className={((selectedWorkflow===workflowType) ? "active-workflow-option" : "inactive-workflow-option") + " workflow-option " + (!isAppReady ? " disabled-workflow-option " : "") + classNames}
                title={label}
                data-testid={dataTestId}
                onClick={() => {
                    if (isAppReady) {
                        switchWorkflow(workflowType);
                        onWorkflowSelected(); //propogate to parent
                    }
                }}
            >
                    {icon} 
                    <span className="workflow-option-title">{label}</span>
            </div>
        );
    }

    return (
        <div className={"workflow-options"}>
            <WorflowOption
                classNames="large-workflow-option"
                icon={<ChatIcon className="workflow-icon"/>}
                workflowType="Generic"
                data-testid="workflow-generic-chat-option"
            />           
            <span className="special-features-title"></span>
            <WorflowOption
                icon={<img className="workflow-image-icon" src={MCPIcon} alt="MCP Logo" />}
                workflowType="SuperAgent"
                data-testid="workflow-super-agent-option"
            />
            <WorflowOption
                icon={<QueryTablesIcon className="workflow-icon"/>}
                workflowType="QueryTables"
                data-testid="workflow-query-tables-option"
            />
            <WorflowOption
                icon={<SummarizeQueryIcon className="workflow-icon"/>}
                workflowType="Summarize"
                data-testid="workflow-summarize-option"
            />
            <WorflowOption
                icon={<ImageGenerationIcon className="workflow-icon"/>}
                workflowType="QueryImages"
                data-testid="workflow-query-images-option"
            />
            <WorflowOption
                icon={<ResumeQueryIcon className="workflow-icon"/>}
                workflowType="ScoreResumes"
                data-testid="workflow-score-resumes-option"
            />
            <WorflowOption
                icon={<DocumentScoreIcon className="workflow-icon"/>}
                workflowType="ScoreDocuments"
                data-testid="workflow-score-documents-option"
            />
        </div>
    );
}

export default WorkflowOptions;