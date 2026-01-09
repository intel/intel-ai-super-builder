import "../WorkflowGlobalStyles.css";
import React, { useState, useEffect, useContext } from "react";
import { listen } from "@tauri-apps/api/event";
import ActiveFileView from "../../fileManagement/ActiveFileView";
import { WorkflowButton, WorkflowContainer, WorkflowInput } from "../WorkflowGlobalStyles";
import Chat from "../../chat/Chat";
import { ChatContext } from "../../context/ChatContext";
import HighLowTooltipDescription from "../../tooltip/HighLowTooltipDescription";
import { Checkbox } from "@mui/material";

const WorkflowDocScoring = ({loading, invoke}) => {
    const [attachedFiles, setAttachedFiles] = useState([]);
    const [scoringCriteria, setScoringCriteria] = useState("");
    const [attachedFilesVisible, setAttachedFilesVisible] = useState(true);
    const [includeReasoning, setIncludeReasoning] = useState(false); 
    const [generalChatActive, setGeneralChatActive] = useState(false); // send general queries after initial evaluation criteria match is completed
    const { sendMessage, messages } = useContext(ChatContext);

    const onActiveFileChange = (newAttachedFiles) => {
        setAttachedFiles(newAttachedFiles); // update the active files selection
    };

    const submitScoringCriteria = async () => {
        if (loading || (scoringCriteria === "") || (attachedFiles.length <= 0)) {
            return; // make sure the chat and all inputs are ready first
        }
        setAttachedFilesVisible(false); // collapse
        setGeneralChatActive(true); // show chat view now that a evaluation criteria has been submitted
        await sendMessage(scoringCriteria, -1, attachedFiles, {name: "ScoreDocuments", is_scoring_criteria: true, include_reasoning: includeReasoning}); 
    }

    return (
        <WorkflowContainer>
            <ActiveFileView
                expanded={attachedFilesVisible}
                setExpanded={setAttachedFilesVisible}
                onSelectionChange={onActiveFileChange}
                allowedFileTypes={["pdf", "docx", "txt"]}
                fileInstructionsText="Add or select documents"
                additionalInputs={
                    attachedFilesVisible && (
                        <div className="workflow-input-container">
                            <div className="workflow-reasoning-container">
                                <Checkbox
                                    checked={includeReasoning}
                                    onChange={(e) => setIncludeReasoning(e.target.checked)}
                                    data-testid="doc-scoring-include-reasoning-checkbox"
                                />
                                <HighLowTooltipDescription
                                    overall_description={"When enabled, includes the reason for the scores. This will increase processing time."}
                                />
                                <span style={{fontSize:"small", marginLeft: 3, color: "var(--text-secondary-color)"}}>Include Reasoning</span>
                            </div> 
                            <div className="workflow-horizontal-input">
                                <WorkflowInput
                                    label="Enter scoring criteria"
                                    value={scoringCriteria}
                                    setValue={setScoringCriteria}
                                    onChange={(e) => setScoringCriteria(e.target.value)}
                                    onEnterKeyDown={submitScoringCriteria}
                                    data-testid="doc-scoring-criteria-input"
                                />
                                <WorkflowButton
                                    onClick={submitScoringCriteria}
                                    disabled={loading || (scoringCriteria === "") || (attachedFiles.length <= 0)}
                                    text={"Evaluate"}
                                    data-testid="doc-scoring-evaluate-button"
                                />                            
                            </div>
                        </div>
                    )
                }
                collapseOnBlur={messages.length > 0} // only collapse if there's been input
            />
            {/* Show previous chat sessions right away but don't allow chatting until a new job description is submitted for transient vectordb setup */}
            {messages.length > 0 && (
                <Chat
                    readyToChat={generalChatActive}
                    queryType="ScoreDocuments"
                    onMessageSend={() => setAttachedFilesVisible(false)}
                    onResubmitSend={() => setAttachedFilesVisible(false)}
                    activeFiles={attachedFiles}
                />
            )}
        </WorkflowContainer>
    )
};

export default WorkflowDocScoring;
