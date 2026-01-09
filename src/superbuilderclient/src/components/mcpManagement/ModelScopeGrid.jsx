import React from "react";
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Button,
  CircularProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useTranslation } from "react-i18next";
import "./McpMarketPlace.css";

const ModelScopeGrid = ({
  servers,
  processingItems,
  onAdd,
  onRemove,
  isChatReady,
  loadingServers,
  runningServers,
}) => {
  const { t } = useTranslation();

  return (
    <Grid container spacing={2} className="marketplace-grid">
      {servers.map((item) => {
        const isProcessing = processingItems.has(item.id);
        const isLoading = loadingServers.includes(item.name);
        const isRunning = runningServers.includes(item.name);

        return (
          <Grid item key={item.id}>
            <Card
              className={`marketplace-card ${
                item.installed ? "installed" : ""
              }`}
            >
              <CardContent>
                {/* Header */}
                <Box className="card-header">
                  {item.icon &&
                    (typeof item.icon === "string" &&
                    item.icon.startsWith("http") ? (
                      <img
                        src={item.icon}
                        alt={item.name}
                        className="card-icon-image"
                        style={{ width: 48, height: 48, objectFit: "contain" }}
                      />
                    ) : (
                      <Typography className="card-icon">{item.icon}</Typography>
                    ))}
                  {item.installed && (
                    <Chip
                      icon={<CheckCircleIcon />}
                      label={t("mcp.marketplace.added")}
                      color="success"
                      size="small"
                    />
                  )}
                </Box>

                {/* Name */}
                <Typography variant="h6" component="h2" className="card-title">
                  <a
                    href={`https://www.modelscope.cn/mcp/servers/${item.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "inherit",
                      textDecoration: "none",
                      "&:hover": {
                        textDecoration: "underline",
                      },
                    }}
                  >
                    {item.name}
                  </a>
                </Typography>

                {/* Publisher */}
                {item.publisher && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 0.5 }}
                  >
                    {t("mcp.marketplace.by", "by")} {item.publisher}
                  </Typography>
                )}

                {/* Description */}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  className="card-description"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {(() => {
                    // Clean description: remove markdown image syntax, badges, and extra markup
                    const desc =
                      item.description ||
                      item.chineseDescription ||
                      t(
                        "mcp.marketplace.no_description",
                        "No description available"
                      );
                    return desc
                      .replace(/!\[.*?\]\(.*?\)/g, "") // Remove markdown images
                      .replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, "") // Remove badge links
                      .replace(/\[.*?\]\(.*?\)/g, "") // Remove other markdown links
                      .replace(/^#+\s*/gm, "") // Remove markdown headers
                      .replace(/\n+/g, " ") // Replace newlines with spaces
                      .trim();
                  })()}
                </Typography>

                {/* View Count */}
                {item.viewCount !== undefined && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.5 }}
                  >
                    👁️ {item.viewCount.toLocaleString()}{" "}
                    {t("mcp.marketplace.views", "views")}
                  </Typography>
                )}

                {/* Keywords */}
                <Box className="card-keywords">
                  {item.keywords.slice(0, 3).map((keyword) => (
                    <Chip
                      key={keyword}
                      label={keyword}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                  {item.keywords.length > 3 && (
                    <Chip
                      label={`+${item.keywords.length - 3}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              </CardContent>

              {/* Actions */}
              <CardActions className="card-actions">
                {item.installed ? (
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    disabled={
                      !isChatReady || isProcessing || isLoading || isRunning
                    }
                    onClick={() => onRemove(item)}
                  >
                    {isProcessing ? (
                      <>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        {t("mcp.marketplace.removing")}
                      </>
                    ) : isRunning ? (
                      t("mcp.marketplace.running")
                    ) : (
                      t("mcp.marketplace.remove")
                    )}
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    variant="contained"
                    disabled={!isChatReady || isProcessing}
                    onClick={() => onAdd(item)}
                  >
                    {isProcessing ? (
                      <>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        {t("mcp.marketplace.adding")}
                      </>
                    ) : (
                      t("mcp.marketplace.add")
                    )}
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default ModelScopeGrid;
