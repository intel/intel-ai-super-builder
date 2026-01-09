import React, { useState, useEffect, useContext } from 'react';
import './WorkflowChat.css';
import ActiveFileView from '../../fileManagement/ActiveFileView';
import Chat from '../../chat/Chat';
import { ChatContext } from '../../context/ChatContext';
import ChatInput from '../../chat/ChatInput';
import useDataStore from '../../../stores/DataStore';
import { useTranslation } from 'react-i18next';
import { WorkflowContext } from '../../context/WorkflowContext';

const WorkflowChat = ({}) => {
  const [activeFiles, setActiveFiles] = useState([]);
  const [activeFilesVisible, setActiveFilesVisible] = useState(false); // controls expand/collapse of the active file preview
  const { getChatModel } = useContext(WorkflowContext);
  const onActiveFileChange = newActiveFiles => {
    setActiveFiles(newActiveFiles); // update the active files selection
  };
  const { messages, sendMessage } = useContext(ChatContext);
  const userName = useDataStore(state => state.system_info?.UserName);
  const { t } = useTranslation();

  const handleFirstMessage = input => {
    sendMessage(input, -1, activeFiles, { name: 'Generic' }); // send question with no active query type
    setActiveFilesVisible(false);
  };

  return (
    <div className="workflow-chat-container" data-testid="workflow-chat-container">
      <ActiveFileView
        expanded={activeFilesVisible}
        setExpanded={setActiveFilesVisible}
        onSelectionChange={onActiveFileChange}
        selectFeedbackOnLoad={true}
      />
      {messages.length > 0 ? (
        <Chat
          onMessageSend={() => setActiveFilesVisible(false)}
          onResubmitSend={() => setActiveFilesVisible(false)}
          activeFiles={activeFiles}
          enableEmail={true}
          enableFeedback={true}
        />
      ) : (
        <span className="workflow-chat-starting-container">
          <span className="welcome-message">
            <h1>
              {t('chat.user.welcome')} {userName}
            </h1>
            <p>{t('chat.user.subwelcome')}</p>
          </span>
          <ChatInput
            className="workflow-chat-starting-input"
            handleSendMessage={handleFirstMessage}
            activeFiles={activeFiles}
            placeholder={t('chat.user.workflow_placeholder')}
          />
          {getChatModel() !== 'chat_model' && (
            <p className="welcome-message-chat-model">
              {t('chat.user.current_model')} {getChatModel()}
            </p>
          )}
        </span>
      )}
    </div>
  );
};

export default WorkflowChat;
