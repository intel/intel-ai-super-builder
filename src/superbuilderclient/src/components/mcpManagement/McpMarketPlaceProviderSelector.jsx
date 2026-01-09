import React from "react";
import { FormControl, Select, MenuItem, Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { MARKETPLACE_PROVIDERS } from "../../hooks/useMarketPlaceProvider";
import mspLogo from "../../assets/images/msp.svg";
import dockerhubLogo from "../../assets/images/docker.svg";
import "./McpMarketPlaceProviderSelector.css";

const McpMarketPlaceProviderSelector = ({
  selectedProvider,
  onProviderChange,
  disabled = false,
}) => {
  const { t } = useTranslation();

  const providerConfigs = {
    [MARKETPLACE_PROVIDERS.MODELSCOPE]: {
      label: t("mcp.marketplace.provider.modelscope", "ModelScope"),
      icon: <img src={mspLogo} alt="ModelScope" className="provider-icon" />,
    },
    [MARKETPLACE_PROVIDERS.DOCKERHUB]: {
      label: t("mcp.marketplace.provider.dockerhub", "DockerMcpHub"),
      icon: (
        <img src={dockerhubLogo} alt="DockerMcpHub" className="provider-icon" />
      ),
    },
  };

  return (
    <FormControl size="small" className="marketplace-provider-selector">
      <Select
        value={selectedProvider}
        onChange={(e) => onProviderChange(e.target.value)}
        disabled={disabled}
        renderValue={(value) => (
          <Box display="flex" alignItems="center">
            {providerConfigs[value]?.icon}
            <Typography variant="subtitle1">
              {providerConfigs[value]?.label}
            </Typography>
          </Box>
        )}
        sx={{
          background: "var(--bg-secondary-color)",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "var(--divider-color)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "var(--primary-color)",
          },
        }}
      >
        {Object.entries(providerConfigs).map(([key, config]) => (
          <MenuItem key={key} value={key} className="provider-menu-item">
            <Box display="flex" alignItems="center">
              {config.icon}
              <Typography variant="subtitle1">{config.label}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default McpMarketPlaceProviderSelector;
