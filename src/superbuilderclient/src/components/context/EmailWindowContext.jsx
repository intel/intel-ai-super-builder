import { createContext, useRef, useEffect, useContext } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { AppStatusContext } from "../context/AppStatusContext";
import { invoke } from "@tauri-apps/api/core";

const EmailWindowContext = createContext();

const EmailWindowProvider = ({ children }) => {
  const emailWebviewRef = useRef(null);
  const { closing } = useContext(AppStatusContext);

  const createEmailWebviewRef = async () => {
    // create if not already created
    if (emailWebviewRef.current == null) {
      console.log("Checking if email window already exists...");
      const existingWindow = await WebviewWindow.getByLabel("EmailWindow"); // Await the result

      if (existingWindow) {
        console.log("Email window already exists. Reusing it.");
        emailWebviewRef.current = existingWindow;
        return;
      }
      
      console.log("Creating email webview window instance...");
      emailWebviewRef.current = new WebviewWindow("EmailWindow", {
        url: "email_window.html",
        decorations: false,
        visible: false,
        title: "Email Draft",
      });

      emailWebviewRef.current.once("tauri://created", async () => {
        try {
          await invoke("set_window_borders_command", {
            windowLabel: emailWebviewRef.current.label,
          });
          console.log("Subwindow borders set successfully");
        } catch (error) {
          console.error("Error setting window borders or sending data:", error);
        }
      });

      emailWebviewRef.current.once("tauri://error", (e) => {
        console.error("Error creating webview window:", e);
      });

      console.log("Email webview window created!");
    } else {
      console.log("Email webview window instance already created.");
    }
  };

  const appendMessageToEmail = (question, message) => {
    console.log(
      "Appending question and message to email...  ",
      question,
      message
    );
    createEmailWebviewRef(); // create email window if not created yet

    // WAIT FOR CREATION TO BE DONE!

    // append to window
    emailWebviewRef.current
      .emit("load-email-form", { question, message })
      .then(() => {
        emailWebviewRef.current.show(); // make sure window is visible after append
      });
  };

  const openBugReport = () => {
    console.log("Opening bug report");
    createEmailWebviewRef(); // create email window if not created yet

    // WAIT FOR CREATION TO BE DONE!
    // append to window
    emailWebviewRef.current
      .emit("load-email-form", { bugReport: true })
      .then(() => {
        emailWebviewRef.current.show(); // make sure window is visible after append
      });
  };

  // On creation of this context
  useEffect(() => {
    createEmailWebviewRef(); // create window instance (hidden on start)
  }, []);

  // Make sure email window closes with application closing
  useEffect(() => {
    if (closing) {
      if (emailWebviewRef && emailWebviewRef.current) {
        emailWebviewRef.current.close();
        emailWebviewRef.current = null;
      }
    }
  }, [closing]);

  return (
    <EmailWindowContext.Provider
      value={{
        appendMessageToEmail,
        openBugReport,
      }}
    >
      {children}
    </EmailWindowContext.Provider>
  );
};

export { EmailWindowContext, EmailWindowProvider };
