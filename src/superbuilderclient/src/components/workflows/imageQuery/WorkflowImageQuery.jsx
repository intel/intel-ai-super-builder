import "../WorkflowGlobalStyles.css";
import React, { useState, useEffect, useContext } from "react";
import ActiveFileView from "../../fileManagement/ActiveFileView";
import Chat from "../../chat/Chat";
import { WorkflowContext } from "../../context/WorkflowContext";
import SimpleAlert from "../../generalUseModal/SimpleAlert";
import { WorkflowContainer } from "../WorkflowGlobalStyles";

const WorkflowImageQuery = ({loading}) => {
    const { getChatModel, isVisionModel, switchToWorkflowRecommendedModel, getWorkflowRecommendedModel } = useContext(WorkflowContext);
    const [attachedFiles, setAttachedFiles] = useState([]);
    const [ attachedFilesVisible, setAttachedFilesVisible ] = useState(true);
    const [pendingModelResponse, setPendingModelResponse] = useState(false); // waiting for user to select model change option
    const onActiveFileChange = (newAttachedFiles) => { setAttachedFiles(newAttachedFiles); };
    const selectedFileLimit = 3;

    const validateVisionModel = async () => {
        // if current model is not a vision model, switch to recommended vision model for this workflow
        const isVision = await isVisionModel();
        if (!isVision) {
            console.log("Not a vision model, recommending model switch to user...");
            setPendingModelResponse(true);
        } else {
            console.log("Vision model already selected.");
        }
    }

    useEffect(() => {
        validateVisionModel(); // check if model is valid vision model on load
    }, []);

    const handleModelSwitchDeny = () => {
        console.log("User denied model switch, continuing with current model");
        setPendingModelResponse(false);
    };

    const handleModelSwitchConfirm = () => {
        console.log("User confirmed, switching to recommended vision model...");
        setPendingModelResponse(false);
        switchToWorkflowRecommendedModel();
    };

    return (
        <WorkflowContainer>
            <SimpleAlert
                isOpen={pendingModelResponse}
                title="Vision Model Required"
                content={
                    <span>
                        A vision model is required for this feature. Would you like to switch to recommended vision model <b>{getWorkflowRecommendedModel()?.[0]}</b>?
                    </span>
                }
                confirmText="Switch Models"
                denyText="Skip"
                onConfirm={handleModelSwitchConfirm}
                onDeny={handleModelSwitchDeny}
                onClose={handleModelSwitchDeny}
            />
            <ActiveFileView
                expanded={attachedFilesVisible}
                setExpanded={setAttachedFilesVisible}
                onSelectionChange={onActiveFileChange}
                allowedFileTypes={["jpg", "jpeg", "png"]}
                selectedFileLimit={selectedFileLimit}
                fileInstructionsText={`Add or select up to ${selectedFileLimit} files`}
                uploadType="QueryImages" // tell backend to only store filepaths, no embeddings
            />
            <Chat
                readyToChat={attachedFiles.length > 0}
                onMessageSend={() => setAttachedFilesVisible(false)}
                onResubmitSend={() => setAttachedFilesVisible(false)}
                queryType="QueryImages"
                activeFiles={attachedFiles}
                loading={loading}
                defaultValue="Describe the images"
            />
        </WorkflowContainer>
    )
};
export default WorkflowImageQuery;