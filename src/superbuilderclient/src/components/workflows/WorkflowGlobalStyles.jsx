import React, { useState, useEffect, useContext } from "react";
import "./WorkflowGlobalStyles.css";
import { Button, TextField } from "@mui/material";
import { WorkflowContext } from "../context/WorkflowContext";
import { ChatContext } from "../context/ChatContext";
import SuboptimalIcon from '@mui/icons-material/WarningAmber';
import OptimalIcon from '@mui/icons-material/TaskAlt';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

export function WorkflowContainer ({children, settingsButton=null}) {
    const { setWorkflow, getChatModel, switchToWorkflowRecommendedModel, getWorkflowLabel, getWorkflowDescription, getWorkflowRecommendedModel } = useContext(WorkflowContext);
    const { newSession, isChatReady } = useContext(ChatContext);
    const recommendedModel = getWorkflowRecommendedModel(); // recommended model for this specific workflow
    const closeWorkflow = () => {
        newSession();
        setWorkflow("close");
    }
    return (
        <div className="workflow-container">
            <div className="workflow-header">
                <div className="workflow-header-start">
                    <span className="workflow-title">{getWorkflowLabel()}</span>
                    <div className="workflow-model-text">
                        {recommendedModel.length>0 && recommendedModel.includes(getChatModel()) ? (
                            <Tooltip
                                title="The recommended model for this workflow is currently in use."
                                placement="bottom-start"
                                sx={{p:0, m:0}}
                            >
                                <IconButton>
                                    <OptimalIcon fontSize="small" color="success"/>
                                </IconButton>
                            </Tooltip>
                        ) : (
                            <Tooltip
                                title={"This model is not recommended for the current workflow. Click to switch to the recommended model " + recommendedModel}
                                placement="bottom-start"
                                sx={{p:0, m:0}}
                                data-testid="workflow-switch-model-tooltip"
                            >
                                <IconButton
                                    data-testid="workflow-switch-model-button"
                                    onClick={switchToWorkflowRecommendedModel}
                                >
                                    <SuboptimalIcon fontSize="small" color="warning"/>
                                </IconButton>
                            </Tooltip>
                        )}
                        <span className={recommendedModel.length>0 && recommendedModel.includes(getChatModel()) ? "optimal-model" : "suboptimal-model"}>{getChatModel()}</span>
                    </div>
                </div>
                <div className="workflow-header-middle">
                    <span className="workflow-description">{getWorkflowDescription()}</span>
                </div>
                {settingsButton && (
                    <div className="workflow-header-end">
                        {settingsButton}
                    </div>
                )}
                <IconButton
                    data-testid="workflow-close-button"
                    onClick={closeWorkflow}
                    disabled={!isChatReady}
                    sx={{
                        color: "#666666",
                        "&:hover": {
                            backgroundColor: "rgba(0, 0, 0, 0.04)",
                        },
                    }}
                >
                    <CloseIcon/>
                </IconButton>
            </div>
            <div className="workflow-body-container">
                {children}
            </div>
        </div>
    );
}

export function WorkflowButton ({
    variant="contained", 
    disabled=false, 
    onClick, 
    size="medium", 
    text="Click Me", 
    width="15%",
    'data-testid': dataTestId
}) {
    return (
        <Button
            className="workflow-input-button"
            variant={variant}
            size={size}
            onClick={onClick}
            disabled={disabled}
            sx={{textTransform:"none", fontWeight:"100", width:width, borderRadius:"5px"}}
            data-testid={dataTestId}
        >
            {text}
        </Button>
    );
}

export function WorkflowInput ({
    value,
    setValue,
    onChange,
    onEnterKeyDown=()=>{},
    label="Enter value here",
    variant="outlined",
    maxRows=3,
    width="100%",
    'data-testid': dataTestId,
}) {
    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            if (e.shiftKey && value !== "") {
                setValue(input + "\n"); // shift being pressed so add a line break
            } else {
                onEnterKeyDown(); // otherwise invoke regular enter callback
            }
            e.preventDefault();
        }
    };

    return (
        <TextField
            className="workflow-text-input"
            label={label}
            variant={variant}
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            multiline
            maxRows={maxRows}
            sx={{width:width}}
            data-testid={dataTestId} 
        />
    );
}