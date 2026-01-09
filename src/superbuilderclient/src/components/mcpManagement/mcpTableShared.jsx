import React from "react";
import { useTheme } from "@mui/material/styles";
import { Box, Button, Typography, CircularProgress } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

/**
 * Shared constants and utilities for MCP table components
 */

// Common styles used by both MCP table components
export const MCP_TABLE_STYLES = {
  cellText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    width: "100%",
  },
  container: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    minHeight: 200,
    maxHeight: "100%",
  },
  paper: {
    height: "fit-content",
    width: "100%",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    minHeight: 200,
    maxHeight: "100%",
  },
  dataGrid: {
    height: "fit-content !important",
    minHeight: 200,
    marginBottom: 2,
    maxHeight: "100% !important",
    "& .MuiDataGrid-cell": {
      padding: "4px 8px",
      minHeight: "42px !important",
      maxHeight: "42px !important",
      height: "42px !important",
      display: "flex !important",
      alignItems: "center !important",
      overflow: "hidden !important",
      whiteSpace: "nowrap !important",
      textOverflow: "ellipsis !important",
      lineHeight: "1.2 !important",
      "&:focus, &:focus-within": {
        outline: "none !important",
      },
    },
    "& .MuiDataGrid-columnHeader": {
      padding: "0 8px",
      minHeight: "40px !important",
      maxHeight: "40px !important",
      height: "40px !important",
    },
    "& .MuiDataGrid-columnHeader .MuiDataGrid-menuIcon": {
      visibility: "visible !important",
      width: "auto !important",
      opacity: 1,
    },
    "& .MuiDataGrid-row": {
      minHeight: "42px !important",
      maxHeight: "42px !important",
      height: "42px !important",
    },
    "& .MuiDataGrid-virtualScrollerContent": {
      minHeight: "auto !important",
    },
    "& .MuiDataGrid-virtualScroller": {
      minHeight: "100px !important",
      overflow: "auto !important",
    },
  },
  actionsContainer: {
    display: "flex",
    alignItems: "center",
    height: "100%",
    width: "100%",
    gap: "4px",
  },
  // Horizontal layout styles - use 100% height to fill the container
  paperHorizontal: {
    height: "100%",
    width: "100%",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    minHeight: 200,
    border: "1px solid",
    borderColor: "divider",
    borderRadius: "4px",
    boxSizing: "border-box",
  },
  dataGridHorizontal: {
    height: "100% !important",
    minHeight: 200,
    maxHeight: "100% !important",
    border: "1px solid",
    borderColor: "divider",
    display: "flex !important",
    flexDirection: "column !important",
    overflow: "hidden !important",
    "& .MuiDataGrid-main": {
      flex: "1 1 0 !important",
      minHeight: "0 !important",
      maxHeight: "none !important",
      overflow: "hidden !important",
      display: "flex !important",
      flexDirection: "column !important",
    },
    "& .MuiDataGrid-cell": {
      padding: "4px 8px",
      minHeight: "42px !important",
      maxHeight: "42px !important",
      height: "42px !important",
      display: "flex !important",
      alignItems: "center !important",
      overflow: "hidden !important",
      whiteSpace: "nowrap !important",
      textOverflow: "ellipsis !important",
      lineHeight: "1.2 !important",
      "&:focus, &:focus-within": {
        outline: "none !important",
      },
    },
    "& .MuiDataGrid-columnHeader": {
      padding: "0 8px",
      minHeight: "40px !important",
      maxHeight: "40px !important",
      height: "40px !important",
    },
    "& .MuiDataGrid-columnHeader .MuiDataGrid-menuIcon": {
      visibility: "visible !important",
      width: "auto !important",
      opacity: 1,
    },
    "& .MuiDataGrid-row": {
      minHeight: "42px !important",
      maxHeight: "42px !important",
      height: "42px !important",
    },
    "& .MuiDataGrid-virtualScrollerContent": {
      minHeight: "auto !important",
    },
    "& .MuiDataGrid-virtualScroller": {
      flex: "1 1 0 !important",
      minHeight: "100px !important",
      maxHeight: "none !important",
      overflow: "auto !important",
      height: "auto !important",
    },
    "& .MuiDataGrid-footerContainer": {
      flex: "0 0 auto !important",
      minHeight: "44px !important",
      maxHeight: "44px !important",
      height: "44px !important",
      borderTop: "1px solid",
      borderColor: "divider",
    },
  },
};

/**
 * Creates a standard text column with proper truncation
 */
export const createTextColumn = (
  field,
  headerName,
  flex = 1,
  minWidth = 120
) => ({
  field,
  headerName,
  flex,
  minWidth,
  renderCell: (params) => (
    <Box sx={MCP_TABLE_STYLES.cellText}>{params.value || ""}</Box>
  ),
});

/**
 * Generates unique IDs for table rows to prevent React key conflicts
 */
export const generateUniqueRows = (rawRows, nameField = "name") => {
  const uniqueRows = [];
  const seenIds = new Set();

  rawRows.forEach((row, index) => {
    let uniqueId = row.id;

    // If ID is duplicate or missing, generate a unique one
    if (!uniqueId || seenIds.has(uniqueId)) {
      const itemName = row[nameField] || row.server_name || "item";
      uniqueId = `${itemName}_${index}_${Date.now()}`;
      console.warn(
        `Duplicate or missing ID detected for: ${itemName}. Generated unique ID: ${uniqueId}`
      );
    }

    seenIds.add(uniqueId);
    uniqueRows.push({
      ...row,
      id: uniqueId,
    });
  });

  return uniqueRows;
};

/**
 * Common DataGrid props for consistent table behavior
 */
export const MCP_DATAGRID_PROPS = {
  initialState: {
    pagination: {
      paginationModel: { pageSize: 10 },
    },
  },
  pageSizeOptions: [5, 10, 25, 50],
  disableRowSelectionOnClick: true,
  density: "compact",
  autoHeight: false,
  getRowHeight: () => 42,
  getEstimatedRowHeight: () => 42,
};

/**
 * Creates an action button with consistent styling and responsive behavior
 */
export const createActionButton = (
  text,
  className,
  disabled,
  onClick,
  loading = false,
  loadingText = ""
) => {
  const theme = useTheme();
  const isWide = window.innerWidth > 1750;

  return (
    <Button
      size="small"
      variant="contained"
      className={className}
      disabled={disabled || loading}
      onClick={onClick}
      sx={{
        position: "relative",
        minWidth: 80,
      }}
    >
      {loading ? (
        <CircularProgress
          size={18}
          sx={{
            color: theme.palette.secondary.contrastText,
            position: "absolute",
            left: "50%",
            top: "50%",
            marginTop: "-9px",
            marginLeft: "-9px",
          }}
        />
      ) : (
        text
      )}
    </Button>
  );
};

/**
 * Shared table header with title and action buttons
 */
export const McpTableHeader = ({
  title,
  onAdd,
  onRemove,
  addDisabled = false,
  removeDisabled = false,
  showRemove = true,
  addButtonText = "Add",
  removeButtonText = "Remove",
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "8px",
        minHeight: "32px",
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontSize: "14px",
          fontWeight: 600,
          color: "var(--text-primary-color)",
          flex: 1,
        }}
      >
        {title}
      </Typography>

      <Box sx={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon sx={{ fontSize: "16px" }} />}
          disabled={addDisabled}
          onClick={onAdd}
          sx={{
            height: "28px",
            fontSize: "13px",
            minWidth: "auto",
            padding: "4px 8px",
          }}
          className="mcp-header-add-btn"
        >
          {addButtonText}
        </Button>

        {showRemove && (
          <Button
            size="small"
            variant="contained"
            startIcon={<RemoveIcon sx={{ fontSize: "16px" }} />}
            disabled={removeDisabled}
            onClick={onRemove}
            sx={{
              height: "28px",
              fontSize: "13px",
              minWidth: "auto",
              padding: "4px 8px",
            }}
            className="mcp-header-remove-btn"
          >
            {removeButtonText}
          </Button>
        )}
      </Box>
    </Box>
  );
};
