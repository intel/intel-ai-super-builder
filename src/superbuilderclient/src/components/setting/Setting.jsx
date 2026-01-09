import React, { useState, useEffect, useContext, use } from 'react';
import './Setting.css';
import Notification from '../notification/Notification';
import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog'; // Import the Tauri dialog API
import { RagReadyContext } from '../context/RagReadyContext';
import { ModelDownloaderContext } from '../context/ModelDownloaderContext';
import { ChatContext } from '../context/ChatContext';
import ModalWrapper from '../generalUseModal/generalUseModal';
import { ModelSettings } from './ModelSettings';
import HighLowTooltipDescription from '../tooltip/HighLowTooltipDescription';
import SimpleAccordion from '../accordion/SimpleAccordion';
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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import TransformIcon from '@mui/icons-material/Transform'; // Add this import
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import modelStructureImage1 from '../../assets/images/model-structure-1.png';
import FluidModal from '../FluidModal/FluidModal';
import AssistantLogo from '../assistantLogo/assistantLogo';

import ModelSelection from './ModelSelection';
import { SystemInfoCard } from './SystemInfo';
import ConfImportExport from './ConfImportExport';

import useDataStore from '../../stores/DataStore';

import useModelStore from '../../stores/ModelStore';

import { getSystemLanguage, SUPPORTED_LANGUAGES, getSystemLanguageLabel } from '../../i18n';
import i18n from 'i18next';

import { useTranslation } from 'react-i18next';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

const Setting = ({ isOpen, setIsOpen, onClose }) => {
  const {
    system_info: sysInfo,
    config,
    assistant,
    assistantName,
    assistantLogo,
    getDBConfig,
    setConfig,
    setAssistant,
    setAssistantName,
  } = useDataStore();

  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { ready, setReady } = useContext(RagReadyContext);
  const { isChatReady, setisChatReady, newChatModelNeeded } = useContext(ChatContext);
  const { waitingForConsent, setDownloadEndpoint } = useContext(ModelDownloaderContext);
  const [uiColorSelectedConfig, setUIColorSelectedConfig] = useState(null);
  const [uiColorSelected, setUIColorSelected] = useState('');
  const [originalUIColor, setOriginalUIColor] = useState('');
  const [configUpdating, setAssistantConfigUpdating] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isNPUAlert, setIsNPUAlert] = useState(false);
  const [selectedNPUModel, setSelectedNPUModel] = useState(null);
  const [selectedModelType, setSelectedModelType] = useState('chat_model');
  const [modelUploading, setModelUploading] = useState(false);
  const [modelUploadDisabled, setModelUploadDisabled] = useState(false);
  const [uploadFolderMethod, setUploadFolderMethod] = useState('Copy');
  const [uploadModelError, setModelUploadError] = useState(null);
  const [isUploadModelInfoOpen, setIsUploadModelInfoOpen] = useState(false);
  const toggleUploadModelInfo = () => setIsUploadModelInfoOpen(!isUploadModelInfoOpen);
  const [assistantLogoImage, setAssistantLogoImage] = useState('default');

  useEffect(() => {
    if (assistant) {
      setUIColorSelected(assistant[uiColorSelectedConfig]);
      setOriginalUIColor(assistant[uiColorSelectedConfig]);
      if (assistant['logo_image'] == 'default') {
        setAssistantLogoImage(null);
      } else {
        setAssistantLogoImage(assistant['logo_image']);
      }
    }
  }, [uiColorSelectedConfig, config]);

  const handleInputChange = event => {
    setIsTyping(true);
    renameAssistant(event);
  };

  const recommendedModel = assistant.recommended_models
    ? assistant.recommended_models.map((item, index) => ({
        key: index + 1,
        label: item.model,
        short_name: item.short_name,
      }))
    : [{ key: 1, label: assistant.models.chat_model }];

  const isHybrid = assistant.recommended_models.some(model => model.model.includes('GGUF'));

  const getFilteredModels = modelType => {
    return assistant.all_models
      ? assistant.all_models.filter(item => item.model_type === modelType)
      : [];
  };

  const rankerModels = getFilteredModels('ranker_model').map((item, index) => ({
    key: index + 1,
    label: item.full_name,
    short_name: item.short_name,
  }));

  const embeddingModels = getFilteredModels('embedding_model').map((item, index) => ({
    key: index + 1,
    label: item.full_name,
    short_name: item.short_name,
  }));

  const recommendedShortNames = new Set(recommendedModel.map(item => item.short_name));

  const filteredAllModels = assistant.all_models
    ? assistant.all_models.filter(
        item => !recommendedShortNames.has(item.short_name) && item.model_type === 'chat_model'
      )
    : [];

  const allModels = filteredAllModels.map((item, index) => ({
    key: recommendedModel.length + 1 + index,
    label: item.full_name,
    short_name: item.short_name,
  }));
  const combinedModels = [
    {
      key: 'divider',
      label: 'divider',
      content: '⎯⎯ Recommended Models⎯⎯⎯⎯⎯⎯',
    },
    ...recommendedModel,
    {
      key: 'divider',
      label: 'divider',
      content: '⎯⎯ Other Models⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯',
    },
    ...allModels,
  ];

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
    setIsUploadModelInfoOpen(false);
  };

  const renameAssistant = event => {
    const newName = event;
    setAssistantName(newName.target.value);
  };

  const handleRenameKeyDown = event => {
    if (event.key == 'Enter') {
      updateAssistantName();
    }
  };

  const isModelNPU = modelName => {
    if (modelName.short_name === 'Phi-3-mini-2k-npu') {
      return true;
    }
    return false;
  };

  const getModelByType = modelType => {
    switch (modelType) {
      case 'chat_model':
        return combinedModels;
      case 'ranker_model':
        return rankerModels;
      case 'embedding_model':
        return embeddingModels;
      default:
        return [];
    }
  };

  const setModel = async (eventOrModelName, modelType, isDropDownEvent = true) => {
    let selectedModel;
    let modelUpload = false;
    if (isDropDownEvent) {
      const selectedKey = parseInt(eventOrModelName, 10);
      selectedModel = getModelByType(modelType).find(model => model.key === selectedKey);
      console.log('Selected model: ', selectedModel);
    } else {
      selectedModel = { label: eventOrModelName };
      modelUpload = true;
    }

    // If model is NPU, only allow if NPU hardware is supported
    if (isModelNPU(selectedModel)) {
      if (sysInfo.HasNpuSupport && sysInfo.IsNpuDriverCompatible) {
        console.log('Hardware meets requirements to run this NPU model.');
      } else {
        setIsNPUAlert(true);
        setSelectedNPUModel(selectedModel);
        setIsOpen(false); // Close the setting panel
        return; // don't allow the switch
      }
    } else {
      console.log('Model is NOT an NPU model.');
    }

    setIsOpen(false); // Close the setting panel
    setReady(false); // Set the ready flag to false

    if (selectedModel && selectedModel.key !== 'divider') {
      let updatedAssistant;
      if (modelUpload) {
        // Add the new model to the all_models list
        const newModel = {
          full_name: selectedModel.label,
          short_name: selectedModel.label,
          model_type: modelType,
          model_creator_type: 'UserCreated',
        };
        const updatedAllModels = assistant.all_models
          ? [...assistant.all_models, newModel]
          : [newModel];
        updatedAssistant = {
          ...assistant,
          models: {
            ...assistant.models,
            [modelType]: selectedModel.label,
          },
          all_models: updatedAllModels,
        };
      } else {
        updatedAssistant = {
          ...assistant,
          models: {
            ...assistant.models,
            [modelType]: selectedModel.label,
          },
        };
      }
      setAssistant(updatedAssistant);
      console.log(
        'SetModels Prev Assistant: ',
        assistant,
        ' Current Assistant: ',
        updatedAssistant
      );
      const updatedConfig = {
        ...config,
        ActiveAssistant: updatedAssistant,
      };
      setConfig(updatedConfig);
    }
  };

  const uiColorConfigurable = [
    {
      key: 'header_bg_color',
      label: t('setting.visuals.color.primary'),
    },
    {
      key: 'header_text_bg_color',
      label: t('setting.visuals.color.primary_text'),
    },
    {
      key: 'sidebar_box_bg_color',
      label: t('setting.visuals.color.secondary'),
    },
  ];

  const updateUIColorConfiguration = async resetUXSettings => {
    setAssistantConfigUpdating(true);
    const newData = { ...config };

    if (assistant.models) {
      newData.ActiveAssistant = { ...assistant };
      newData.ActiveAssistant.models = Object.entries(assistant.models).map(
        ([model_type, full_name]) => ({
          model_type,
          full_name,
        })
      );
    }

    if (assistant.recommended_models) {
      newData.ActiveAssistant = { ...newData.ActiveAssistant };
      newData.ActiveAssistant.recommended_models = JSON.stringify(assistant.recommended_models);
    }

    // add logo image to the list of configurable items
    newData.ActiveAssistant['logo_image'] = assistantLogo;
    console.debug('new logo image: ', assistantLogo);

    newData.ActiveAssistant[uiColorSelectedConfig] = uiColorSelected;
    console.log('New Assistant Config: ', newData);
    await invoke('set_assistant_view_model', {
      vm: JSON.stringify(newData.ActiveAssistant),
      resetUxSettings: resetUXSettings,
    });
    if (resetUXSettings) {
      await updateAssistantName(true); // make sure assistant name also resets
    }
    await useDataStore.getState().getDBConfig();
    emit('assistant-config-updated'); // make sure appearance changes propagate to separate app windows
    setAssistantConfigUpdating(false);
  };

  const updateAssistantName = async (resetName = false) => {
    if (assistant.full_name === assistantName && !resetName) {
      return;
    } else if (assistantName.trim().length === 0 || resetName) {
      switch (assistant.short_name) {
        case 'HR':
          setAssistantName('Human Resources - Intel® AI Super Builder');
          break;
        case 'SA':
          setAssistantName('Sales Assistant - Intel® AI Super Builder');
          break;
        case 'MA':
          setAssistantName('Medical Assistant - Intel® AI Super Builder');
          break;
        case 'FA':
          setAssistantName('Finance Assistant - Intel® AI Super Builder');
          break;
        case 'IO':
          setAssistantName('Intel® AI Super Builder - OpenVINO');
          break;
        case 'IG':
          setAssistantName('Intel® AI Super Builder - GGUF');
          break;
      }
    }
    setAssistantConfigUpdating(true);
    try {
      const newData = { ...config };
      if (assistant.models) {
        newData.ActiveAssistant = { ...assistant };
        newData.ActiveAssistant.models = Object.entries(assistant.models).map(
          ([model_type, full_name]) => ({
            model_type,
            full_name,
          })
        );
      }

      if (assistant.recommended_models) {
        newData.ActiveAssistant = { ...newData.ActiveAssistant };
        newData.ActiveAssistant.recommended_models = JSON.stringify(assistant.recommended_models);
      }
      if (assistant) {
        newData.ActiveAssistant.full_name = useDataStore.getState().assistantName;
        console.log('New Assistant Namew: ', newData.ActiveAssistant);
        uiColorConfigurable.forEach(({ key }) => {
          delete newData.ActiveAssistant[key];
        });
      }

      await invoke('set_assistant_view_model', {
        vm: JSON.stringify(newData.ActiveAssistant),
        resetUxSettings: false,
      });
    } catch (error) {
      console.error(error);
    } finally {
      getDBConfig();
    }

    setAssistantConfigUpdating(false);
  };

  useEffect(() => {
    const disableModel =
      configUpdating ||
      modelUploading ||
      (!(ready && isChatReady) && !waitingForConsent && !newChatModelNeeded);
    setModelUploadDisabled(disableModel);
  }, [configUpdating, modelUploading, ready, isChatReady, waitingForConsent]);

  // Handler for the folder selection button
  const handleSelectFolder = async () => {
    let selectedFolder;
    selectedFolder = await open({
      directory: true,
      multiple: false,
      title: t('setting.models.upload.select_a_folder'),
    });
    if (selectedFolder) {
      setModelUploadError(null);
      setModelUploading(true);
      console.log('Selected folder:', selectedFolder);
      const folderName = selectedFolder.split(/[\\/]/).filter(Boolean).pop();
      console.log('folder name', folderName, 'model type: ', selectedModelType);
      try {
        const moveFolder = uploadFolderMethod == 'Move';
        await invoke('upload_model', {
          sourceDir: selectedFolder,
          model: folderName,
          modelType: selectedModelType,
          moveDirectory: moveFolder,
        });
        setModel(folderName, selectedModelType, false, false);
      } catch (e) {
        setModelUploadError(e.toString());
      }

      setModelUploading(false);
    }
  };

  const handleUploadLogo = async () => {
    const selectedLogo = await open({
      filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg'] }],
      multiple: false,
      title: 'Select a Logo',
    });
    if (selectedLogo) {
      console.log('Selected logo:', selectedLogo);
      await invoke('open_file_and_return_as_base64', {
        filename: selectedLogo,
      }).then(response => {
        useDataStore.getState().setAssistantLogo(`data:image/png;base64, ${response}`);
      });
    }
  };

  const openHFDownloadWindow = async () => {
    await useModelStore.getState().setHFDownloadWindows();
  };
  const [systemLng, setSystemLng] = useState(null);
  const [selectedLng, setSelectedLng] = useState('sys');
  const [languageOptions, setLanguageOptions] = useState([]);

  // Simplified Chinese regions (including Mainland China/Singapore)
  const SIMPLIFIED_REGIONS = ['CN', 'SG'];
  // Traditional Chinese regions (including Hong Kong/Macau/Taiwan)
  const TRADITIONAL_REGIONS = ['TW', 'HK', 'MO'];

  // Initialization logic
  useEffect(() => {
    const initializeLang = async () => {
      try {
        const saved = localStorage.getItem('i18n-lng') || 'sys';
        const detected = await getSystemLanguage();

        // Convert legacy storage values (compatibility handling)
        const migratedSaved = saved === 'zh' ? 'zh-Hans' : saved;

        // Initialize options using configuration from i18n.jsx
        const options = [
          {
            key: 'sys',
            label: getSystemLanguageLabel(detected),
            actualLng: detected,
          },
          ...SUPPORTED_LANGUAGES.map(lang => ({
            key: lang.code,
            label: lang.nativeName,
            name: lang.name,
          })),
        ];

        setSystemLng(detected);
        setLanguageOptions(options);
        setSelectedLng(migratedSaved);

        // Apply language immediately (system mode or user-selected)
        const initialLng = migratedSaved === 'sys' ? detected : migratedSaved;
        await i18n.changeLanguage(initialLng);
      } catch (err) {
        console.error('Initialization failed:', err);
      }
    };

    initializeLang();
  }, []);

  // Dynamically update system language labels
  useEffect(() => {
    setLanguageOptions(prev =>
      prev.map(opt =>
        opt.key === 'sys'
          ? {
              ...opt,
              label: getSystemLanguageLabel(systemLng),
              actualLng: systemLng,
            }
          : opt
      )
    );
  }, [systemLng, selectedLng]);

  const changeLanguage = async selectedKey => {
    setReady(false);
    try {
      let targetLng = selectedKey;

      // Handle system language selection
      if (selectedKey === 'sys') {
        const freshLng = await getSystemLanguage();
        setSystemLng(freshLng);
        targetLng = freshLng;
      }

      // Save user selection (new format)
      localStorage.setItem('i18n-lng', selectedKey);
      setSelectedLng(selectedKey);

      // Apply actual language (auto-handles Simplified/Traditional)
      await i18n.changeLanguage(targetLng);

      const emailWindow = await WebviewWindow.getByLabel('EmailWindow');
      if (emailWindow) {
        emailWindow.emit('load-email-form', {
          language: targetLng,
        });
      }

      const modelConversionWindow = await WebviewWindow.getByLabel('modelConversionWindow');
      if (modelConversionWindow) {
        modelConversionWindow.emit('load-convert-form', {
          language: targetLng,
        });
      }
    } catch (err) {
      console.error('Language change failed:', err);
    } finally {
      setReady(true);
    }
  };

  const renderSelectItems = items => {
    return items.map(item => (
      <MenuItem key={item.key || item.id} value={item.key || item.id} disabled={item.disabled}>
        {item.content || item.label}
      </MenuItem>
    ));
  };
  return (
    <div className={`setting-panel ${isOpen ? 'open' : ''}`}>
      <Notification isOpen={isModalOpen} toggleOpen={toggleModal} assistant={assistant} />

      <FluidModal
        open={isUploadModelInfoOpen}
        handleClose={toggleUploadModelInfo}
        header={<strong>{t('setting.fluid_modal')}</strong>}
        assistant={assistant}
      >
        <ModelUploadInfo />
      </FluidModal>

      <div className="setting-content">
        <SimpleAccordion
          title={t('setting.appearance.title')}
          description={t('setting.appearance.description')}
          data-testid="appearance-accordion"
        >
          <TextField
            className="assistant-rename"
            label={t('setting.name')}
            value={assistantName}
            onChange={handleInputChange}
            onKeyDown={handleRenameKeyDown}
            onBlur={() => updateAssistantName()}
            disabled={configUpdating}
            data-testid="assistant-name-input"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton edge="end" aria-label="edit">
                    <EditIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Typography className="color-picker-label">{t('setting.visuals.title')}</Typography>
          <Card orientation="vertical" className="assistant-configuration-switch-card">
            <Typography className="visual-label" id="logo-label">
              <b>{t('setting.visuals.logo')}</b>
            </Typography>
            <Divider className="visual-divider" />
            <div className="logo-setting-container">
              <div className="logo-display">
                <AssistantLogo />
              </div>
              <Button
                variant="contained"
                style={{ width: '100%' }}
                onClick={() => {
                  handleUploadLogo();
                }}
                data-testid="logo-upload-button"
              >
                {t('setting.visuals.logo_update')}
              </Button>
            </div>

            <Typography className="visual-label" id="color-label">
              <b>{t('setting.visuals.color.title')}</b>
            </Typography>
            <Divider className="visual-divider" />
            {uiColorConfigurable.map(uiconfig => (
              <div key={uiconfig.key} className="ui-configuration-row">
                <Typography>{uiconfig.label}</Typography>
                <input
                  type="color"
                  value={assistant ? assistant[uiconfig.key] : '#ffffff'}
                  onChange={event => {
                    setUIColorSelectedConfig(uiconfig.key);
                    setUIColorSelected(event.target.value);
                    const newAssistantConfig = { ...config };
                    console.warn(uiconfig, event.target.value);
                    newAssistantConfig.ActiveAssistant[uiconfig.key] = event.target.value;
                    console.warn('newAssistantConfig from UI', newAssistantConfig);
                    setConfig(newAssistantConfig);
                    setAssistant(newAssistantConfig.ActiveAssistant);
                  }}
                  size="s"
                  variant="action"
                  title={t('setting.visuals.color.pick')}
                  className="ui-configuration-color-palette"
                  disabled={configUpdating}
                  data-testid={`color-picker-${uiconfig.key}`}
                />
              </div>
            ))}
            <Typography className="visual-label" id="color-label">
              <b>{t('setting.visuals.language.title')}</b>
            </Typography>
            <Divider className="visual-divider" />
            <Card orientation="vertical" className="model-switch-card">
              <div className="info-container">
                <FormControl fullWidth>
                  <InputLabel>{t('setting.visuals.language.subtitle')}</InputLabel>
                  <Select
                    value={selectedLng}
                    label={t('setting.visuals.language.subtitle')}
                    onChange={e => changeLanguage(e.target.value)}
                    data-testid="language-select"
                  >
                    {languageOptions.map(option => (
                      <MenuItem key={option.key} value={option.key}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography className="model-upload-warning-label"></Typography>
              </div>
            </Card>
            <div className="button-group">
              <Button
                key="reset_assistant_uiconfiguration"
                variant="outlined"
                onClick={() => updateUIColorConfiguration(true)}
                disabled={configUpdating}
                data-testid="visual-settings-reset-button"
              >
                {t('setting.visuals.button.reset')}
              </Button>
              <Button
                key="apply_assistant_uiconfiguration"
                variant="contained"
                onClick={() => updateUIColorConfiguration(false)} // Pass a function reference
                disabled={configUpdating}
                data-testid="visual-settings-apply-button"
              >
                {t('setting.visuals.button.apply')}
              </Button>
            </div>
          </Card>
        </SimpleAccordion>

        <SimpleAccordion
          title={t('setting.versionandupdate.title')}
          description={t('setting.versionandupdate.description')}
          data-testid="version-update-accordion"
        >
          <Card orientation="vertical" className="app-version-card">
            <div className="app-version-info">
              <Typography>{t('setting.versionandupdate.subtitle')}</Typography>
              <Typography>{sysInfo?.CurrentVersion}</Typography>
            </div>
            <Button
              variant="contained"
              style={{ width: '100%', marginTop: 10 }}
              key="check_for_update"
              onClick={toggleModal}
              data-testid="check-for-update-button"
            >
              {t('setting.versionandupdate.button')}
            </Button>
          </Card>
        </SimpleAccordion>

        <SimpleAccordion
          title={t('setting.models.title')}
          description={t('setting.models.description')}
          data-testid="models-accordion"
        >
          <ModelSelection />

          <Card orientation="vertical" className="model-switch-card">
            <div className="info-container">
              <div className="label-with-tooltip">
                <HighLowTooltipDescription
                  overall_description={t('setting.models.upload.tips')}
                  onClick={toggleUploadModelInfo}
                  isButton={true}
                />
                <Typography>{t('setting.models.upload.title')}</Typography>
              </div>
              <FormControl component="fieldset" className="small-form-control">
                <div className="radio-group-with-label">
                  <FormLabel component="legend">{t('setting.models.upload.type')}</FormLabel>
                  <RadioGroup
                    row
                    aria-label="model"
                    name="model"
                    value={selectedModelType}
                    onChange={e => setSelectedModelType(e.target.value)}
                    data-testid="model-type-selection"
                  >
                    <FormControlLabel
                      value="chat_model"
                      control={<Radio disabled={modelUploadDisabled} />}
                      label={t('setting.models.upload.type_chat')}
                    />
                    <FormControlLabel
                      value="embedding_model"
                      control={<Radio disabled={modelUploadDisabled} />}
                      label={t('setting.models.upload.type_embedding')}
                    />
                    <FormControlLabel
                      value="ranker_model"
                      control={<Radio disabled={modelUploadDisabled} />}
                      label={t('setting.models.upload.type_ranker')}
                    />
                  </RadioGroup>
                </div>
              </FormControl>
              <FormControl component="fieldset" className="small-form-control">
                <div className="radio-group-with-label">
                  <FormLabel component="legend">{t('setting.models.upload.method')}</FormLabel>
                  <RadioGroup
                    row
                    aria-label="move or copy"
                    name="move or copy"
                    value={uploadFolderMethod}
                    onChange={e => setUploadFolderMethod(e.target.value)}
                    data-testid="upload-method-selection"
                  >
                    <FormControlLabel
                      value={'Copy'}
                      control={<Radio disabled={modelUploadDisabled} />}
                      label={t('setting.models.upload.method_copy')}
                    />
                    <FormControlLabel
                      value={'Move'}
                      control={<Radio disabled={modelUploadDisabled} />}
                      label={t('setting.models.upload.method_move')}
                    />
                  </RadioGroup>
                </div>
              </FormControl>

              <div className="button-loading-container">
                <Button
                  variant="contained"
                  sx={{ display: 'flex', width: '100%', marginBottom: 0.5 }}
                  onClick={handleSelectFolder}
                  startIcon={<AddRoundedIcon />}
                  disabled={
                    modelUploadDisabled || selectedModelType == '' || uploadFolderMethod == ''
                  }
                  data-testid="model-upload-select-folder-button"
                >
                  {t('setting.models.upload.upload_button')}
                </Button>
                {modelUploading && (
                  <div className="loading-container">
                    <div className="model-loading-spinner"></div>
                  </div>
                )}
              </div>
              {uploadModelError && (
                <Typography className="model-upload-error-label">{uploadModelError}</Typography>
              )}
              <Typography className="model-upload-warning-label">
                {t('setting.models.upload.upload_button_tips')}
              </Typography>
            </div>
          </Card>

          {!isHybrid && (
            <Card orientation="vertical" className="model-switch-card">
              <Button
                variant="contained"
                sx={{ display: 'flex', width: '100%', marginBottom: 0.5 }}
                onClick={openHFDownloadWindow}
                startIcon={<TransformIcon />}
                disabled={
                  modelUploadDisabled || selectedModelType == '' || uploadFolderMethod == ''
                }
                data-testid="model-conversion-button"
              >
                {t('setting.models.upload.conversion')}
              </Button>
            </Card>
          )}
        </SimpleAccordion>

        {isNPUAlert && (
          <ModalWrapper
            isOpen={isNPUAlert}
            toggleOpen={() => setIsNPUAlert(false)}
            assistant={assistant}
            header={`${selectedNPUModel.label} ` + t('setting.alert.title')}
            hideFooter={false}
            buttonName={'OK'}
            data-testid="npu-compatibility-alert-modal"
          >
            <div>
              <p>{t('setting.alert.part_1')}</p>
              <p>{t('setting.alert.part_2')}</p>
              <ul>
                <li>{t('setting.alert.part_3')}</li>
                <li>
                  {t('setting.alert.part_4')} {sysInfo.NpuInfo.minVersion}
                </li>
              </ul>
            </div>
          </ModalWrapper>
        )}

        <ModelSettings />

        <SystemInfoCard />

        <ConfImportExport />
      </div>
    </div>
  );
};

const ModelUploadInfo = () => {
  const { t } = useTranslation();

  // Parse <1></1> tags and convert to <code> elements
  const parseCodeTags = text => {
    if (!text) return text;

    const parts = text.split(/(<1>|<\/1>)/);
    const result = [];
    let inCodeTag = false;

    parts.forEach((part, index) => {
      if (part === '<1>') {
        inCodeTag = true;
      } else if (part === '</1>') {
        inCodeTag = false;
      } else if (part) {
        if (inCodeTag) {
          result.push(
            <code className="inline-code" key={index}>
              {part}
            </code>
          );
        } else {
          result.push(part);
        }
      }
    });

    return result;
  };
  const transformersVersion = t('setting.notice.steps.step2').split('transformers version ')[1];

  return (
    <div className="model-upload-info">
      <p>{t('setting.notice.steps.title')}</p>
      <ol>
        <li>
          {t('setting.notice.steps.step1')}
          <pre>
            <code>pip install optimum[openvino]</code>
          </pre>
        </li>
        <li>
          {t('setting.notice.steps.step2')}
          <pre>
            <code>pip install transformers=={transformersVersion}</code>
          </pre>
        </li>
        <li>
          {t('setting.notice.steps.step3')}
          <pre>
            <code>
              optimum-cli export openvino --model &lt;MODEL_ID&gt; --weight-format int4 --sym
              --trust-remote-code &lt;OUTPUT&gt;
            </code>
          </pre>
          <span>{parseCodeTags(t('setting.notice.steps.step3_note'))}</span>
        </li>
        <li>{parseCodeTags(t('setting.notice.steps.step4'))}</li>
        <li>
          {t('setting.notice.steps.step5')}
          <ul>
            <li>
              {t('setting.notice.steps.step5_embedder')}
              <pre>
                <code>
                  optimum-cli export openvino --model &lt;MODEL_ID&gt; --weight-format int8 --sym
                  --trust-remote-code --task feature-extraction &lt;OUTPUT&gt;
                </code>
              </pre>
            </li>
            <li>
              {t('setting.notice.steps.step5_reranker')}
              <pre>
                <code>
                  optimum-cli export openvino --model &lt;MODEL_ID&gt; --weight-format int8 --sym
                  --trust-remote-code --task text-classification &lt;OUTPUT&gt;
                </code>
              </pre>
            </li>
          </ul>
        </li>
        <li>
          {t('setting.notice.steps.step6')}
          <br />
          <img width="48%" src={modelStructureImage1} />
        </li>
      </ol>
    </div>
  );
};
export default Setting;
