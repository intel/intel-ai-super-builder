import React, { useEffect, useState, useRef, useContext } from "react";
import "./ChatInput.css"
import { ChatContext } from "../context/ChatContext";
import { IconButton, TextField } from "@mui/material";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

const ChatInput = ({
        readyToChat=true,
        defaultValue="",
        handleSendMessage,
        placeholder="Enter your prompt",
        activeFiles=[],
        defaultValueOnActiveFilesChange=false,
    }) => {
    const [input, setInput] = useState(defaultValue);
    const defaultPlaceholderText = placeholder;
    const [placeholderText, setPlaceholderText] = useState(defaultPlaceholderText);
    const {
        stopChatGeneration,
        isStreamCompleted,
        isWaitingForFirstToken,
        isChatReady,
    } = useContext(ChatContext);
    const inputRef = useRef();
    const [messageComplete, setMessageComplete] = useState(false);

    // set input to be default value anytime active files list changes
    useEffect(() => {
      if (defaultValue != "") {
        setInput(defaultValue);
      }
    }, [activeFiles]);

    const sendMessage = async () => {
        if (!isChatReady || input === "") {
            return;
        }
        setInput(""); // clear input field
        const formattedInput = formatUserInputText(input); // trim and clean up user input for better LLM performance
        handleSendMessage(formattedInput); // send to parent component to handle message sending
        setMessageComplete(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
          if (input === "") {
            e.preventDefault(); // prevent new line enter if no text
          }
          if (!e.shiftKey) {
            sendMessage(e); // not a line break, send input message to LLM
            e.preventDefault();
          }
        }
    };
    
    // Return text that is formatted for UI display and LLM input
    const formatUserInputText = (text) => {
        return text.trim(); //only trim whitespaces for now
    };

    const focusChatInput = () => {
      if (input==="") {
        inputRef.current?.focus();
      }
    }

    // focus chat input anytime message completes
    useEffect(() => {
        if (isStreamCompleted) {
          setMessageComplete(true);
        }
    }, [isStreamCompleted]);
    useEffect(() => {
      if (messageComplete && isChatReady) {
        setMessageComplete(false);
        focusChatInput();
      }
    }, [isChatReady, messageComplete]);

    // focus text input when this first loads
    useEffect(() => {
      focusChatInput();
    }, []);

    return (
      <div className="chat-input-container">
        <TextField
          variant="standard"
          inputRef={inputRef}
          value={input}
          onKeyDown={handleKeyDown}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholderText}
          multiline
          maxRows={4}
          fullWidth
          disabled={!isChatReady}
          data-testid="chat-message-input-textfield"
          InputProps={{
            disableUnderline: true,
          }}
          sx={{
            userSelect:"none",
            borderRadius:"10px",
            padding:"14px",
            '& .MuiInputBase-root': { color:"var(--text-primary-color)", fontFamily: 'IntelOne Display, sans-serif' }
          }}
        />
        <div className="chat-input-options">
          {!isWaitingForFirstToken && !isStreamCompleted ? (
            <IconButton
              onClick={stopChatGeneration}
              data-testid="chat-stop-generation-button"
              sx={{
                width:"40px",
                height:"40px",
                backgroundColor:"#ff5050",
                '&:hover': {
                  backgroundColor: '#ff8383ff',
                },
              }}
              color="error"
              variant="contained"
            >
              <StopIcon
                sx={{ color: "white" }}
                fontSize="large"
              />
            </IconButton>
          ) : (
            <IconButton
              onClick={sendMessage}
              disabled={!isChatReady || input === "" || !readyToChat}
              data-testid="chat-send-message-button"
              sx={{width:"40px", height:"40px", backgroundColor:"var(--primary-main-color)", "&.Mui-disabled": {background: "rgb(196, 196, 196)"}}}
            >
              <PlayArrowIcon
                sx={{ color: "white" }}
                fontSize="large"
              />
            </IconButton>
          )}
        </div>
      </div>
    );
};

export default ChatInput;