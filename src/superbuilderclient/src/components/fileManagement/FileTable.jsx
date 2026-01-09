import React, { useContext, useEffect, useRef, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import PropTypes from "prop-types";
import { FileManagementContext } from "../context/FileManagementContext";
import { green } from "@mui/material/colors";
import ClipLoader from "react-spinners/ClipLoader";
import DoneOutlineSharpIcon from "@mui/icons-material/DoneOutlineSharp";
import { invoke } from "@tauri-apps/api/core";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { zhCN, zhTW, enUS } from "@mui/x-data-grid/locales";
import i18n from "i18next";

const handleOpenFileLocation = async (filePath) => {
  try {
    await invoke("open_in_explorer", { path: filePath });
  } catch (error) {
    console.error("Error opening file location:", error);
  }
};

export default function FileTable({
  rows,
  enableRemoveButton,
  disableRemoveButton,
  onSelectionChange
}) {
  const { fileStatus, filesLoaded } = useContext(FileManagementContext);
  const gridRef = useRef(null);
  const [gridWidth, setGridWidth] = useState(0);

  useEffect(() => {
    const updateGridWidth = () => {
      if (gridRef.current) {
        setGridWidth(gridRef.current.offsetWidth);
      }
    };

    updateGridWidth();
    window.addEventListener("resize", updateGridWidth);
    return () => window.removeEventListener("resize", updateGridWidth);
  }, []);

  useEffect(() => {
    if (fileStatus === "removed") {
      handleSelectionChange([]); // clear all selections after removal
    }
  }, [fileStatus]);

  const handleSelectionChange = (selectionModel) => {
    const selectedRows = rows.filter((row) => selectionModel.ids.has(row.id));
    if (selectedRows.length > 0) {
      enableRemoveButton();
    } else {
      disableRemoveButton();
    }
    onSelectionChange(selectedRows);
  };

  const colNameMap = {
    name:
      i18n.language === "zh-Hans"
        ? "文件名"
        : i18n.language === "zh-Hant"
        ? "檔案名稱"
        : "Name",
    added:
      i18n.language === "zh-Hans"
        ? "添加"
        : i18n.language === "zh-Hant"
        ? "新增"
        : "Added",
    modified:
      i18n.language === "zh-Hans"
        ? "修改"
        : i18n.language === "zh-Hant"
        ? "修改"
        : "Modified",
    type:
      i18n.language === "zh-Hans"
        ? "类型"
        : i18n.language === "zh-Hant"
        ? "類型"
        : "Type",
    size:
      i18n.language === "zh-Hans"
        ? "大小"
        : i18n.language === "zh-Hant"
        ? "大小"
        : "Size",
    status:
      i18n.language === "zh-Hans"
        ? "状态"
        : i18n.language === "zh-Hant"
        ? "狀態"
        : "Status",
    path:
      i18n.language === "zh-Hans"
        ? "路径"
        : i18n.language === "zh-Hant"
        ? "路徑"
        : "Path",
  };

  const columns = [
    {
      field: "name",
      headerName: colNameMap.name,
      width: gridWidth * 0.3,
      renderCell: (params) => (
        <a
          data-testid={`file-link-${params.row.id}`}
          onClick={() =>
            handleOpenFileLocation(params.row.path + params.row.name)
          }
          style={{
            cursor: "pointer",
            color: "blue",
            textDecoration: "underline",
          }}
        >
          {params.value}
        </a>
      ),
    },
    { field: "added", headerName: colNameMap.added, width: gridWidth * 0.1 },
    {
      field: "modified",
      headerName: colNameMap.modified,
      width: gridWidth * 0.1,
    },
    { field: "type", headerName: colNameMap.type, width: gridWidth * 0.1 },
    { field: "size", headerName: colNameMap.size, width: gridWidth * 0.1 },
    {
      field: "status",
      headerName: colNameMap.status,
      width: gridWidth * 0.1,
      renderCell: (params) => (
        <div>
          {params.value === "not_ready" && <ClipLoader size="15px" />}
          {params.value === "ready" && (
            <DoneOutlineSharpIcon style={{ color: green[500] }} />
          )}
        </div>
      ),
    },
    { field: "path", headerName: colNameMap.path, width: gridWidth * 0.15 },
  ];

  const theme = createTheme(
    {},
    i18n.language == "zh-Hans" ? zhCN : i18n.language == "zh-Hant" ? zhTW : enUS
  );

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ width: "100%" }} ref={gridRef}>
        <Paper sx={{ height: "100%", width: "100%", overflow: "auto" }}>
          <DataGrid
            data-testid="file-table-grid"
            rows={rows}
            columns={columns}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 5 },
              },
            }}
            rowsPerPageOptions={[5, 10]}
            checkboxSelection
            disableRowSelectionOnClick
            onRowSelectionModelChange={handleSelectionChange}
            sx={{ border: 0 }}
          />
          {!filesLoaded && (
            <div className="table-loading-container">
              <div className="loading-spinner table-spinner"></div>
              <p>Getting files...</p>
            </div>
          )}
        </Paper>
      </Box>
    </ThemeProvider>
  );
}

FileTable.propTypes = {
  rows: PropTypes.array.isRequired,
  enableRemoveButton: PropTypes.func.isRequired,
  disableRemoveButton: PropTypes.func.isRequired,
  onSelectionChange: PropTypes.func.isRequired,
};
