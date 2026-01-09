import React, { useState, useEffect, useRef } from "react";
import "./Email.css";
import { Button, Icon, IconButton, TextField, Stack } from "@mui/material";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { getSettingLanguage } from "../../i18n";
import MinimizeIcon from "@mui/icons-material/Minimize";
import CloseIcon from "@mui/icons-material/Close";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import useDataStore from "../../stores/DataStore";
import AssistantLogo from "../assistantLogo/assistantLogo";

const appWindow = getCurrentWindow();

const Email = () => {
  const { t } = useTranslation();
  const [subject, setSubject] = useState("");
  const [message, setMessageChange] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const textAreaRef = useRef(null);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [isMaximized, setMaximized] = useState(false);
  const maxURILength = 2006;
  const [recipient, setRecipient] = useState("");
  const config = useDataStore((state) => state.config);
  const { getDBConfig } = useDataStore();

  useEffect(() => {
    getDBConfig();
  }, []);

  const onMessageChange = async (e) => {
    await changeMessageText(e);
    adjustTextAreaHeight("to_fit");
  };

  const changeMessageText = async (e) => {
    const newMessage = e.target.value;
    setMessageChange(newMessage);
  };

  function onSubjectChange(e) {
    const newSubject = e.target.value;
    setSubject(newSubject);
  }

  function handleSubmit(e) {
    console.log(
      "communicate with email client API here by putting method='POST' "
    );
  }

  const hiddenDivRef = useRef(null);

  const generateMailtoLink = async () => {
    try {
      setEmailOpen(true);
      const emailData = { subject, message };
      if (recipient && recipient.trim() !== "") {
        emailData.recipient = recipient;
      }
      let reply = await invoke("send_email", emailData);
      console.log(reply);
    } catch (error) {
      console.error("Error sending email:", error);
    }
  };

  const setBugReport = () => {
    const mail_to = "support.aibuilder@intel.com";
    const mail_subject = "Intel AI Super Builder - Issue Report";
    const mail_body = `We apologize for any inconvenience you have experienced with our product. To assist us in debugging the issue, please provide the following information if possible:
    \n1. Please provide a short description of the issue: 
    \n2. What is your CPU info, memory size and GPU info?
    \n3. How to reproduce this issue?
    \n4. Who should we contact about this issue?    
    \n5. Can you provide more details about the error? 
    \n You can find Intel(R) AI Assistant application logs under C:\\temp\\IntelAia\\**datetime**_service.log. If you can share the error information from the log, it will help us troubleshoot the issue.   
    \n\nThank you!
    \n Intel(R) AI Super Builder Team`;

    setRecipient(mail_to);
    setSubject(mail_subject);
    setMessageChange(mail_body);
  };

  const handleClose = async () => {
    setMessageChange(" ");
    setSubject(" ");
    setRecipient("");
    adjustTextAreaHeight("minimum");
    try {
      await appWindow.hide();
    } catch (error) {
      console.error("Error hiding the window:", error);
    }
  };

  const parseSubject = async (question) => {
    let maxLength = question.length;
    maxLength = 50;
    let subjectPreamble = "Intel AI Super Builder Chat - ";
    try {
      let subjectQuestion = question.substring(0, maxLength - 1) + "...";

      setSubject(subjectPreamble + subjectQuestion);
    } catch (error) {
      console.error("Error hiding the window:", error);
    }
  };

  const adjustTextAreaHeight = async (height) => {
    if (height == "to_fit") {
      if (textAreaRef.current) {
        const newHeight = textAreaRef.current.scrollHeight;
        textAreaRef.current.style.height = `${newHeight}px`;
      }
    } else if (height == "minimum") {
      textAreaRef.current.style.height = `${150}px`;
    }
  };

  useEffect(() => {
    adjustTextAreaHeight("minimum");
    adjustTextAreaHeight("to_fit");
  }, [message]);

  useEffect(() => {
    console.log("listening");
    const unlistenPromise = listen("load-email-form", async (eventData) => {
      console.log("Event received:", eventData);

      if (eventData.payload.language) {
        const settingLanguage = await getSettingLanguage();
        i18n.changeLanguage(settingLanguage);
      } else if (eventData.payload.bugReport) {
        setBugReport();
      } else {
        await parseSubject(eventData.payload.question);

        setMessageChange((currentMessage) => {
          return currentMessage
            ? `${currentMessage}\n\n${eventData.payload.question}\n\n${eventData.payload.message}`
            : `${eventData.payload.question}\n\n${eventData.payload.message}`;
        });
      }
    });
    // Clean up the event listener when the component unmounts
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    const handleResize = async () => {
      const maximized = await appWindow.isMaximized();
      setMaximized(maximized);
    };
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="form-container">
      <div className="top-bar" data-tauri-drag-region>
        <div
          className="info-logo-fluid"
          style={{
            "--logo-container-background-color":
              config.ActiveAssistant.header_bg_color,
            padding: "0px",
          }}
        >
          <AssistantLogo
            assistant={config.ActiveAssistant}
            transparentDefaultBackground={true}
          />
        </div>
        <div className="title-text" data-tauri-drag-region>
          {t("email.title_1")}
        </div>
        <div className="window-controls">
          <IconButton
            className="window-control"
            id="min"
            onClick={() => appWindow.minimize()}
            data-testid="email-minimize-window-button"
          >
            <MinimizeIcon fontSize="small" />
          </IconButton>
          <IconButton
            className="window-control"
            id="max"
            onClick={() => appWindow.toggleMaximize()}
            data-testid="email-maximize-window-button"
          >
            {isMaximized ? (
              <CloseFullscreenIcon fontSize="small" />
            ) : (
              <OpenInFullIcon fontSize="small" />
            )}
          </IconButton>
          <IconButton
            className="window-control"
            id="close"
            onClick={() => handleClose()}
            data-testid="email-close-window-button"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
      </div>
      <div className="form-content">
        <form className="contact-form" onSubmit={handleSubmit}>
          <h1>{t("email.title_2")}</h1>
          <label htmlFor="text-area-1">
            <b>{t("email.subject")}</b>
          </label>
          <TextField
            ref={textAreaRef}
            helperText=" "
            id="text-area-1"
            value={subject || ""}
            onChange={onSubjectChange}
            data-testid="email-subject-input-textfield"
          />
          <label htmlFor="text-area-1">
            <b>{t("email.message")}</b>
          </label>
          <TextField
            ref={textAreaRef}
            helperText=" "
            id="text-area-2"
            fullWidth
            multiline
            rows={10}
            value={message || ""}
            onChange={onMessageChange}
            data-testid="email-message-input-textfield"
          />

          <h3>{t("email.note")}</h3>

          <Button
            size="m"
            variant="contained"
            className={`outlook-button ${
              isButtonDisabled ? "disabled-button" : ""
            }`}
            onClick={generateMailtoLink}
            data-testid="email-send-button"
          >
            {t("email.button")}
          </Button>

          {isButtonDisabled && (
            <div className="character-limit-message">
              {t("email.limit_1")} {maxURILength} {t("email.limit_2")}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Email;
