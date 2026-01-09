import "./ChatHistory.css";
import { TextField, IconButton } from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useContext, useState, useRef, useEffect } from "react";
import { ChatContext } from "../context/ChatContext";
import useMcpStore from "../../stores/McpStore";
import { useTranslation } from 'react-i18next';

const formatDate = (date) => {
  // Format date as "hh:mm | DDMMMMYYYY"
  return `${date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  })} | ${date.getDate()}${date.toLocaleString("en-US", {
    month: "short",
  })}${date.getFullYear()}`;
};

const SessionItem = ({ session, onClose }) => {
  const { sessions, removeSessions, selectSession, setSessionName } = useContext(ChatContext);
  const mcpManagementOpen = useMcpStore((state) => state.mcpManagementOpen);
  const [hover, setHover] = useState(false);
  const [edit, setEdit] = useState(false);
  const [inputName, setInputName] = useState(session.name);
  const inputNameRef = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (edit) {
      inputNameRef.current.focus(); // focus text area
      inputNameRef.current.setSelectionRange(0, inputNameRef.current.value.length); // Select all text
    }
  }, [edit]); // on edit mode, put input name into focus

  useEffect(() => {
    setInputName(session.name); // update session name if set to something else
  }, [session.name]);

  return (
    <li
      className={`history-item ${session.selected ? "selected" : ""}`}
      data-testid="chat-history-session-item"
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onClick={() => {
        // lock if in edit mode
        if (!edit) {
          selectSession(session.id);
          onClose();
          if (mcpManagementOpen) {
            useMcpStore.getState().closeMcpManagement();
          }
        }
      }}
    >
      <div className="history-item-icons">
        <IconButton
          size="small"
          title={t('chat.edit_tips')}
          className={`history-item-edit history-item-icon ${
            hover ? "history-item-icon-hover" : ""
          }`}
          data-testid="chat-history-edit-session-button"
          onClick={(e) => {
            e.stopPropagation();
            setEdit(true);
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
        {sessions.length > 1 && (
          <IconButton
            size="small"
            title={t('chat.remove_tips')}
            className={`history-item-remove history-item-icon ${
              hover ? "history-item-icon-hover" : ""
            }`}
            data-testid="chat-history-delete-session-button"
            onClick={(e) => {
              e.stopPropagation();
              if (sessions.length > 1) {
                removeSessions(session.id);
              }
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </div>
      <div className="history-item-session">
        <TextField
          inputRef={inputNameRef}
          className={`history-item-session-name ${edit ? "history-item-session-edit-mode" : ""}`}
          InputProps={{
            readOnly: !edit,
          }}
          value={inputName}
          variant="standard"
          data-testid="chat-history-session-name-input"
          onChange={(event) => setInputName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.target.blur();
              onClose();
            }
          }}
          onBlur={(event) => {
            if (edit) {
              setSessionName(session.id, inputName);
              setEdit(false);
            }
          }}
        />
        <div className="history-item-session-date">
          {formatDate(session.date)}
        </div>
      </div>
    </li>
  );
};

export const ChatHistory = ({ isOpen, onClose }) => {
  const { sessions } = useContext(ChatContext);
  return (
    <div
      className={`history-overlay ${isOpen ? "open" : ""}`}
      onClick={onClose}
    >
      <div
        className={`history-container ${isOpen ? "open" : ""}`}
        data-testid="chat-history-container"
        onClick={(e) => e.stopPropagation()}
      >
        <ul className="history-list" type="simple">
          {sessions.map((session) => (
            <SessionItem key={session.id} session={session} onClose={onClose} />
          ))}
        </ul>
      </div>
    </div>
  );
};
