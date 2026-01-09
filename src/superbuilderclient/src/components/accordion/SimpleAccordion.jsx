import "./SimpleAccordion.css";
import React, { useState } from "react";
import {
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Button,
  Tooltip,
  Typography,
  TextField,
  Card,
  Divider,
  Select,
  MenuItem,
  InputLabel,
  InputAdornment,
  IconButton,
} from "@mui/material";

const SimpleAccordion = ({ 
  title, 
  description, 
  children, 
  variant="normal",
  'data-testid': dataTestId,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleAccordion = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="accordion" data-testid={dataTestId}>
      <button className="accordion-button" onClick={toggleAccordion} data-testid={dataTestId + "-toggle-button"}>
        <div className="accordion-information">
          <Typography className={"accordion-title " + (variant === "small" ? "accordion-small-title" : "")}>{title}</Typography>
          <Typography variant="caption" gutterBottom className="accordion-description">{description}</Typography>
        </div>
        <Typography className="accordion-arrow">{isOpen ? "▲" : "▼"}</Typography>
      </button>
      {isOpen && <div className="accordion-content" data-testid="accordion-content-area">{children}</div>}
    </div>
  );
};

export default SimpleAccordion;
