import React, { useEffect, useState, useRef, useContext } from "react";
import "./Chat.css";
import AssistantLogo from "../assistantLogo/assistantLogo";
import FeedbackRow from "../feedback/Feedback";
import DragAndDrop from "../dragAndDrop/DragAndDrop";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism"; // Choose any style
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { ChatContext } from "../context/ChatContext";
import { invoke } from "@tauri-apps/api/core";
import { IconButton, Typography, Link } from "@mui/material";
import useDataStore from "../../stores/DataStore";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import ChatInput from "./ChatInput";

const CodeBlock = ({ language, value }) => {
  return (
    <SyntaxHighlighter language={language} style={materialDark}>
      {value}
    </SyntaxHighlighter>
  );
};

const ThinkingBlock = React.memo(({ thinking, thinkingComplete = false, isExpanded, onToggle }) => {
  const { t } = useTranslation();

  if (!thinking || thinking.trim() === "") {
    return null;
  }

  const label = thinkingComplete ? t("chat.thought") : t("chat.thinking");

  return (
    <div className="thinking-container">
      <div className="thinking-header" onClick={onToggle}>
        <div className="thinking-title">
          <span className="thinking-icon">💭</span>
          <span className="thinking-label">
            {label}
            {!thinkingComplete && (
              <span className="thinking-dots">
                <span className="dot-1">.</span>
                <span className="dot-2">.</span>
                <span className="dot-3">.</span>
              </span>
            )}
          </span>
        </div>
        <IconButton
          size="small"
          className="thinking-toggle"
        >
          {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </IconButton>
      </div>
      {isExpanded && (
        <div className="thinking-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {thinking}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
});

const ChatMessage = ({ text, references = [], openFile, markdownRef, thinking, thinkingComplete }) => {
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
  
  const handleToggleThinking = React.useCallback(() => {
    setIsThinkingExpanded(prev => !prev);
  }, []);
  
  const getFileLink = (reference) => {
    return `${reference.file}`;
  };

  const getFileName = (filepath, page, sheet) => {
    let filepathSplit = filepath.split("\\");
    let filename = filepathSplit[filepathSplit.length - 1];
    if (sheet != null && sheet != "") {
      return "Sheet '" + sheet + "' of User Document: '" + filename + "'"; // add table sheet name if there is one
    } else if (page != null && page > 0) {
      return "Page '" + page + "' of User Document: '" + filename + "'"; // return filename and page number
    } else {
      return "User Document: '" + filename + "'"; // return just the filename
    }
  };

  // Convert both literal \n and actual newlines to proper markdown line breaks
  const processedText = text.replace(/\\n/g, "\n").replace(/\n/g, "  \n");

  return (
    <div className="chat-message" data-testid="chat-message-container">
      <ThinkingBlock 
        thinking={thinking} 
        thinkingComplete={thinkingComplete}
        isExpanded={isThinkingExpanded}
        onToggle={handleToggleThinking}
      />
      <span ref={markdownRef} data-testid="chat-response-markdown">
        <ReactMarkdown
          children={processedText}
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              return !inline && match ? (
                <CodeBlock
                  language={match[1]}
                  value={String(children).replace(/\n$/, "")}
                  {...props}
                />
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            img({ node, ...props }) {
              return (
                <div className="chat-image">
                  <img
                    src={`data:image/png;base64, ${props.src}`}
                    alt={props.alt || "Image"}
                  />
                </div>
              );
            },
            table({ children, ...props }) {
              return (
                <div className="chat-markdown-table-container">
                  <table className="chat-markdown-table" {...props}>
                    {children}
                  </table>
                </div>
              );
            },
            th({ children, ...props }) {
              return <th {...props}>{children}</th>;
            },
            td({ children, ...props }) {
              return <td {...props}>{children}</td>;
            },
            a({ href, children, ...props }) {
              return (
                <Link
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                >
                  {children}
                </Link>
              );
            },
          }}
        />
      </span>
      {references.length > 0 && (
        <div>
          References:
          <ul>
            {references.map((reference, index) => (
              <li key={index}>
                <Link
                  key={index}
                  component="button"
                  variant="body1"
                  underline="hover"
                  onClick={() => openFile(getFileLink(reference))}
                  sx={{fontSize: "14px"}}
                  data-testid={`chat-reference-file-link-${index}`}
                >
                  {getFileName(reference.file, reference.page, reference.sheet)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const ChatBlock = ({ message, index, messages, isWaitingForFirstToken, handleResubmit, enableFeedback, enableEmail, handleOpenFileLocation, t }) => {
  const markdownRef = useRef(null);
  return (
    <div>
      <div className={`message ${message.sender}`}>
        <div className="sender-logo">
          {message.sender !== "user" ? (
            <AssistantLogo />
          ) : (
            <div className={`sender-logo ${message.sender}`} />
          )}
        </div>
        <div className={`message-text ${message.sender}`}>
          {message.sender === "assistant" ? (
            <ChatMessage
              text={message.text}
              references={message.references}
              openFile={handleOpenFileLocation}
              markdownRef={markdownRef}
              thinking={message.thinking}
              thinkingComplete={message.thinkingComplete}
            />
          ) : (
            message.text
          )}
          {message.sender !== "user" &&
            index === messages.length - 1 &&
            isWaitingForFirstToken && (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>{t("chat.processing")}</p>
              </div>
            )}
        </div>
      </div>
      <div>
        {index !== 0 && message.sender !== "user" ? (
          <FeedbackRow
            question={messages[index - 1].text}
            message={message.text}
            messageIndex={index}
            resubmitQuestion={handleResubmit}
            enableSendFeedback={enableFeedback}
            enableEmail={enableEmail}
            markdownRef={markdownRef}
          />
        ) : (
          <div />
        )}
      </div>
    </div>
  );
};

const Chat = ({
  readyToChat = true,
  defaultValue = "",
  placeholder = "Enter your prompt",
  activeFiles = [],
  queryType = "Generic",
  onMessageSend = () => {},
  onResubmitSend = () => {},
  enableFeedback = false,
  enableEmail = true
}) => {
  const { messages, sendMessage, isWaitingForFirstToken, isChatReady } =
    useContext(ChatContext);

  const { t } = useTranslation();
  const { assistant } = useDataStore();

  const endRef = useRef();

  const handleOpenFileLocation = async (filePath) => {
    try {
      // console.log(`Opening file ${filePath}...`);
      await invoke("open_in_explorer", { path: filePath });
    } catch (error) {
      console.error("Error opening file location:", error);
    }
  };

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const grayedOutClass =
    assistant?.models["chat_model"] == "chat_model" ? "grayed-out" : "";
  const className = `chat-container ${grayedOutClass}`;

  // Handle sending a question again on Feedback row resubmit
  const handleResubmit = (prompt, messageIndex) => {
    if (!isChatReady) return;
    sendMessage(prompt, messageIndex, activeFiles, { name: queryType }); // send chat message to Tauri Chat API
    onResubmitSend();
  };

  const handleSendMessage = (prompt) => {
    if (!isChatReady) return;
    sendMessage(prompt, -1, activeFiles, { name: queryType }); // send chat message to Tauri Chat API with no resubmit index
    onMessageSend();
  };

  return (
    <div className={className} data-testid="chat-container">
      {/* Messages area */}
      <div className="messages-container">
        {messages.map((message, index) => (
          <ChatBlock 
            key={message.id}
            message={message} 
            index={index}
            messages={messages}
            isWaitingForFirstToken={isWaitingForFirstToken}
            handleResubmit={handleResubmit}
            enableFeedback={enableFeedback}
            enableEmail={enableEmail}
            handleOpenFileLocation={handleOpenFileLocation}
            t={t}
          />
        ))}
        <div ref={endRef} />
      </div>
      <ChatInput
        className="chat-input"
        readyToChat={readyToChat}
        defaultValue={defaultValue}
        placeholder={placeholder}
        handleSendMessage={handleSendMessage}
        activeFiles={activeFiles}
      />
    </div>
  );
};

export default Chat;
