import "./AdvancedSlider.css";
import React from "react";
import { Slider } from "@mui/material";

const AdvancedSlider = ({ 
    label, 
    description, 
    value, 
    onChange, 
    onChangeCommitted, // Add new prop
    min, 
    max, 
    step = 1, 
    disable = false 
}) => {
    // Ensure value is a number
    const numericValue = Number(value);

    const handleInputChange = (e) => {
        const newValue = e.target.value === '' ? min : Number(e.target.value);
        if (newValue >= min && newValue <= max) {
            onChange(newValue);
            onChangeCommitted(newValue);
        }
    };

    const handleSliderChange = (e, newValue) => {
        onChange(Number(newValue));
    };

    const handleSliderChangeCommitted = (event, newValue) => {
        if (onChangeCommitted) {
            onChangeCommitted(Number(newValue));
        }
    };

    return (
        <div className="advanced-slider-container">
            <div className="slider-container">
                <div className="slider-information">
                    {description}
                    <span className="slider-label">{label}</span>
                </div>
                <Slider
                    className="slider"
                    min={min}
                    max={max}
                    step={step}
                    value={numericValue}
                    onChange={handleSliderChange}
                    onChangeCommitted={handleSliderChangeCommitted}  // Add this line
                    disabled={disable}
                    aria-labelledby={`slider-label-${label}`}
                    valueLabelDisplay="auto"
                />
            </div>
            <input
                className="slider-input"
                data-testid="advanced-slider-input"
                type="number"
                step={step}
                value={numericValue}
                onChange={handleInputChange}
                disabled={disable}
            />
        </div>
    );
};

export default AdvancedSlider;
