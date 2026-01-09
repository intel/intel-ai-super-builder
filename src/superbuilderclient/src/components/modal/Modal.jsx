// Modal.jsx
import React, { useEffect } from "react";
import "./Modal.css"; // Import the styles for the modal
import { resolve } from "@tauri-apps/api/path";
import { readDir } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";

const Modal = ({ isOpen, onClose, children, isInit}) => {
  if(isInit || isOpen) {
  return (
    <div className="modal-overlay" data-testid="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
        {!isInit && (
        <button data-testid="modal-close-button" onClick={onClose}>Close</button> )}
      </div>
    </div>
  );
}
else {
  return null
}
};

export default Modal;
