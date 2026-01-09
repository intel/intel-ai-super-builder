import "../WorkflowGlobalStyles.css";
import React, { useState, useEffect, useContext } from "react";
import { listen } from "@tauri-apps/api/event";
import ActiveFileView from "../../fileManagement/ActiveFileView";
import { WorkflowButton, WorkflowContainer, WorkflowInput } from "../WorkflowGlobalStyles";
import Chat from "../../chat/Chat";
import { ChatContext } from "../../context/ChatContext";

const WorkflowResume = ({loading, invoke}) => {
    const [attachedFiles, setAttachedFiles] = useState([]);
    const [jobDescription, setJobDescription] = useState("");
    const [attachedFilesVisible, setAttachedFilesVisible] = useState(true);
    const [generalChatActive, setGeneralChatActive] = useState(false); // send general queries after initial job description match is completed
    const { sendMessage, messages } = useContext(ChatContext);

    const onActiveFileChange = (newAttachedFiles) => {
        setAttachedFiles(newAttachedFiles); // update the active files selection
    };

    const submitJobDescription = async () => {
        if (loading || (jobDescription === "") || (attachedFiles.length <= 0)) {
            return; // make sure the chat and all inputs are ready first
        }
        setAttachedFilesVisible(false); // collapse
        setGeneralChatActive(true); // show chat view now that a job description has been submitted
        await sendMessage(jobDescription, -1, attachedFiles, {name: "ScoreResumes", is_scoring_criteria: true}); // Submit the initial resume match job description using attached files
    }

    return (
        <WorkflowContainer>
            <ActiveFileView
                expanded={attachedFilesVisible}
                setExpanded={setAttachedFilesVisible}
                onSelectionChange={onActiveFileChange}
                allowedFileTypes={["pdf", "docx", "txt"]}
                fileInstructionsText="Add or select resumes"
                additionalInputs={
                    attachedFilesVisible && (
                        <div className="workflow-horizontal-input">
                            <WorkflowInput
                                data-testid="resume-job-description-input"
                                label="Enter job description"
                                value={jobDescription}
                                setValue={setJobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                onEnterKeyDown={submitJobDescription} // try to submit if enter key pressed
                            />
                            <WorkflowButton
                                data-testid="resume-evaluate-button"
                                onClick={submitJobDescription}
                                disabled={loading || (jobDescription === "") || (attachedFiles.length <= 0)}
                                text={"Evaluate"}
                            />
                        </div>
                    )
                }
                collapseOnBlur={messages.length > 0} // only collapse if there's been input
            />
            {/* Show previous chat sessions right away but don't allow chatting until a new job description is submitted for transient vectordb setup */}
            {messages.length > 0 && (
                <Chat
                    readyToChat={generalChatActive}
                    queryType="ScoreResumes"
                    onMessageSend={() => setAttachedFilesVisible(false)}
                    onResubmitSend={() => setAttachedFilesVisible(false)}
                    activeFiles={attachedFiles}
                />
            )}
        </WorkflowContainer>
    )
};

export default WorkflowResume;