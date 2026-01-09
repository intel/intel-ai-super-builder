import React, { useContext, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from "@mui/material";

import SimpleAccordion from "../accordion/SimpleAccordion";
import useDataStore from "../../stores/DataStore";
import useMcpStore from "../../stores/McpStore";
import { useTranslation } from "react-i18next";
import { ChatContext } from "../context/ChatContext";

const ConfImportExport = () => {
  const { t } = useTranslation();
  const config = useDataStore((state) => state.config);
  const { isChatReady, setIsChatReady } = useContext(ChatContext);
  const [exportDialog, setExportDialog] = useState(false);
  const [exportPath, setExportPath] = useState("");
  const [exportedFilename, setExportedFilename] = useState("");

  const handleImport = async () => {
    const file = await open({
      multiple: false,
      directory: false,
      filters: [
        {
          name: "Intel AIA config file",
          extensions: ["aia"],
        },
      ],
    });
    if (file) {
      console.log(file);
      const importResult = await useDataStore.getState().importConfig(file);

      if (importResult) {
        // Trigger MCP data refresh
        useMcpStore.getState().triggerRefresh();
        console.log("MCP data refresh triggered.");
      }

      useDataStore.getState().setEnableAllFeature(false);
      await useDataStore.getState().getDBConfig();
    }
  };

  const handleExport = async () => {
    const path = await open({
      multiple: false,
      directory: true,
    });
    if (path) {
      console.log(path);
      setExportPath(path);
      setIsChatReady(false);
      const response = await useDataStore
        .getState()
        .exportConfig(config.ActiveAssistant.full_name, path);
      setIsChatReady(true);
      if (response) {
        setExportedFilename(response);
        setExportDialog(true);
      }
    }
  };

  return (
    <>
      <SimpleAccordion
        title={t("setting.confimportexport.title")}
        description={t("setting.confimportexport.description")}
      >
        <Card
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: "8px",
            boxShadow: 0,
            bottom: 20,
          }}
        >
          <Button
            variant="contained"
            fullWidth
            onClick={handleImport}
            disabled={!isChatReady}
            data-testid="config-import-button"
          >
            {t("setting.confimportexport.button.import")}
          </Button>
          <Button
            variant="contained"
            fullWidth
            onClick={handleExport}
            disabled={!isChatReady}
            data-testid="config-export-button"
          >
            {t("setting.confimportexport.button.export")}
          </Button>
        </Card>
      </SimpleAccordion>

      <Dialog open={exportDialog} onClose={() => setExportDialog(false)} data-testid="export-success-dialog">
        <DialogTitle
          sx={{ backgroundColor: config.ActiveAssistant.sidebar_box_bg_color }}
        >
          {t("setting.confimportexport.info.suc")}
        </DialogTitle>
        <DialogContent sx={{ mt: "12px" }}>
          {t("setting.confimportexport.info.location")} <br />
          {exportPath} <br />
          <br />
          {t("setting.confimportexport.info.filename")} {exportedFilename}
        </DialogContent>
        <DialogActions sx={{ padding: 0 }}>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            onClick={() => setExportDialog(false)}
            sx={{ borderRadius: "0px" }}
            data-testid="export-success-close-button"
          >
            {t("setting.confimportexport.info.ok")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ConfImportExport;
