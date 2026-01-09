import { useContext, useState, useRef, useEffect } from "react";
import "./SidebarOverlay.css";

const SidebarOverlay = ({ isOpen, onClose, content }) => {
  return (
    <div
      className={`sidebar-overlay ${isOpen ? "open" : ""}`}
      onClick={onClose}
      data-testid="sidebar-overlay-backdrop-container"
    >
      <div
        className={`sidebar-overlay-container ${isOpen ? "open" : ""}`}
        onClick={(e) => e.stopPropagation()}
        data-testid="sidebar-overlay-container"
      >
        {content}
      </div>
    </div>
  );
};

export default SidebarOverlay;