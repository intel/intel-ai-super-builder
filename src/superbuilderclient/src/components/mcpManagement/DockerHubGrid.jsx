import React from "react";
import {
  Container,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import SecurityIcon from "@mui/icons-material/Security";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import dockerLogo from "../../assets/images/docker.svg";
import "./McpMarketPlace.css";

const DockerHubGrid = ({}) => {
  const { t } = useTranslation();

  const features = [
    {
      icon: <CloudDownloadIcon color="primary" />,
      title: t("mcp.dockerhub.feature.repository", "Official MCP Repository"),
      description: t(
        "mcp.dockerhub.feature.repository_desc",
        "Access the largest library of containerized MCP servers, pre-built and ready to deploy from Docker Hub."
      ),
    },
    {
      icon: <SecurityIcon color="primary" />,
      title: t("mcp.dockerhub.feature.verified", "Verified, Safe & Trusted"),
      description: t(
        "mcp.dockerhub.feature.verified_desc",
        "All servers are verified and maintained by the community."
      ),
    },
  ];

  return (
    <Container maxWidth="md" className="dockerhub-intro">
      <Box sx={{ width: "100%" }}>
        <Paper elevation={3} className="intro-paper">
          {/* Docker Logo */}
          <div className="docker-logo-container">
            <div className="docker-logo">
              <img
                src={dockerLogo}
                alt="Docker Logo"
                className="docker-logo-image"
              />
            </div>
          </div>

          {/* Header */}
          <Box sx={{ textAlign: "center", marginBottom: "1rem" }}>
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              className="intro-title"
            >
              {t("mcp.dockerhub.title", "Docker MCP Hub")}
            </Typography>

            <Typography
              variant="h6"
              color="text.secondary"
              className="intro-subtitle"
            >
              {t("mcp.dockerhub.subtitle", "World's largest registry of containerized and security-hardened MCP Servers")}
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} className="divider" />

{/*
          <Box sx={{ margin: "2rem 0", textAlign: "justify", lineHeight: 1.8 }}>
            <Typography variant="body1" paragraph className="description-text">
              {t(
                "mcp.dockerhub.description1",
                ""
              )}
            </Typography>

            <Typography variant="body1" paragraph className="description-text">
              {t(
                "mcp.dockerhub.description2",
                ""
              )}
            </Typography>
          </Box>
          <Box sx={{ margin: "2rem 0" }}>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ mb: 2 }}
              className="features-title"
            >
              {t("mcp.dockerhub.features_title", "Key Features")}
            </Typography>
            <List>
              {features.map((feature, index) => (
                <ListItem alignItems="flex-start" className="feature-item">
                  <ListItemIcon sx={{ minWidth: 48 }} className="feature-icon">
                    {feature.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" fontWeight="600">
                        {feature.title}
                      </Typography>
                    }
                    secondary={feature.description}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
*/}
          {/* Intro message */}
          <Box sx={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <Typography
              variant="body2"
              color="info.main"
              sx={{ fontWeight: 500 }}
            >
              {t(
                "mcp.dockerhub.intro",
                "MCP Marketplace integration with Docker MCP Hub is coming soon!"
              )}
            </Typography>

            <Typography
              variant="body2"
              color="info.main"
              sx={{ fontWeight: 500 }}
            >
              {t(
                "mcp.dockerhub.manual",
                "For now, you can manually add Docker MCP servers via MCP Management."
              )}
            </Typography>
          </Box>

          {/* Info message */}
          <Box sx={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <Typography
              variant="body2"
              color="warning.main"
              sx={{ fontWeight: 500 }}
            >
              {t(
                "mcp.dockerhub.manual",
                "Please ensure Docker is pre-installed and configured before adding Docker MCP servers."
              )}
            </Typography>
          </Box>

          {/* Dockerhub button */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <Button
              variant="contained"
              size="large"
              href="https://hub.docker.com/mcp"
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNewIcon />}
              className="docker-button"
            >
              {t("mcp.dockerhub.learn_more", "Explore Docker MCP Hub")}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default DockerHubGrid;
