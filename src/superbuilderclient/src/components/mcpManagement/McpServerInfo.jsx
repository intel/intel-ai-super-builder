import React from "react";
import {
  Box,
  Typography,
  Divider,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useTranslation } from "react-i18next";

const McpServerInfo = ({
  serverName,
  serverConfig,
  tools = [],
  isLoading = false,
  showServerName = true,
  show = "full",
}) => {
  const { t } = useTranslation();

  if (!serverConfig && !isLoading) {
    return (
      <Alert severity="warning">{t("mcp.ui.mcp_server_info_empty")}</Alert>
    );
  }

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 4,
        }}
      >
        <CircularProgress />
        <Typography sx={{ marginLeft: 2 }}>
          {t("mcp.tools_dialog.loading")}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Server Name */}
      {showServerName && serverName && (
        <Box mb={2}>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            {t("mcp.tools_dialog.server_name")}
          </Typography>
          <Typography
            variant="body2"
            component="code"
            sx={{
              fontFamily: "monospace",
              backgroundColor: "rgba(0, 0, 0, 0.05)",
              padding: "8px 12px",
              borderRadius: "4px",
              wordBreak: "break-all",
              display: "block",
            }}
          >
            {serverName}
          </Typography>
        </Box>
      )}

      {/* Server Configuration */}
      {show === "full" && (
        <>
          {serverConfig?.command && (
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                {t("mcp.tools_dialog.command")}
              </Typography>
              <Typography
                variant="body2"
                component="code"
                sx={{
                  fontFamily: "monospace",
                  backgroundColor: "rgba(0, 0, 0, 0.05)",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  border: "1px solid rgba(0, 0, 0, 0.1)",
                  wordBreak: "break-all",
                  whiteSpace: "pre-wrap",
                  display: "block",
                }}
              >
                {serverConfig.command}
                {serverConfig.args && ` ${serverConfig.args}`}
              </Typography>
            </Box>
          )}

          {serverConfig?.url && (
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                {t("mcp.tools_dialog.url")}
              </Typography>
              <Typography
                variant="body2"
                component="code"
                sx={{
                  fontFamily: "monospace",
                  backgroundColor: "rgba(0, 0, 0, 0.05)",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  border: "1px solid rgba(0, 0, 0, 0.1)",
                  wordBreak: "break-all",
                  display: "block",
                }}
              >
                {serverConfig.url}
              </Typography>
            </Box>
          )}

          {serverConfig?.env && (
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                {t("mcp.tools_dialog.environment")}
              </Typography>
              <Typography
                variant="body2"
                component="code"
                sx={{
                  fontFamily: "monospace",
                  backgroundColor: "rgba(0, 0, 0, 0.05)",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  border: "1px solid rgba(0, 0, 0, 0.1)",
                  wordBreak: "break-all",
                  whiteSpace: "pre-wrap",
                  display: "block",
                }}
              >
                {serverConfig.env}
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* Divider */}
      {show === "full" && <Divider sx={{ my: 2 }} />}

      {/* Tools  */}
      <>
        {tools.length > 0 ? (
          <Box>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              {t("mcp.tools_dialog.available_tools")} ({tools.length})
            </Typography>

            {tools.map((tool, index) => (
              <Box key={index} sx={{ mb: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <Typography
                    variant="subtitle1"
                    component="code"
                    sx={{
                      fontWeight: 600,
                      fontFamily: "monospace",
                      backgroundColor: "rgba(0, 0, 0, 0.05)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    {tool.name}
                  </Typography>
                  {tool.type === "error" && (
                    <Chip
                      label="Error"
                      color="error"
                      size="small"
                      sx={{ marginLeft: 1 }}
                    />
                  )}
                </Box>

                <Typography
                  variant="body2"
                  sx={{
                    color:
                      tool.type === "error" ? "error.main" : "text.secondary",
                    mb: 1,
                    pl: 1,
                  }}
                >
                  {tool.description || t("mcp.tools_dialog.no_description")}
                </Typography>

                {tool.parameters && tool.parameters.properties && (
                  <Box sx={{ mt: 1, pl: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>
                      {t("mcp.tools_dialog.parameters")}:
                    </Typography>
                    <Box
                      sx={{
                        mt: 0.5,
                        backgroundColor: "rgba(0, 0, 0, 0.03)",
                        borderRadius: "4px",
                        padding: "8px 12px",
                      }}
                    >
                      {Object.keys(tool.parameters.properties).map(
                        (paramKey) => {
                          const param = tool.parameters.properties[paramKey];
                          const isRequired =
                            tool.parameters.required?.includes(paramKey);
                          return (
                            <Box key={paramKey} sx={{ mb: 0.5 }}>
                              <Typography variant="caption">
                                <code
                                  style={{
                                    fontFamily: "monospace",
                                    backgroundColor: "rgba(0, 0, 0, 0.1)",
                                    padding: "2px 6px",
                                    borderRadius: "3px",
                                    fontWeight: 500,
                                  }}
                                >
                                  {paramKey}
                                </code>
                                {isRequired && (
                                  <span
                                    style={{
                                      color: "red",
                                      marginLeft: "4px",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    *
                                  </span>
                                )}
                                <span style={{ fontFamily: "monospace" }}>
                                  {" - "}
                                  <span style={{ fontStyle: "italic" }}>
                                    {param.type}
                                  </span>
                                </span>
                                {param.description && (
                                  <>
                                    {": "}
                                    <span>{param.description}</span>
                                  </>
                                )}
                              </Typography>
                            </Box>
                          );
                        }
                      )}
                    </Box>
                  </Box>
                )}

                {index < tools.length - 1 && <Divider sx={{ mt: 2 }} />}
              </Box>
            ))}
          </Box>
        ) : (
          <Alert severity="warning">{t("mcp.tools_dialog.no_tools")}</Alert>
        )}
      </>
    </Box>
  );
};

export default McpServerInfo;
