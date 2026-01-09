import { useEffect, useState } from "react";
import "./assistantLogo.css";
import useDataStore from "../../stores/DataStore";
import super_builder_icon from "../../assets/images/icon.png";

const AssistantLogo = ({
  transparentDefaultBackground=false
}) => {
  const { assistantLogo } = useDataStore();
  return (
    <div className="rectangle-container">
      <div className="rectangle outer">
        <div className={"rectangle me transparent-bg"}>
          {
            assistantLogo === "default" ? <img className="default-logo" src={super_builder_icon} /> : <img className="assistant-logo" src={assistantLogo} />
          }
        </div>
        <div className="rectangle inner" />
      </div>
    </div>
  );
};

export default AssistantLogo;
