// Mock configuration data for UI development
// This file is gitignored and should never be committed

pub fn get_mock_config() -> String {
    r##"{
        "version": "2.2.0",
        "default_doc_path": "test_files/",
        "local_model_hub": "local_models/",
        "is_admin": true,
        "ActiveAssistant": {
            "full_name": "Intel AI Assistant",
            "short_name": "IAA",
            "header_bg_color": "#0071c5",
            "header_text_bg_color": "#ffffff",
            "sidebar_box_bg_color": "#f5f5f5",
            "sidebar_box_refresh_bg_color": "#e0e0e0",
            "sidebar_box_refresh_hover_bg_color": "#d0d0d0",
            "models": [
                {
                    "full_name": "qwen2-7b-instruct",
                    "model_type": "chat_model"
                },
                {
                    "full_name": "bge-base-en-v1.5",
                    "model_type": "embedding_model"
                },
                {
                    "full_name": "bge-reranker-base",
                    "model_type": "ranker_model"
                }
            ],
            "parameters": "{\"categories\":[{\"name\":\"llm_params\",\"description\":\"LLM generation parameters\",\"fields\":[{\"name\":\"max_token\",\"type\":\"slider\",\"value\":1024,\"min\":100,\"max\":2048},{\"name\":\"temperature\",\"type\":\"slider\",\"value\":0.0,\"min\":0.0,\"max\":1.0}]},{\"name\":\"rag_params\",\"description\":\"RAG parameters\",\"fields\":[{\"name\":\"retriever_top_k\",\"type\":\"slider\",\"value\":10,\"min\":1,\"max\":50},{\"name\":\"reranker_top_k\",\"type\":\"slider\",\"value\":5,\"min\":1,\"max\":20}]}]}",
            "features": ["chat", "rag", "file_upload"],
            "recommended_models": "[{\"model\":\"qwen2-7b-instruct\",\"short_name\":\"qwen2-7b\"}]",
            "all_models": [
                {
                    "full_name": "Qwen2-7B-Instruct",
                    "short_name": "qwen2-7b",
                    "model_type": "chat_model"
                },
                {
                    "full_name": "BGE-Base-EN-v1.5",
                    "short_name": "bge-base-en",
                    "model_type": "embedding_model"
                },
                {
                    "full_name": "BGE-Reranker-Base",
                    "short_name": "bge-reranker",
                    "model_type": "ranker_model"
                }
            ]
        }
    }"##.to_string()
}

pub fn get_mock_system_info() -> String {
    r##"{
        "CurrentVersion": "2.2.0",
        "IsMinHWReqMet": true,
        "IsValidated": true,
        "IsLnL": true,
        "IsNpuDriverCompatible": true,
        "CPUInfo": {
            "Name": "Intel(R) Core(TM) i7-12700K",
            "NumberOfCores": 12,
            "NumberOfLogicCores": 20,
            "MaxFreqInGhz": 5.0
        },
        "MemoryInfo": {
            "CapacityInGB": 32,
            "FreqInMHz": 3200,
            "Type": "DDR4"
        },
        "GPUInfo": {
            "Name": "Intel(R) Arc(TM) A770 Graphics",
            "MemoryInGB": 16
        },
        "NpuInfo": {
            "Name": "Intel(R) AI Boost (Simulated NPU)",
            "hasNpu": true,
            "minVersion": "1.0.0",
            "version": "2.0.0"
        }
    }"##.to_string()
}

pub fn mock_set_config_success() -> String {
    "success".to_string()
}

pub fn mock_chat_response(question: &str) -> Vec<String> {
    vec![
        "This ".to_string(),
        "is ".to_string(),
        "a ".to_string(),
        "mock ".to_string(),
        "response ".to_string(),
        "to: ".to_string(),
        question.to_string(),
        "\n\nMock mode is active - no real backend is connected.".to_string(),
    ]
}
