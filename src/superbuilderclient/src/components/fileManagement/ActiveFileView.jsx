import React, { useEffect, useState, useRef, useContext } from 'react';
import './ActiveFileView.css';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { FileManagementContext } from '../context/FileManagementContext';
import { ChatContext } from '../context/ChatContext';
import useDataStore from '../../stores/DataStore';
import { useTranslation } from 'react-i18next';
import {
  DataGrid,
  Toolbar,
  QuickFilter,
  QuickFilterClear,
  QuickFilterControl,
  QuickFilterTrigger,
} from '@mui/x-data-grid';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  tooltipClasses,
  Link,
  InputAdornment,
  TextField,
} from '@mui/material';
import Zoom from '@mui/material/Zoom';
import { styled } from '@mui/material/styles';
import SearchCancelIcon from '@mui/icons-material/Cancel';
import SearchIcon from '@mui/icons-material/Search';
import CancelIcon from '@mui/icons-material/StopCircleOutlined';
import DeleteIcon from '@mui/icons-material/DeleteForeverOutlined';
import AddIcon from '@mui/icons-material/NoteAdd';
import AttachFileIcon from '@mui/icons-material/AttachFileOutlined';
import InfoIcon from '@mui/icons-material/InfoOutlined';

const ActiveFileView = ({
  onSelectionChange,
  allowedFileTypes = ['pdf', 'docx', 'txt', 'md', 'pptx', 'xlsx', 'csv'],
  expanded = false,
  setExpanded,
  selectFeedbackOnLoad = true,
  selectedFileLimit = -1, // no limit when -1
  fileInstructionsText = 'Select files from the knowledge base to use in the chat',
  uploadType = '', // what upload file method should be used (default embedding if none specified)
  collapseOnBlur = true, // when clicking out of the element, collapse the file view
  additionalInputs = '', // additional inputs for special workflows that appear below active file view
  reloadActiveFilesOnSessionSwitch = true, // when the session changes, try and apply the session's last used active files
}) => {
  const assistant = useDataStore(state => state.assistant);
  const {
    requestFiles,
    uploadFiles,
    removeFiles,
    cancelFileUpload,
    fileStatus,
    filesLoaded,
    rows,
    currentFile,
    currentFileProgress,
  } = useContext(FileManagementContext);
  const { sessionSwitched, messages, isChatReady, useAllFiles } = useContext(ChatContext);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]); // array of all file rows to display in this file table
  const [activeFiles, setActiveFiles] = useState([]); // array of selected file paths
  const [activateFilesOnUpload, setActivateFilesOnUpload] = useState(true); // when true, automatically select newly added files
  const [dragAndDropEnabled, setDragAndDropEnabled] = useState(true);
  const [cancel, setCancel] = useState(false);
  const [sortModel, setSortModel] = useState([{ field: 'added', sort: 'desc' }]);
  const [rowSelectionModel, setRowSelectionModel] = useState({
    type: 'include',
    ids: new Set(),
  });
  const [filesFirstLoaded, setFilesFirstLoaded] = useState(false); // make sure sorting applies when files are first loaded
  const { t } = useTranslation();
  const activeFileRef = useRef();

  const isValidFilepath = file => {
    const allowFilesWithoutEmbeddings = uploadType != ''; // if uploadType is not default, allow files without embeddings to be displayed and selected
    const allowedFile = allowFilesWithoutEmbeddings || file.embedded; // make sure file is embedded if files without embeddings aren't allowed
    const isValidType = allowedFileTypes.length <= 0 || allowedFileTypes.includes(file.type); // make sure only valid types displayed
    return allowedFile && isValidType;
  };

  // given a list of filepaths, filter the list to return those that exist
  const getExistingFilepaths = filepaths => {
    if (filepaths == null || filepaths.length <= 0) {
      return [];
    }
    const existingRows = rows.filter(file => filepaths.includes(file.id)); // filter to only existing files (not deleted since last use)
    const validRows = existingRows.filter(file => isValidFilepath(file)); // make sure file is still valid type and matches embedding rules
    const existingFilepaths = validRows.map(file => file.id);
    return existingFilepaths;
  };

  /**
   * Creates a singular file row for this file table derived from a base fileRowData object
   * @param {*} fileRowData
   * @returns New file row object to be displayed in this file table
   */
  const createFileRow = fileRowData => {
    return {
      id: fileRowData.id,
      name: fileRowData.name,
      added: fileRowData.added,
      // modified: fileRowData.modified,
      type: fileRowData.type,
      size: fileRowData.size,
      // status: fileRowData.status,
      path: fileRowData.path,
      embedded: fileRowData.embedded, // is the file actually in the vectordb?
      selected: useAllFiles, // default to use all files value
    };
  };

  /**
   *
   * @param {*} fileRowsData Array of file row objects to extract specific fields from
   * @returns New array of file row objects to display on this file table derived from base fileRowsData
   */
  const createFileRows = fileRowsData => {
    // console.log("Allow Files without Embeddings: ", allowFilesWithoutEmbeddings, uploadType);
    let rows = [];
    fileRowsData.forEach((file, index) => {
      // allow valid file types for selection, or all files if no valid file types specified
      if (isValidFilepath(file)) {
        rows.push(createFileRow(file));
      }
    });
    setFilesFirstLoaded(true); // files are loaded, emit signal for selection sorting
    return rows;
  };

  // Include the most recently uploaded feedback file (name will be feedback_[NUMBER].txt) in active files IF just uploaded (most recent file in general)
  const selectFeedback = async () => {
    if (!selectFeedbackOnLoad) {
      return; // do not select feedback files for special workflows that don't use the feedback feature
    }
    let feedbackFiles = rows.filter(file => file.name.includes('feedback_')); // get all feedback files through hardcoded name
    // Select if feedback file was the last file to be added (most recent)
    if (feedbackFiles.length > 0) {
      const mostRecentFile = rows.sort((a, b) => new Date(b.added) - new Date(a.added))[0].id;
      const mostRecentFeedbackFile = feedbackFiles.sort(
        (a, b) => new Date(b.added) - new Date(a.added)
      )[0].id;
      if (mostRecentFile === mostRecentFeedbackFile) {
        let allSelectedFilepaths = [...activeFiles, feedbackFiles[0].id]; // add feedback file to selection
        allSelectedFilepaths = Array.from(new Set(allSelectedFilepaths)); // remove duplicates if already included
        console.log('Feedback: ', allSelectedFilepaths);
        handleSelectionChange(allSelectedFilepaths); // update active files
      }
    }
  };

  /**
   * Attempt to add user provided filepaths then select (activate) any succesfully uploaded files in the data grid
   * @param {*} userFiles List of filepaths, or empty string if the desired behavior is to prompt file explorer dialog
   */
  const addFiles = async userFiles => {
    console.log('Loading: ' + loading);
    console.log('Files Loaded: ' + filesLoadedRef.current);
    if (loading || !filesLoadedRef.current) {
      console.log("Can't add files, waiting for files to load.");
      return;
    }
    setCancel(false);
    let userFilepaths = userFiles; // used for drag and drop
    if (userFilepaths === '') {
      userFilepaths = await requestFiles(allowedFileTypes); // ask user for files if none provided
    }
    if (userFilepaths == null || userFilepaths.length <= 0) {
      focusActiveFiles(); // put active files in focus for onBlur collapse
      return; // user canceled file selection, early exit
    }
    setLoading(true); // display loading spinner
    const selectedFilepaths = await uploadFiles(userFilepaths, allowedFileTypes, uploadType); // attempt to upload user selected files
    // console.log("Selecting files to be active by default: ", selectedFilepaths);
    // console.log("All files: ", rows);
    // If files were selected, update the active file selections to include these files
    if (activateFilesOnUpload && selectedFilepaths != null && selectedFilepaths.length > 0) {
      let allSelectedFilepaths = selectedFilepaths; // get all files that were actually uploaded
      allSelectedFilepaths = Array.from(new Set(allSelectedFilepaths)); // remove any duplicate filepaths
      handleSelectionChange(allSelectedFilepaths, true); // update new file selections
    }
    setLoading(false);
    setSortModel([{ field: 'added', sort: 'desc' }]);
    focusActiveFiles(); // put active files in focus for onBlur collapse
  };

  /**
   * Removes ALL active/selected file rows from the knowledge base
   */
  const deleteSelectedFiles = async () => {
    if (loading || !filesLoaded || activeFiles.length <= 0) {
      console.log('No active files selected to remove');
      return;
    }

    // console.log("attempting to delete selected files: ", activeFiles);
    setCancel(false);
    setLoading(true);
    await removeFiles(activeFiles); // request removal of just this file
    setLoading(false);

    // Manually remove all active files from the selected rows since keepNonExistentRowsSelected is true
    const updatedSelectedRows = Array.from(rowSelectionModel.ids).filter(id => {
      const file = files.find(file => file.id === id);
      return file && !activeFiles.includes(file.path + file.name);
    });
    handleSelectionChange(updatedSelectedRows);
    focusActiveFiles(); // put active files in focus for onBlur collapse
  };

  const cancelAddFiles = async () => {
    setCancel(true);
    await cancelFileUpload();
  };

  /**
   * Update the selected/active files based on the file table, and send the result to the parent component
   * @param {*} selectedFilepaths All selected items provided from the file table on selection change
   * @param {*} fileUpload If true, these files are newly uploaded files. Defaults to false meaning manual checkbox selection
   */
  const handleSelectionChange = (selectedFilepaths, fileUpload = false) => {
    let filepathSelections = selectedFilepaths;
    // console.log("Selections: ", filepathSelections);
    // handle file selection limit cases if there is a file limit and this selection exceeds it
    if (selectedFileLimit > 0 && filepathSelections.length >= selectedFileLimit) {
      if (!fileUpload && activeFiles.length >= selectedFileLimit) {
        filepathSelections = []; // user is attempting to select all when limit already reach, unselect all instead
      } else {
        if (fileUpload || useAllFiles) {
          selectedFilepaths = selectedFilepaths.reverse(); // reverse the order so selections appear at the top
        }
        filepathSelections = selectedFilepaths.slice(0, selectedFileLimit); // limit the files to be the top X files
      }
    }
    setRowSelectionModel({
      type: 'include',
      ids: new Set(filepathSelections),
    });
    setActiveFiles(filepathSelections);
    onSelectionChange(filepathSelections); // emit callback event with new selection to parent
    setCancel(false);
  };

  const handleOpenFileLocation = async filePath => {
    try {
      await invoke('open_in_explorer', { path: filePath });
    } catch (error) {
      console.error('Error opening file location:', error);
    }
  };

  // Given byte value and decimal places, return dynamic unit conversion as string
  function formatBytes(bytes) {
    const kilobytes = Math.round(bytes / 1024); // convert to KB and round
    return (kilobytes > 0 ? kilobytes : 1).toLocaleString() + ' KB'; // format as string, clamp to 1KB minimum
  }

  // Assuming an ISO Date String, format date into a cleaner format
  function formatDate(isoDateString) {
    const date = new Date(isoDateString);
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };
    const formattedDate = date.toLocaleString('en-US', options);
    const [datePart, timePart] = formattedDate.split(', ');
    const [month, day, year] = datePart.split('/');
    const customFormattedDate = `${month}/${day}/${year} ${timePart}`;
    return customFormattedDate;
  }

  // Every time the file list from the file context is updated, refresh this file table with the new data OR session switches
  useEffect(() => {
    setFiles(createFileRows(rows));
    selectFeedback(); // always select feedback on refresh for now
  }, [rows]);

  // session has changed, attempt to reload the attached files using the last message's attached files
  useEffect(() => {
    if (messages.length <= 0) {
      handleSelectionChange([]); // new session, simply make sure the active files are clear
      return; // early exit
    }
    if (!reloadActiveFilesOnSessionSwitch) {
      return; // early exit if update toggled off
    }
    const lastMessage = messages[messages.length - 1];
    const lastAttachedFilepaths = lastMessage.attachedFiles ? lastMessage.attachedFiles : [];
    const existingFilepaths = getExistingFilepaths(lastAttachedFilepaths);
    handleSelectionChange(existingFilepaths); // set these as the active files
  }, [sessionSwitched]);

  // necessary for event listener to get up to date value
  const filesLoadedRef = useRef(filesLoaded);
  const loadingRef = useRef(loading);
  useEffect(() => {
    filesLoadedRef.current = filesLoaded;
  }, [filesLoaded]);
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  // Drag and Drop functionality ----------------------------------------------
  let unlistenFileDrop, unlistenFileDropHover, unlistenFileDropCancelled;
  useEffect(() => {
    if (dragAndDropEnabled) {
      unlistenFileDrop = listen('tauri://drag-drop', async event => {
        console.log(event);
        console.log('Files dropped:', event.payload.paths);
        addFiles(event.payload.paths);
        setExpanded(true);
      });
      unlistenFileDropCancelled = listen('tauri://drag-leave', event => {
        console.log('File drop cancelled');
      });
    }
    return () => {
      if (unlistenFileDrop) unlistenFileDrop.then(unlisten => unlisten());
      if (unlistenFileDropHover) unlistenFileDropHover.then(unlisten => unlisten());
      if (unlistenFileDropCancelled) unlistenFileDropCancelled.then(unlisten => unlisten());
    };
  }, [dragAndDropEnabled]);
  // -------------------------------------------------------------------------------------

  // Progress Update Overlay -------------------------------------------------------------
  const StyledGridOverlay = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    backgroundColor: 'rgba(18, 18, 18, 0.9)',
    ...theme.applyStyles('light', {
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
    }),
  }));
  function CircularProgressWithLabel(props) {
    return (
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          color={cancel || fileStatus === "removing" ? "error" : "primary"}
          variant={
            currentFile === "" || cancel ? "indeterminate" : "determinate"
          }
          data-testid="file-handle-progress-container" 
          {...props}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="caption" component="div" color="text.primary">
            {`${currentFile === '' || cancel ? '' : props.value + '%'}`}
          </Typography>
        </Box>
      </Box>
    );
  }
  function CustomLoadingOverlay() {
    return (
      <StyledGridOverlay>
        <CircularProgressWithLabel value={parseInt(currentFileProgress)} />
        <Box sx={{ mt: 2 }}>
          {!filesLoaded
            ? 'fetching files...'
            : cancel
              ? 'cancel in progress...'
              : fileStatus === 'removing'
                ? 'removing files...'
                : currentFile.substring(currentFile.lastIndexOf('\\') + 1, currentFile.length)}
        </Box>
        {currentFile !== '' && !cancel && (
          <Button
            size="small"
            color="error"
            onClick={() => cancelAddFiles()}
            style={{ gap: '5px' }}
            data-testid="active-file-view-cancel-upload-button"
          >
            <CancelIcon /> <span>Cancel</span>
          </Button>
        )}
      </StyledGridOverlay>
    );
  }
  // -------------------------------------------------------------------------------------

  const columns = [
    // {
    //     field: 'id',
    //     headerName: 'ID',
    //     width: 30,
    // },
    {
      // purely hidden column to be able to sort by active / selected files
      field: 'selected',
      headerName: 'Selected',
      width: 100,
    },
    {
      field: 'name',
      headerName: 'Name',
      flex: 0.4,
      renderCell: params => (
        <Link
          onClick={() => handleOpenFileLocation(params.row.path + params.row.name)}
          className="file-link"
          underline="hover"
          data-testid={`active-file-view-file-name-link-${params.row.id}`}
        >
          {params.value}
        </Link>
      ),
    },
    {
      field: 'type',
      headerName: 'Type',
      flex: 0.1,
      getApplyQuickFilterFn: () => null, // ignore in quick filter
    },
    {
      field: 'size',
      type: 'number',
      headerName: 'Size',
      flex: 0.15,
      valueFormatter: value => {
        return formatBytes(value);
      },
      getApplyQuickFilterFn: () => null, // ignore in quick filter
    },
    {
      field: 'path',
      headerName: 'Path',
      flex: 0.6,
      getApplyQuickFilterFn: () => null, // ignore in quick filter
    },
    {
      field: 'added',
      type: 'dateTime',
      headerName: 'Date Added',
      flex: 0.3,
      valueFormatter: value => {
        return formatDate(value);
      },
      getApplyQuickFilterFn: () => null, // ignore in quick filter
    },
  ];

  const LightTooltip = styled(({ className, placement = 'top-start', ...props }) => (
    <Tooltip
      {...props}
      arrow
      placement={placement}
      classes={{ popper: className }}
      slots={{ transition: Zoom }}
    />
  ))(({ theme }) => ({
    [`& .${tooltipClasses.tooltip}`]: {
      backgroundColor: 'rgba(238, 238, 238, 0.87)',
      color: 'rgba(0, 0, 0, 0.87)',
      boxShadow: theme.shadows[1],
      fontSize: 11,
    },
  }));

  function CustomIconButton({
    disabled,
    title,
    hoverColor = 'primary',
    icon,
    onClick = () => {},
    'data-testid': dataTestId,
  }) {
    const [hover, setHover] = useState(false);
    return (
      <IconButton
        onClick={() => {
          if (!disabled) {
            onClick();
          }
        }}
        title={title}
        size="small"
        onMouseEnter={() => {
          if (!disabled) {
            setHover(true);
          }
        }}
        onMouseLeave={() => setHover(false)}
        sx={{
          backgroundColor: 'rgb(243, 243, 243)',
          color: hover ? hoverColor : '#666666',
        }}
        data-testid={dataTestId}
      >
        {icon}
      </IconButton>
    );
  }

  const StyledQuickFilter = styled(QuickFilter)({
    marginLeft: 'auto',
  });

  function CustomToolbar() {
    return (
      <Toolbar sx={{ pr: 2, pl: 1, mb: 0, mt: 0, pt: 0 }}>
        <CustomIconButton
          onClick={() => addFiles('')}
          title="Add files to the knowledge base"
          disabled={!isChatReady || loading || !filesLoaded}
          hoverColor="var(--primary-main-color)"
          icon={<AddIcon fontSize="medium" data-testid="active-file-view-add-files-icon" />}
          data-testid="active-file-view-add-files-button"
        />
        <CustomIconButton
          onClick={() => deleteSelectedFiles()}
          title="Remove selected files from the knowledge base"
          disabled={!isChatReady || loading || !filesLoaded || activeFiles.length <= 0}
          hoverColor="var(--error-main-color)"
          icon={<DeleteIcon fontSize="medium" />}
          data-testid="active-file-view-delete-selected-button"
        />
        <Box sx={{ pl: 1, flexGrow: 1 }}>
          <StyledQuickFilter expanded>
            <QuickFilterControl
              render={({ ref, ...other }) => (
                <TextField
                  {...other}
                  sx={{
                    width: '100%',
                    '& .MuiInputBase-root': {
                      fontSize: '14px',
                      fontFamily: 'IntelOne Display, sans-serif',
                    },
                    '& .MuiInputBase-input::placeholder': {
                      fontSize: '14px',
                    },
                  }}
                  inputRef={ref}
                  aria-label="Search"
                  placeholder="Search Knowledge Base"
                  size="small"
                  data-testid="active-file-view-search-input"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                      endAdornment: other.value ? (
                        <InputAdornment position="end">
                          <QuickFilterClear
                            edge="end"
                            size="small"
                            aria-label="Clear search"
                            material={{ sx: { marginRight: -0.75 } }}
                          >
                            <SearchCancelIcon fontSize="small" />
                          </QuickFilterClear>
                        </InputAdornment>
                      ) : null,
                      ...other.slotProps?.input,
                    },
                    ...other.slotProps,
                  }}
                />
              )}
            />
          </StyledQuickFilter>
        </Box>
      </Toolbar>
    );
  }

  // collapse if onBlur target or related target is not apart of the DataGrid menu or submenus
  const handleBlur = event => {
    // console.log(event);
    // console.log("Related Target:", event.relatedTarget);
    // console.log("Target:", event.target);
    const relatedTargetInDataGrid =
      event.relatedTarget != null &&
      (event.relatedTarget.closest('.active-files-container') != null ||
        event.relatedTarget.closest('.MuiDataGrid-root') != null ||
        event.relatedTarget.closest('.MuiDataGrid-menu') != null ||
        event.relatedTarget.closest('.MuiDataGrid-panel') != null);
    const isDataGridScrollbar =
      event.target != null && event.target.classList.contains('MuiDataGrid-scrollbar');
    const panelElement = document.querySelector('.MuiDataGrid-panel');
    const isFilterPanelOpen = panelElement !== null && document.body.contains(panelElement); // don't immediately collapse if the filter panel was visible
    if (collapseOnBlur && !relatedTargetInDataGrid && !isDataGridScrollbar && !isFilterPanelOpen) {
      setExpanded(false); // collapse
    }
  };

  const sortByActiveFiles = () => {
    // sorts by active files if only some files are selected, otherwise sort by date
    if (activeFiles.length > 0 && (!useAllFiles || selectedFileLimit > 0)) {
      // ensure currently selected files have updated selected fields for column sorting
      const updatedFiles = files.map(row => ({
        ...row,
        selected: activeFiles.includes(row.id),
      }));
      setFiles(updatedFiles);
      setSortModel([{ field: 'selected', sort: 'desc' }]); // sort active (selected) files at the top
    } else {
      setSortModel([{ field: 'added', sort: 'desc' }]); // no active files, just sort by date added
    }
  };

  useEffect(() => {
    // only sort if files are loaded and user expanded file view
    if (filesFirstLoaded) {
      sortByActiveFiles();
    }
  }, [expanded, filesFirstLoaded]);

  useEffect(() => {
    // files updated (loaded, removed or added) select all files
    if (useAllFiles) {
      handleSelectionChange(files.map(file => file.id));
    }
  }, [files, sessionSwitched]);

  // focus active file container so onBlur can be invoked after to collapse
  const focusActiveFiles = () => {
    activeFileRef.current?.focus();
  };

  return (
    <div
      className="active-files-container"
      tabIndex={0} // Makes the div focusable
      onBlur={handleBlur}
      ref={activeFileRef}
      data-testid="active-file-view-container"
    >
      <div className="active-files-file-container">
        <div className="expand-container">
          <span
            className="click-to-expand"
            onClick={() => setExpanded(!expanded)}
            data-testid="active-file-view-toggle-button"
          >
            <span className="expand-icon">
              <div className="active-file-icon-button">
                <AttachFileIcon
                  data-testid="active-file-icon-button"
                  sx={{
                    transition: 'transform 0.3s ease',
                    transform: expanded ? 'rotate(0deg)' : 'rotate(45deg)',
                  }}
                />
              </div>
            </span>
            <span className="expand-text">
              <span className="expand-text-title">
                <span
                  className={
                    'active-file-count-text ' + (activeFiles.length > 0 && 'has-active-files')
                  }
                  data-testid="active-file-count-text"
                >
                  {activeFiles.length}
                </span>{' '}
                Files in use -
              </span>
              {fileInstructionsText}
              <LightTooltip
                title={
                  <span>
                    <p>{t('active_file_tooltip.part_1')}</p>
                    <p>{t('active_file_tooltip.part_2')}</p>
                    <p>{t('active_file_tooltip.part_3')}</p>
                  </span>
                }
              >
                <InfoIcon sx={{ paddingLeft: '5px' }} color="primary" fontSize="inherit" />
              </LightTooltip>
            </span>
            {expanded && (
              <span className="file-type-text">{allowedFileTypes.join(', ').toUpperCase()}</span>
            )}
          </span>
        </div>
        {expanded &&
          (files.length <= 0 && !loading && filesLoaded ? (
            <div className="empty-file-table-container">
              <CustomIconButton
                title="Add files to the knowledge base"
                hoverColor="var(--primary-main-color)"
                icon={<AddIcon fontSize="medium" />}
                onClick={() => addFiles('')}
                disabled={!isChatReady || loading || !filesLoaded}
                data-testid="active-file-view-add-files-button"
              />
              <span>Click the + icon to add files to the knowledge base</span>
            </div>
          ) : (
            <div
              className="active-file-table-container"
              data-testid="active-file-view-file-table-container"
              style={{
                minHeight: loading || !filesLoaded ? '210px' : 'auto', // force minimum height when loading for overlay to show properly
              }}
            >
              <DataGrid
                rows={files}
                slotProps={{
                  // Add data-testid to the root element of DataGrid
                  root: {
                    'data-testid': 'active-file-view-data-grid',
                  },
                  // add unique id for datagrid-row-C:\path\to\file.txt
                  row: params => ({
                    'data-testid': `file-row-${params.id}`,
                  }),
                  // add unique id for datagrid-cell-C:\path\to\file.txt-fieldName
                  cell: params => ({
                    'data-testid': `file-cell-${params.field}-${params.id}`,
                  }),
                  //add header id to order by column when clicked
                  columnHeader: params => ({
                    'data-testid': `file-header-${params.field}`,
                  }),
                }}
                columns={columns}
                loading={loading || !filesLoaded}
                showToolbar={true}
                initialState={{
                  density: 'compact',
                  filter: {
                    filterModel: {
                      items: [
                        {
                          columnField: 'name',
                          operator: 'contains',
                          value: '',
                        },
                      ],
                    },
                  },
                  columns: {
                    columnVisibilityModel: {
                      selected: false, // hide the selected/active column, purely for sorting
                    },
                  },
                }}
                sortModel={sortModel}
                onSortModelChange={model => setSortModel(model)}
                disableColumnSelector
                isRowSelectable={params =>
                  isChatReady &&
                  (selectedFileLimit <= 0 ||
                    rowSelectionModel.ids.size < selectedFileLimit ||
                    rowSelectionModel.ids.has(params.id))
                } // disable row selection for unselected rows if file limit reached
                getRowClassName={params => {
                  const isDisabled =
                    selectedFileLimit > 0 &&
                    rowSelectionModel.ids.size >= selectedFileLimit &&
                    !rowSelectionModel.ids.has(params.id); // disabled if file limit reached and this row was not selected
                  return isDisabled ? 'disabled-row' : ''; // apply disabled styling to disabled rows
                }}
                hideFooter
                checkboxSelection
                disableRowSelectionOnClick
                rowSelectionModel={rowSelectionModel}
                onRowSelectionModelChange={newRowSelectionModel => {
                  handleSelectionChange(Array.from(newRowSelectionModel.ids)); // only pass in filepaths
                }}
                keepNonExistentRowsSelected // This prevents filtering from deselecting files
                disableColumnResize
                sx={{
                  border: 0,
                  m: 0,
                  p: 0,
                  fontFamily: 'IntelOne Display, sans-serif',
                  fontSize: '13px',
                  color: 'rgb(92, 92, 92)',
                  '& .MuiDataGrid-columnSeparator': {
                    display: 'none', // hides column separator in header
                  },
                  '& .MuiDataGrid-cell:focus': {
                    outline: 'none', // hides normal cell highlight on click
                  },
                  '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
                    outline: 'none', // hides header cell highlight on click
                  },
                  '& .disabled-row': {
                    backgroundColor: 'rgba(172, 172, 172, 0.08)', // disabled rows styling
                  },
                }}
                slots={{
                  toolbar: CustomToolbar,
                  loadingOverlay: CustomLoadingOverlay,
                }}
              />
            </div>
          ))}
        {additionalInputs}
      </div>
    </div>
  );
};

export default ActiveFileView;
