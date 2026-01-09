import { createContext, useState, useContext } from 'react';
import { invoke } from '@tauri-apps/api/core';
import WorkflowDocScoring from '../workflows/documentScoring/WorkflowDocScoring';
import WorkflowResume from '../workflows/resume/WorkflowResume';
import WorkflowImageQuery from '../workflows/imageQuery/WorkflowImageQuery';
import WorkflowTable from '../workflows/tableQuery/WorkflowTable';
import WorkflowSummarize from '../workflows/summarizeQuery/WorkflowSummarize';
import WorkflowSuperAgent from '../workflows/mcpAgent/WorkflowSuperAgent';
import WorkflowChat from '../workflows/chat/WorkflowChat';
import { AppStatusContext } from './AppStatusContext';
import useDataStore from '../../stores/DataStore';

const WorkflowType = {
  GENERIC: 'Generic', // Normal chat session
  SUPER_AGENT: 'SuperAgent', // Routes queries using active MCP agents
  SUMMARIZE: 'Summarize', // Complex file summary
  QUERY_TABLES: 'QueryTables', // Complex tabular data + SQL queries
  QUERY_IMAGES: 'QueryImages', // Query attached images
  SCORE_RESUMES: 'ScoreResumes', // Query attached resumes based on job requirements
  SCORE_DOCUMENTS: 'ScoreDocuments', // Extract relevant information from set of documents
};

const WorkflowContext = createContext({
  selectedWorkflow: WorkflowType.GENERIC,
  setSelectedWorkflow: () => {},
});

const WorkflowContextProvider = ({ children }) => {
  const config = useDataStore(state => state.config);
  const assistant = useDataStore(state => state.assistant);
  const { setConfig, setAssistant } = useDataStore();
  const { isAppReady, setIsAppReady } = useContext(AppStatusContext);
  const [selectedWorkflow, setSelectedWorkflow] = useState(WorkflowType.GENERIC); // default to chat session
  const [workflowSidebarVisible, setWorkflowSidebarVisible] = useState(true); // start by default
  const [workflowId, setWorkflowId] = useState(0); // ensures reload of the same component when a new session is created
  const MAX_ID_VALUE = 1000000; // reset id if it exceeds this value

  /**
   * Safely switches the selected workflow, assuming that the input is valid and the app can change workflows
   */
  const setWorkflow = newWorkflow => {
    setWorkflowId((workflowId + 1) % MAX_ID_VALUE); // necessary for always forcing workflow re-renders
    if (newWorkflow === 'close') {
      // go to chat home screen and ensure workflow sidebar opens
      setSelectedWorkflow(WorkflowType.GENERIC);
      setWorkflowSidebarVisible(true);
      return;
    }
    const workflowKeys = Object.keys(WorkflowType);
    const matchedWorkflow = workflowKeys.find(key => WorkflowType[key] === newWorkflow);
    if (matchedWorkflow) {
      setSelectedWorkflow(WorkflowType[matchedWorkflow]);
    } else {
      console.warn(`No matching workflow found for input: ${newWorkflow}`);
    }
  };

  /**
   * Given a workflow type, returns the recommended model for that workflow. Or an empty string if none.
   */
  const getWorkflowRecommendedModel = w => {
    let workflow = w;
    if (workflow == null) {
      workflow = selectedWorkflow;
    }
    const chatModelsList = assistant.all_models
      .filter(m => m.model_type === 'chat_model')
      .map(m => m.full_name);
    const isHybrid =
      chatModelsList.length > 0 && chatModelsList.some(name => name.includes('GGUF'))
        ? true
        : false;
    switch (workflow) {
      case WorkflowType.QUERY_TABLES:
        if (isHybrid) {
          return ['Qwen3-8B-GGUF-Q4_K_M'];
        } else {
          return ['Qwen3-8B-int4-ov'];
        }
      case WorkflowType.SUMMARIZE:
      case WorkflowType.SCORE_RESUMES:
      case WorkflowType.SCORE_DOCUMENTS:
        if (isHybrid) {
          return ['Ministral-3-8B-GGUF', 'Qwen3-8B-GGUF-Q4_K_M'];
        } else {
          return ['Qwen3-8B-int4-ov'];
        }
      case WorkflowType.QUERY_IMAGES:
        if (isHybrid) {
          return ['Qwen3-VL-8B-GGUF'];
        } else {
          return ['Qwen2.5-VL-7B-Instruct-int4-ov', 'Phi-3.5-vision-instruct-int4-ov'];
        }
      case WorkflowType.SUPER_AGENT:
        if (isHybrid) {
          return ['Ministral-3-8B-GGUF', 'Qwen3-8B-GGUF-Q4_K_M'];
        } else {
          return ['Qwen3-8B-int4-ov'];
        }
      default:
        return [];
    }
  };

  // Returns the Workflow Title given a WorkflowType (or the selected workflow if none)
  const getWorkflowLabel = w => {
    let workflow = w;
    if (workflow == null) {
      workflow = selectedWorkflow;
    }
    switch (workflow) {
      case WorkflowType.GENERIC:
        return 'Chat';
      case WorkflowType.SUMMARIZE:
        return 'Summarize';
      case WorkflowType.SCORE_RESUMES:
        return 'Evaluate Resumes';
      case WorkflowType.QUERY_TABLES:
        return 'Analyze Tables';
      case WorkflowType.SCORE_DOCUMENTS:
        return 'Score Documents';
      case WorkflowType.QUERY_IMAGES:
        return 'Query Images';
      case WorkflowType.SUPER_AGENT:
        return 'Super Agent (MCP)';
      default:
        return 'Workflow Title';
    }
  };

  // Returns the Workflow Description given a WorkflowType (or the selected workflow if none)
  const getWorkflowDescription = w => {
    let workflow = w;
    if (workflow == null) {
      workflow = selectedWorkflow;
    }
    switch (workflow) {
      case WorkflowType.GENERIC:
        return 'General chat queries with or without files.';
      case WorkflowType.SUMMARIZE:
        return 'Summarize files and ask follow-up questions based on the summary.';
      case WorkflowType.SCORE_RESUMES:
        return 'Evaluate resumes based on the job description. Resumes will be ranked by their overall strength.';
      case WorkflowType.QUERY_TABLES:
        return 'Analyze files that have a table format where the first row contains column headers and the rest contain data.';
      case WorkflowType.SCORE_DOCUMENTS:
        return 'Score unstructured documents based on scoring criteria. Reasoning is excluded by default. Processing time increases with document length.';
      case WorkflowType.QUERY_IMAGES:
        return 'Query images for text extraction, captioning, and other tasks. This requires a vision model.';
      case WorkflowType.SUPER_AGENT:
        return 'Super Agent routes queries through MCP services. Click the MCP Manager first to configure the services.';
      default:
        return 'No description provided for this workflow.';
    }
  };

  // given query type JSON string, build a query type Prompt request object
  const buildPromptRequest = (queryType = { name: '' }) => {
    let prompt = {};
    const workflow = queryType.name;
    console.log('Workflow Input: ', workflow);
    switch (workflow) {
      case WorkflowType.SCORE_RESUMES:
        prompt.PromptType = {
          ScoreResumesPrompt: {
            is_scoring_criteria: queryType.is_scoring_criteria
              ? queryType.is_scoring_criteria
              : false,
          },
        };
        break;
      case WorkflowType.SCORE_DOCUMENTS:
        prompt.PromptType = {
          ScoreDocumentsPrompt: {
            is_scoring_criteria: queryType.is_scoring_criteria
              ? queryType.is_scoring_criteria
              : false,
            include_reasoning: queryType.include_reasoning ? queryType.include_reasoning : false,
          },
        };
        break;
      case WorkflowType.SUMMARIZE:
        prompt.PromptType = { SummarizePrompt: {} };
        break;
      case WorkflowType.QUERY_TABLES:
        prompt.PromptType = { QueryTablesPrompt: {} };
        break;
      case WorkflowType.QUERY_IMAGES:
        prompt.PromptType = { QueryImagesPrompt: {} };
        break;
      case WorkflowType.SUPER_AGENT:
        prompt.PromptType = { SuperAgentPrompt: {} };
        break;
      default:
        prompt.PromptType = { GenericPrompt: {} };
        break;
    }
    return prompt;
  };

  const validateModel = async (modelName, modelType) => {
    const modelPath = config.local_model_hub + modelName;
    console.log('Validating Model: ', modelPath);
    const is_valid = await invoke('validate_model', { modelPath: modelPath, modelType: modelType });
    return is_valid;
  };

  /**
   * Return true if current model includes one of the keywords, otherwise return false
   */
  const isVisionModel = async () => {
    const currentModel = assistant.models.chat_model;
    return await validateModel(currentModel, 'vision');
  };

  // returns the current chat model
  const getChatModel = () => {
    return assistant.models.chat_model;
  };

  const switchChatModel = newModel => {
    const updatedAssistant = {
      ...assistant,
      models: {
        ...assistant.models,
        chat_model: newModel,
      },
    };
    const updatedConfig = {
      ...config,
      ActiveAssistant: updatedAssistant,
    };
    setAssistant(updatedAssistant);
    setConfig(updatedConfig);
  };

  const switchToWorkflowRecommendedModel = async () => {
    const recommendedModel = getWorkflowRecommendedModel(); // get the current workflow's recommended model
    const currentModel = assistant.models.chat_model;
    if (recommendedModel.includes(currentModel)) {
      console.log(`${currentModel} already in ${recommendedModel} .`);
      return true;
    }
    console.log(
      `Model is ${currentModel}. Attempting to switch to ${selectedWorkflow} recommended model ${recommendedModel[0]}`
    );
    switchChatModel(recommendedModel[0]); // switch to first recommended model
    return true; // need some way to set with a returned success or failure message
  };

  /*
        Calls given workflow API and returns result, or null if error.
        Handles setting app status so each workflow doesn't have to.
    */
  const callWorkflowAPI = async (name, parameters) => {
    let result = null;
    if (!isAppReady) {
      console.error('App is not ready, cannot call workflow API: ', name);
    } else {
      try {
        setIsAppReady(false); // disable app actions while waiting for response
        result = await invoke(name, parameters);
      } catch {
        console.error(
          `An error occured with workflow API ${name} with parameters ${parameters}: ${error}`
        );
      } finally {
        setIsAppReady(true); // response given so enable app actions
      }
    }
    return result;
  };

  /**
   * Returns the currently selected workflow component
   * @returns Respective component is returned based on selected workflow
   */
  const renderSelectedWorkflow = () => {
    switch (selectedWorkflow) {
      case WorkflowType.SUMMARIZE:
        return <WorkflowSummarize key={`workflow-${workflowId}`} loading={!isAppReady} />;
      case WorkflowType.QUERY_TABLES:
        return <WorkflowTable key={`workflow-${workflowId}`} loading={!isAppReady} />;
      case WorkflowType.QUERY_IMAGES:
        return <WorkflowImageQuery key={`workflow-${workflowId}`} loading={!isAppReady} />;
      case WorkflowType.SCORE_RESUMES:
        return (
          <WorkflowResume
            key={`workflow-${workflowId}`}
            loading={!isAppReady}
            invoke={callWorkflowAPI}
          />
        );

      case WorkflowType.SCORE_DOCUMENTS:
        return (
          <WorkflowDocScoring
            key={`workflow-${workflowId}`}
            loading={!isAppReady}
            invoke={callWorkflowAPI}
          />
        );
      case WorkflowType.SUPER_AGENT:
        return (
          <WorkflowSuperAgent
            key={`workflow-${workflowId}`}
            loading={!isAppReady}
            invoke={callWorkflowAPI}
          />
        );
      case WorkflowType.GENERIC:
      default:
        return <WorkflowChat key={`workflow-${workflowId}`} />;
    }
  };

  return (
    <WorkflowContext.Provider
      value={{
        selectedWorkflow,
        setWorkflow,
        renderSelectedWorkflow,
        setWorkflowSidebarVisible,
        workflowSidebarVisible,
        switchToWorkflowRecommendedModel,
        getWorkflowRecommendedModel,
        isVisionModel,
        getChatModel,
        getWorkflowLabel,
        getWorkflowDescription,
        buildPromptRequest,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
};

export { WorkflowContext, WorkflowContextProvider };
