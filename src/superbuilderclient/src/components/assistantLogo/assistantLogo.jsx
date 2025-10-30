import { useEffect, useState } from "react";
import "./assistantLogo.css";
import useDataStore from "../../stores/DataStore";

const AssistantLogo = ({
  transparentDefaultBackground=false,
}) => {
  const { assistant, assistantLogo } = useDataStore();
  return (
    <div className="rectangle-container">
      <div className="rectangle outer">
        <div className={"rectangle me" + ((assistantLogo !== "default" || transparentDefaultBackground) ? " transparent-bg" : "")}>
          {
            assistantLogo === "default" ? assistant.short_name : <img className="assistant-logo" src={assistantLogo} />
          }
        </div>
        <div className="rectangle inner" />
      </div>
    </div>
  );
};

export default AssistantLogo;
