use super::config::Config as MyConfig;
use super::status as MyStatus;
use futures::stream::StreamExt;
use std::sync::Arc;
use std::{ env, path::PathBuf };
use super_builder::super_builder_client::SuperBuilderClient;
use super_builder::{ ChatRequest, CheckHealthRequest };
use super_builder::prompt_options::{ 
    GenericPrompt, 
    ScoreDocumentsPrompt, 
    ScoreResumesPrompt, 
    SummarizePrompt, 
    QueryImagesPrompt, 
    QueryTablesPrompt, 
    SuperAgentPrompt,
};
use tauri::State;
use tonic::transport::Channel;
use tokio::sync::Mutex;
use tauri::Window;
use tauri::Emitter;
use serde::{ Deserialize };
use serde_json::{ json };

pub mod super_builder {
    tonic::include_proto!("super_builder");
}

pub type SharedClient = Arc<Mutex<Option<SuperBuilderClient<Channel>>>>;

#[derive(Deserialize)]
pub struct ChatMessage {
    #[serde(rename = "Role")]
    role: String,
    #[serde(rename = "Content")]
    content: String,
}

#[derive(Deserialize)]
pub enum PromptType {
    #[serde(rename = "GenericPrompt")]
    GenericPrompt {},
    #[serde(rename = "ScoreResumesPrompt")]
    ScoreResumesPrompt { 
        is_scoring_criteria: bool 
    },
    #[serde(rename = "ScoreDocumentsPrompt")]
    ScoreDocumentsPrompt { 
        is_scoring_criteria: bool, 
        include_reasoning: bool 
    },
    #[serde(rename = "SummarizePrompt")]
    SummarizePrompt {},
    #[serde(rename = "QueryTablesPrompt")]
    QueryTablesPrompt {},
    #[serde(rename = "QueryImagesPrompt")]
    QueryImagesPrompt {},
    #[serde(rename = "SuperAgentPrompt")]
    SuperAgentPrompt {},
}

// Define the Prompt structure with oneof fields
#[derive(Deserialize)]
pub struct PromptOptions {
    #[serde(rename = "PromptType")]
    prompt_type: PromptType,
}

#[tauri::command]
pub async fn call_chat(
    window: tauri::Window,
    client: State<'_, SharedClient>,
    name: String,
    prompt: String,
    conversation_history: Vec<ChatMessage>,
    sid: Option<i32>, // session id to add chat messages to
    files: Option<String>, // files to use specifically for this query
    prompt_options: Option<PromptOptions>,
) -> Result<(), String> {
    // Clone the client reference to avoid holding the lock for the entire function
    let mut client_ref = {
        let mut client_guard = client.lock().await;
        client_guard.as_mut().ok_or("Client not initialized")?.clone()
    };

    // Convert to gRPC ConversationHistory object
    let history: Vec<super_builder::ConversationHistory> = conversation_history
        .into_iter()
        .map(|msg| super_builder::ConversationHistory {
            role: msg.role,
            content: msg.content,
        })
        .collect();

    let prompt_obj = super_builder::PromptOptions {
        prompt_type: match prompt_options {
            Some(options) => match options.prompt_type {
                PromptType::GenericPrompt {} => Some(super_builder::prompt_options::PromptType::GenericPrompt(GenericPrompt {})),
                PromptType::ScoreResumesPrompt { is_scoring_criteria } => Some(super_builder::prompt_options::PromptType::ScoreResumesPrompt(ScoreResumesPrompt { is_scoring_criteria })),
                PromptType::ScoreDocumentsPrompt { is_scoring_criteria, include_reasoning } => Some(super_builder::prompt_options::PromptType::ScoreDocumentsPrompt(ScoreDocumentsPrompt { is_scoring_criteria, include_reasoning })),
                PromptType::SummarizePrompt {} => Some(super_builder::prompt_options::PromptType::SummarizePrompt(SummarizePrompt {})),
                PromptType::QueryTablesPrompt {} => Some(super_builder::prompt_options::PromptType::QueryTablesPrompt(QueryTablesPrompt {})),
                PromptType::QueryImagesPrompt {} => Some(super_builder::prompt_options::PromptType::QueryImagesPrompt(QueryImagesPrompt {})),
                PromptType::SuperAgentPrompt {} => Some(super_builder::prompt_options::PromptType::SuperAgentPrompt(SuperAgentPrompt {})),
            },
            None => Some(super_builder::prompt_options::PromptType::GenericPrompt(GenericPrompt {})),
        }
    };

    let request = ChatRequest {
        name: name,
        prompt: prompt,
        history: history,
        attached_files: files,
        session_id: sid,
        prompt_options: Some(prompt_obj),
    };

    let response = client_ref
        .chat(request).await
        .map_err(|e| format!("Failed to send chat: {}", e))?;

    let mut stream = response.into_inner();

    let mut stop_flag = false;
    while let Some(message) = stream.next().await {
        if stop_flag == false {
            let _ = window.emit("first_word", stop_flag);
        }
        stop_flag = true;
        match message {
            Ok(chat_response) => {
                // Reformat ChatResponse as JSON string to send to event listener
                let json_response =
                    json!({
                    "message": chat_response.message,
                    "references": chat_response.references.iter().map(|reference| {
                        json!({
                            "file": reference.file,
                            "page": reference.page,
                            "sheet": reference.sheet,
                        })
                    }).collect::<Vec<_>>(),
                });
                let json_string = serde_json
                    ::to_string(&json_response)
                    .map_err(|e| format!("Failed to serialize response: {}", e))?;

                window
                    .emit("new_message", json_string)
                    .map_err(|e| format!("Failed to emit message: {}", e))?;
            }
            Err(e) => {
                // Send stop signal to backend to stop chat generation
                println!("Sending stop signal to backend to stop chat generation");
                let request = super_builder::StopChatRequest {};
                let response = client_ref
                    .stop_chat(request).await
                    .map_err(|e| format!("Failed to stop chat: {}", e))?;
                let _reply = response.into_inner();
                window
                    .emit("stream-completed", true)
                    .expect("Failed to emit stream completed event");
                return Err(format!("Stream error: {}", e));
            }
        }
    }

    window.emit("stream-completed", true).expect("Failed to emit stream completed event");

    Ok(())
}

// Attempt to stop backend chat generation early
#[tauri::command]
pub async fn stop_chat(
    _window: tauri::Window,
    client: State<'_, SharedClient>
) -> Result<(), String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    // Build and send stop chat request
    let request = super_builder::StopChatRequest {};
    let response = client_ref
        .stop_chat(request).await
        .map_err(|e| format!("Failed to stop chat: {}", e))?;
    let _reply = response.into_inner();
    // println!("Chat canceled");
    Ok(())
}

#[tauri::command]
pub async fn load_models(
    window: tauri::Window,
    client: State<'_, SharedClient>
) -> Result<bool, String> {
    #[cfg(feature = "mock-backend")]
    {
        println!("🔧 MOCK MODE: load_models called");
        window.emit("load_models_progress", "Mock: Models loaded successfully").ok();
        return Ok(true);
    }

    #[cfg(not(feature = "mock-backend"))]
    {
        let _ = window;
        let mut client_guard = client.lock().await;
        let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

        // Build and send load models request
        let request = super_builder::LoadModelsRequest {};
        let response = client_ref
            .load_models(request).await
            .map_err(|e| format!("Failed to load models: {}", e))?;
        let reply = response.into_inner();
        Ok(reply.status)
    }
}

#[tauri::command]
pub async fn connect_client(client: State<'_, SharedClient>) -> Result<(), String> {
    #[cfg(feature = "mock-backend")]
    {
        println!("🔧 MOCK MODE: connect_client - skipping middleware connection");
        return Ok(());
    }

    #[cfg(not(feature = "mock-backend"))]
    {
        // Determine the path to the config file, e.g., from an environment variable or default location
        let config_path = env
            ::var("CONFIG_PATH")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("config.toml"));

        // Load the configuration
        let config = MyConfig::load_config(config_path).map_err(|e|
            format!("Failed to load config: {:?}", e)
        )?;

        // Use the configuration to connect to the gRPC server
        let host = config.grpc.host.unwrap_or_else(|| "localhost".to_string());
        let port = config.grpc.port.unwrap_or_else(|| 50051); // Provide a default port if None

        let new_client = SuperBuilderClient::connect(format!("http://{}:{}", host, port)).await.map_err(
            |_e| format!("Failed to connect to middleware.")
        )?;

        let mut client_guard = client.lock().await;
        *client_guard = Some(new_client);

        Ok(())
    }
}

#[tauri::command]
pub async fn initialize_client() -> SharedClient {
    Arc::new(Mutex::new(None))
}

#[tauri::command]
pub async fn mw_say_hello(client: State<'_, SharedClient>) -> Result<String, String> {
    #[cfg(feature = "mock-backend")]
    {
        println!("🔧 MOCK MODE: mw_say_hello called");
        return Ok(crate::mock::mock_data::get_mock_system_info());
    }

    #[cfg(not(feature = "mock-backend"))]
    {
        // Lock the Mutex and ensure the client is mutable
        let mut client_guard = client.lock().await;
        let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

        let request = super_builder::SayHelloRequest {
            name: "UI".to_string(),
        };

        let response = client_ref
            .say_hello(request).await
            .map_err(|e| format!("Failed to connect: {}", e))?;

        // Extract the actual HealthReply message from the tonic::Response
        let reply = response.into_inner();
        // println!("reply {}", reply.message.to_string());
        Ok(reply.message.to_string())
    }
}

#[tauri::command]
pub async fn pyllm_say_hello(client: State<'_, SharedClient>) -> Result<String, String> {
    #[cfg(feature = "mock-backend")]
    {
        println!("🔧 MOCK MODE: pyllm_say_hello - returning 'ready'");
        return Ok("ready".to_string());
    }

    #[cfg(not(feature = "mock-backend"))]
    {
        // Lock the Mutex and ensure the client is mutable
        let mut client_guard = client.lock().await;
        let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

        let request = super_builder::SayHelloRequest {
            name: "UI".to_string(),
        };

        let response = client_ref
            .say_hello_pyllm(request).await
            .map_err(|e| format!("Failed to connect: {}", e))?;

        // Extract the actual HealthReply message from the tonic::Response
        let reply = response.into_inner();
        println!("reply {}", reply.message.to_string());
        Ok(reply.message.to_string())
    }
}

#[tauri::command]
pub async fn llm_health_check(client: State<'_, SharedClient>) -> Result<(), String> {
    // Lock the Mutex and ensure the client is mutable
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    // Return the mutable reference to the client
    let request = CheckHealthRequest {
        type_of_check: "UI".to_string(),
    };

    let response = client_ref
        .check_health(request).await
        .map_err(|e| format!("Failed to connect: {}", e))?;

    // Extract the actual HealthReply message from the tonic::Response
    let health_reply = response.into_inner();

    println!("health_reply {}", health_reply.status.to_string());

    // Convert the string message to a HealthCheckStatus enum
    let status = MyStatus::HealthCheckStatus::from_message(&health_reply.status);

    match status {
        MyStatus::HealthCheckStatus::Ready => {
            // The service is healthy, return an Ok with no message
            Ok(())
        }
        MyStatus::HealthCheckStatus::Healthy => {
            // The service is healthy, return an Ok with no message
            Ok(())
        }
        MyStatus::HealthCheckStatus::LlmModelNotFound => {
            // The service is healthy, return an Ok with no message
            Err("LLM mode is not found".to_string())
        }
        MyStatus::HealthCheckStatus::EmbeddingModelNotFound => {
            // The service is healthy, return an Ok with no message
            Err("Embedding mode is not found".to_string())
        }
        MyStatus::HealthCheckStatus::Downloading => {
            // The service is healthy, return an Ok with no message
            Err("Asset is downloading".to_string())
        }
        MyStatus::HealthCheckStatus::Unhealthy => {
            // The service is unhealthy, return an Err with a message
            Err("PyLlmService is unhealthy".to_string())
        }
        MyStatus::HealthCheckStatus::NotReady => {
            // The service is not ready, return an Err with a message
            Err("PyLlmService is not ready".to_string())
        }
        MyStatus::HealthCheckStatus::Unknown => {
            // The health status is unknown, return an Err with a message
            Err("PyLlmService is not available".to_string())
        }
    }
}

#[tauri::command]
pub async fn upload_file(
    window: tauri::Window,
    client: State<'_, SharedClient>,
    paths: String,
    upload_method: Option<String>,
) -> Result<String, String> {

    // Clone the client reference to avoid holding the lock for the entire function
    let mut client_ref = {
        let mut client_guard = client.lock().await;
        client_guard.as_mut().ok_or("Client not initialized")?.clone()
    };

    let request = super_builder::AddFilesRequest {
        files_to_upload: paths,
        upload_type: upload_method,
    };

    let response = client_ref
        .add_files(request).await
        .map_err(|e| format!("Failed to upload file: {}", e))?;

    // Stream back file upload progress
    let mut files_uploaded_result = String::from("");
    let mut stream = response.into_inner();
    while let Some(message) = stream.next().await {
        match message {
            Ok(file_response) => {
                let files_uploaded = file_response.files_uploaded;
                files_uploaded_result = files_uploaded.clone();
                let mut current_file_progress = String::from("No progress");
                let mut current_file_uploading = String::from("No file");

                // Set optional fields if they exist
                if let Some(current_file) = &file_response.current_file_uploading {
                    current_file_uploading = current_file.clone();
                }
                if let Some(file_progress) = &file_response.current_file_progress {
                    current_file_progress = file_progress.clone();
                }

                let msg =
                    json!({
                    "files_uploaded": files_uploaded,
                    "current_file_uploading": current_file_uploading,
                    "current_file_progress": current_file_progress,
                });

                // Emit the file progress to invoker
                window
                    .emit("upload-progress", msg)
                    .map_err(|e| format!("Failed to emit message: {}", e))?;
            }
            Err(e) => {
                return Err(format!("Stream error: {}", e));
            }
        }
    }

    // Inform window that upload request is complete with final uploaded files result
    // println!("Returning files uploaded result: {}", files_uploaded_result);
    window
        .emit("upload-completed", files_uploaded_result.clone())
        .expect("Failed to emit stream completed event");
    Ok(files_uploaded_result)
}

// Attempt to stop backend file upload early
#[tauri::command]
pub async fn stop_upload_file(
    _window: tauri::Window,
    client: State<'_, SharedClient>
) -> Result<(), String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;
    // Build and send stop upload file request
    let request = super_builder::StopAddFilesRequest {};
    let response = client_ref
        .stop_add_files(request).await
        .map_err(|e| format!("Failed to stop upload file: {}", e))?;
    let _reply = response.into_inner();
    // println!("File upload canceled");
    Ok(())
}

#[tauri::command]
pub async fn remove_file(
    client: State<'_, SharedClient>,
    files: String // This should be the file content sent from the frontend
) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let request = super_builder::RemoveFilesRequest {
        files_to_remove: files,
    };

    let response = client_ref
        .remove_files(request).await
        .map_err(|e| format!("Failed to remove file: {}", e))?;

    let reply = response.into_inner();
    Ok(reply.files_removed)
}

#[tauri::command]
pub async fn get_file_list(client: State<'_, SharedClient>) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let request = super_builder::GetFileListRequest {
        file_type: "".to_string(),
    };

    let response = client_ref
        .get_file_list(request).await
        .map_err(|e| format!("Failed to get file list: {}", e))?;

    let reply = response.into_inner();

    Ok(reply.file_list)
}

// Send email from outlook (Windows only)
#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn send_email(
    recipient: Option<String>,
    subject: String,
    message: String
) -> Result<(), String> {
    use std::{ io, process };
    use lazy_static::lazy_static;

    lazy_static! {
        static ref OUTLOOK_EXE: Option<&'static str> = {
            use winreg::{ enums::HKEY_LOCAL_MACHINE, RegKey };

            const OUTLOOK_SUBKEY: &str =
                "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\OUTLOOK.EXE";

            let subkey = match RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey(OUTLOOK_SUBKEY) {
                Ok(subkey) => subkey,
                Err(_) => {
                    return None;
                }
            };
            let value: String = match subkey.get_value("") {
                Ok(value) => value,
                Err(_) => {
                    return None;
                }
            };
            Some(Box::leak(value.into_boxed_str()))
        };
    }

    let recipient = recipient.unwrap_or_else(|| "noreply@example.org".to_string());
    let inputs = (
        recipient +
        "?subject=" +
        subject.as_str() +
        "&body=" +
        message
            .replace('%', "%25")
            .replace('"', "%22")
            .replace('&', "%26")
            .replace('?', "%3F")
            .as_str()
    ).to_string();

    let outlook_exe = OUTLOOK_EXE.ok_or_else(||
        io::Error::new(io::ErrorKind::NotFound, "OUTLOOK.EXE").to_string()
    )?;
    let _ = process::Command
        ::new(outlook_exe)
        .arg("/c")
        .arg("ipm.note")
        .arg("/m")
        .arg(inputs)
        .spawn();

    Ok(())
}

// Linux/macOS stub for send_email
#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn send_email(
    _recipient: Option<String>,
    _subject: String,
    _message: String
) -> Result<(), String> {
    Err("Email functionality is only available on Windows".to_string())
}

#[tauri::command]
pub async fn send_feedback(
    client: State<'_, SharedClient>,
    question: String,
    feedback: String,
    answer: String,
    r#type: String // This should be the file content sent from the frontend
) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let request = super_builder::AddFeedbackRequest {
        question: question,
        feedback: feedback,
        feedback_type: r#type,
        answer: Some(answer),
    };

    let response = client_ref
        .add_feedback(request).await
        .map_err(|e| format!("Failed to upload file: {}", e))?;

    let reply = response.into_inner();
    Ok(reply.message)
}

#[tauri::command]
pub async fn download_file(
    client: State<'_, SharedClient>,
    file_url: String,
    local_path: String,
    token_id: Option<String>,
    window: Window
) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let request = super_builder::DownloadFilesRequest {
        file_url: file_url.clone(),
        local_path,
        token_id,
    };

    let mut response_stream = client_ref
        .download_files(request).await
        .map_err(|e| format!("Failed to download file: {}", e))?
        .into_inner();
    let mut last_file_downloaded = String::new();
    while
        let Some(download_response) = response_stream
            .message().await
            .map_err(|e| format!("Error receiving download progress: {}", e))?
    {
        // Emit the progress to the frontend
        let download_file = file_url.clone();
        let progress_data = download_response.progress;
        last_file_downloaded = download_response.file_downloaded.clone();
        // Emit the event to the React frontend
        window
            .emit("download-progress", (download_file, progress_data))
            .map_err(|e| format!("Failed to emit progress event: {}", e))?;

        // Check if the download is complete
        if download_response.progress == 100 {
            return Ok(download_response.file_downloaded);
        }
    }

    Err(format!("{}", last_file_downloaded))
}

#[tauri::command]
pub async fn set_parameters(
    client: State<'_, SharedClient>,
    parameters_json: String
) -> Result<(), String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;
    // Create the request
    let request = super_builder::SetParametersRequest {
        parameters_json,
    };
    client_ref
        .set_parameters(request).await
        .map_err(|e| format!("Failed to set parameters: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_config(
    db_client: tauri::State<'_, SharedClient>,
    assistant: String
) -> Result<String, String> {
    #[cfg(feature = "mock-backend")]
    {
        println!("🔧 MOCK MODE: get_config called for assistant: {}", assistant);
        return Ok(crate::mock::mock_data::get_mock_config());
    }

    #[cfg(not(feature = "mock-backend"))]
    {
        // Get a mutable reference to the QueryClient from the shared state
        let mut client_guard = db_client.lock().await;
        let db_client_ref = client_guard.as_mut().ok_or("Client not initialized")?;
        // Create the QueryRequest
        let request = super_builder::GetClientConfigRequest {
            assistant,
        };

        // Perform the gRPC query
        let response = db_client_ref
            .get_client_config(request).await
            .map_err(|e| format!("Failed to query database: {}", e))?;

        // Extract the message from the QueryReply
        let reply = response.into_inner();
        Ok(reply.data)
    }
}

#[tauri::command]
pub async fn get_chat_history(client: tauri::State<'_, SharedClient>) -> Result<String, String> {
    // Get a mutable reference to the QueryClient from the shared state
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;
    // Create the QueryRequest
    let request = super_builder::GetChatHistoryRequest {};

    // Perform the gRPC query
    let response = client_ref
        .get_chat_history(request).await
        .map_err(|e| format!("Failed to query database: {}", e))?;

    // Extract the message from the QueryReply
    let reply = response.into_inner();
    Ok(reply.data)
}

#[tauri::command]
pub async fn remove_session(
    client: tauri::State<'_, SharedClient>,
    sid: i32 // int32 required for GRPC
) -> Result<bool, String> {
    // Get a mutable reference to the QueryClient from the shared state
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;
    // Create the QueryRequest
    let request = super_builder::RemoveSessionRequest {
        session_id: sid,
    };

    // Perform the gRPC query
    let response = client_ref
        .remove_session(request).await
        .map_err(|e| format!("Failed to query database: {}", e))?;

    // Extract the message from the QueryReply
    let reply = response.into_inner();
    Ok(reply.success)
}

#[tauri::command]
pub async fn set_session_name(
    client: tauri::State<'_, SharedClient>,
    sid: i32, // int32 required for GRPC
    name: String
) -> Result<bool, String> {
    // Get a mutable reference to the QueryClient from the shared state
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    // Create the QueryRequest
    let request = super_builder::SetSessionNameRequest {
        session_id: sid,
        session_name: name,
    };

    // Perform the gRPC query
    let response = client_ref
        .set_session_name(request).await
        .map_err(|e| format!("Failed to query database: {}", e))?;

    // Extract the message from the QueryReply
    let reply = response.into_inner();
    Ok(reply.success)
}

// #[derive(Deserialize)]
// struct UpdateManifest {
//     configxml: String,
//     configtype: String, // "type" is a reserved word in Rust, so we escape it with `r#`.
// }

#[tauri::command]
pub async fn update_notification(ntf_client: State<'_, SharedClient>) -> Result<String, String> {
    // Lock the Mutex and ensure the client is mutable
    let mut client_guard = ntf_client.lock().await;
    let ntf_client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let request = super_builder::SayHelloRequest {
        name: "Update".to_string(),
    };

    let response = ntf_client_ref
        .get_software_update(request).await
        .map_err(|e| format!("Failed to connect: {}", e))?;

    // Extract the actual UpdateReply message from the tonic::Response
    let reply = response.into_inner();
    // let data: Vec<HashMap<String, Value>> = serde_json::from_str(&reply.message).unwrap();

    // println!("update: {:?}", reply.message);

    // let modified_json_str = serde_json::to_string_pretty(&data).unwrap();
    // Ok(modified_json_str)
    Ok(reply.message)
}

#[tauri::command]
pub async fn set_models(
    client: tauri::State<'_, SharedClient>,
    llm: String,
    embedder: String,
    ranker: String
) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;
    let path_buf = PathBuf::from("C:\\ProgramData\\IntelAIA\\local_models");
    let llm_path = path_buf.join(llm).to_string_lossy().to_string();
    let embedder_path = path_buf.join(embedder).to_string_lossy().to_string();
    let ranker_path = path_buf.join(ranker).to_string_lossy().to_string();

    let request = super_builder::SetModelsRequest {
        llm: Some(llm_path),
        embedder: Some(embedder_path),
        ranker: Some(ranker_path),
    };

    let response = client_ref
        .set_models(request).await
        .map_err(|e| format!("Failed to connect: {}", e))?;
    let reply = response.into_inner();
    println!("set_models {:?}", reply);

    Ok(reply.models_loaded)
}

#[tauri::command]
pub async fn update_db_models(
    client: State<'_, SharedClient>,
    assistant: String,
    models_json: String
) -> Result<String, String> {
    #[cfg(feature = "mock-backend")]
    {
        println!("🔧 MOCK MODE: update_db_models - assistant: {}, models: {}", assistant, models_json);
        return Ok("Mock: Assistant set successfully.".to_string());
    }

    #[cfg(not(feature = "mock-backend"))]
    {
        let mut client_guard = client.lock().await;
        let db_client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

        let request = super_builder::SetActiveAssistantRequest {
            assistant: assistant.into(),
            models_json: models_json.into(),
        };

        let response = db_client_ref
            .set_active_assistant(request).await
            .map_err(|e| format!("Failed to query database: {}", e))?;

        if response.into_inner().success {
            println!("Assistant set successfully.");
        }

        Ok("Assistant set successfully.".to_string())
    }
}

#[tauri::command]
pub async fn convert_model(
    client: tauri::State<'_, SharedClient>,
    model_path: String,
    parameters: Option<String>,
    token_id: Option<String>
) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let db_client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let request = super_builder::ConvertModelRequest {
        model_path: model_path.into(),
        parameters: parameters.into(),
        token_id: token_id.into(),
    };

    let response = db_client_ref
        .convert_model(request).await
        .map_err(|e| format!("Failed to convert model: {}", e))?;

    let reply = response.into_inner();

    if reply.message == "" {
        Ok(reply.message)
    } else {
        Err(reply.message.into())
    }
}

#[tauri::command]
pub async fn validate_model(
    client: tauri::State<'_, SharedClient>,
    model_path: String, 
    model_type: Option<String>,
) -> Result<bool, String> {
    let mut client_guard = client.lock().await;
    let db_client_ref = client_guard.as_mut().ok_or("Client not initialized")?;
    let request = super_builder::ValidateModelRequest{
        model_path: model_path,
        model_type: model_type,
    };
    let response = db_client_ref.validate_model(request).await.map_err(|e| format!("Failed to validate model: {}", e))?;
    let reply = response.into_inner();
    Ok(reply.is_valid)
}

#[tauri::command]
pub async fn upload_model(
    client: tauri::State<'_, SharedClient>,
    source_dir: String,
    model: String,
    model_type: String,
    move_directory: Option<bool>,
    download_link: Option<String>
) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let db_client_ref = client_guard.as_mut().ok_or("Client not initialized")?;
    // Create the SetActiveAssistantRequest
    let request = super_builder::UploadModelRequest {
        source_dir: source_dir.into(),
        model: model.into(),
        model_type: model_type.into(),
        move_directory: move_directory.unwrap_or(false),
        download_link: download_link.unwrap_or_else(|| "".to_string()),
    };

    let response = db_client_ref
        .upload_model(request).await
        .map_err(|e| format!("Failed to upload model: {}", e))?;

    let reply = response.into_inner();

    if reply.message == "Already exists" {
        Err("*Error, duplicate folder name. Please use a unique folder name*".into())
    } else {
        Ok(reply.message)
    }
}

#[tauri::command]
pub async fn remove_model(
    client: tauri::State<'_, SharedClient>,
    model_name: String,
    is_incompatible_model_removal: Option<bool>
) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let db_client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let request = super_builder::RemoveModelRequest {
        model_name: model_name.clone(),
        is_incompatible_model_removal: is_incompatible_model_removal.unwrap_or(false),
    };

    let response = db_client_ref
        .remove_model(request).await
        .map_err(|e| format!("Failed to remove model: {}", e))?;

    let reply = response.into_inner();

    // Check if removal was successful
    if reply.message.is_empty() {
        // Empty message means success
        Ok(format!("Successfully removed model: {}", model_name))
    } else {
        // Non-empty message means error
        Err(reply.message)
    }
}

#[tauri::command]
pub async fn set_assistant_view_model(
    client: State<'_, SharedClient>,
    vm: String, //MW defined serialized AssistantViewModel object
    reset_ux_settings: Option<bool>
) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let request = super_builder::SetAssistantViewModelRequest {
        view_model: vm,
        reset_ux_settings: reset_ux_settings.unwrap_or(false),
    };

    let response = client_ref
        .set_assistant_view_model(request).await
        .map_err(|e| format!("Failed to set assistant viewmodel: {}", e))?;

    let reply = response.into_inner();
    if reply.message == "success" {
        Ok(reply.message)
    } else {
        Err(reply.message.into())
    }
}

#[tauri::command]
pub async fn set_user_config_view_model(
    client: State<'_, SharedClient>,
    vm: String //MW defined serialized UserConfigViewModel object
) -> Result<String, String> {
    #[cfg(feature = "mock-backend")]
    {
        println!("🔧 MOCK MODE: set_user_config_view_model called");
        println!("📝 Config update: {}", vm);
        return Ok(crate::mock::mock_data::mock_set_config_success());
    }

    #[cfg(not(feature = "mock-backend"))]
    {
        let mut client_guard = client.lock().await;
        let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

        let request = super_builder::SetUserConfigViewModelRequest {
            view_model: vm,
        };

        let response = client_ref
            .set_user_config_view_model(request).await
            .map_err(|e| format!("Failed to set userconfig viewmodel: {}", e))?;

        let reply = response.into_inner();

        Ok(reply.message)
    }
}

#[tauri::command]
pub async fn export_user_config(
    client: State<'_, SharedClient>,
    assistant_name: String,
    export_path: String
) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let request = super_builder::ExportUserConfigRequest {
        assistant_name,
        export_path,
    };

    let response = client_ref
        .export_user_config(request).await
        .map_err(|e| format!("Failed to export user config: {}", e))?;

    let reply = response.into_inner();
    if reply.success {
        Ok(reply.message) //Exported Filename
    } else {
        Err(reply.message) //Error message.
    }
}

#[tauri::command]
pub async fn import_user_config(
    client: State<'_, SharedClient>,
    import_path: String
) -> Result<bool, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let request = super_builder::ImportUserConfigRequest {
        import_path,
    };

    let response = client_ref
        .import_user_config(request).await
        .map_err(|e| format!("Failed to import user config: {}", e))?;

    let reply = response.into_inner();
    if reply.success {
        Ok(true)
    } else {
        Err(reply.message)
    }
}

#[tauri::command]
pub async fn get_mcp_agents(client: State<'_, SharedClient>) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let request = super_builder::GetMcpAgentsRequest {};

    let response = client_ref
        .get_mcp_agents(request).await
        .map_err(|e| format!("Failed to get MCP agents: {}", e))?;

    let reply = response.into_inner();
    let json_string = serde_json
        ::to_string(&reply.agents)
        .map_err(|e| format!("Failed to serialize: {}", e))?;
    // Return this string to the frontend
    Ok(json_string)
}

#[tauri::command]
pub async fn get_active_mcp_agents(client: State<'_, SharedClient>) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let request = super_builder::GetActiveMcpAgentsRequest {};

    let response = client_ref
        .get_active_mcp_agents(request).await
        .map_err(|e| format!("Failed to get active MCP agent: {}", e))?;

    let reply = response.into_inner();
    // Return this string to the frontend
    Ok(serde_json::to_string(&reply.names).map_err(|e| format!("Failed to serialize: {}", e))?)
}

#[tauri::command]
pub async fn add_mcp_agent(
    client: State<'_, SharedClient>,
    agent_name: String,
    agent_desc: String,
    agent_message: String,
    server_ids: Vec<i32>
) -> Result<super_builder::AddMcpAgentResponse, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let agent = super_builder::McpAgent {
        id: 0, // Set to 0 for new agents, the backend will assign the actual ID
        name: agent_name,
        desc: agent_desc,
        message: agent_message,
        server_ids,
    };

    let request = super_builder::AddMcpAgentRequest {
        agent: Some(agent),
    };

    let response = client_ref
        .add_mcp_agent(request).await
        .map_err(|e| format!("Failed to add MCP agent: {}", e))?;

    let reply = response.into_inner();
    Ok(reply)
}

#[tauri::command]
pub async fn edit_mcp_agent(
    client: State<'_, SharedClient>,
    agent_id: i32,
    agent_name: String,
    agent_desc: String,
    agent_message: String,
    server_ids: Vec<i32>
) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let agent = super_builder::McpAgent {
        id: agent_id,
        name: agent_name,
        desc: agent_desc,
        message: agent_message,
        server_ids,
    };

    let request = super_builder::EditMcpAgentRequest {
        agent: Some(agent),
    };

    let response = client_ref
        .edit_mcp_agent(request).await
        .map_err(|e| format!("Failed to edit MCP agent: {}", e))?;

    let reply = response.into_inner();
    if reply.success {
        Ok(reply.message) // Return success message
    } else {
        Err(reply.message) // Return error message
    }
}

#[tauri::command]
pub async fn remove_mcp_agent(
    client: State<'_, SharedClient>,
    agent_name: String
) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let request = super_builder::RemoveMcpAgentRequest {
        agent_name,
    };

    let response = client_ref
        .remove_mcp_agent(request).await
        .map_err(|e| format!("Failed to remove MCP agent: {}", e))?;

    let reply = response.into_inner();
    if reply.success {
        Ok(reply.message) // Return success message
    } else {
        Err(reply.message) // Return error message
    }
}

#[tauri::command]
pub async fn start_mcp_agent(
    client: State<'_, SharedClient>,
    agent_name: String
) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let request = super_builder::StartMcpAgentRequest {
        agent_name,
    };

    let response = client_ref
        .start_mcp_agent(request).await
        .map_err(|e| format!("Failed to start MCP agent: {}", e))?;

    let reply = response.into_inner();
    if reply.success {
        Ok(reply.message) // Return success message
    } else {
        Err(reply.message) // Return error message
    }
}

#[tauri::command]
pub async fn stop_mcp_agent(
    client: State<'_, SharedClient>,
    agent_name: String
) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let request = super_builder::StopMcpAgentRequest {
        agent_name,
    };

    let response = client_ref
        .stop_mcp_agent(request).await
        .map_err(|e| format!("Failed to stop MCP agent: {}", e))?;

    let reply = response.into_inner();
    if reply.success {
        Ok(reply.message) // Return success message
    } else {
        Err(reply.message) // Return error message
    }
}

#[tauri::command]
pub async fn get_mcp_servers(client: State<'_, SharedClient>) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let request = super_builder::GetMcpServersRequest {};

    let response = client_ref
        .get_mcp_servers(request).await
        .map_err(|e| format!("Failed to get MCP servers: {}", e))?;

    let reply = response.into_inner();
    let json_string = serde_json
        ::to_string(&reply.servers)
        .map_err(|e| format!("Failed to serialize: {}", e))?;
    // Return this string to the frontend
    Ok(json_string)
}

#[tauri::command]
pub async fn add_mcp_server(
    client: State<'_, SharedClient>,
    server_name: String,
    command: String,
    args: String,
    url: String,
    env: String
) -> Result<super_builder::AddMcpServerResponse, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let server = super_builder::McpServer {
        id: 0, // Set to 0 for new servers, the backend will assign the actual ID
        server_name,
        command,
        args,
        url,
        env,
    };

    let request = super_builder::AddMcpServerRequest {
        server: Some(server),
    };

    let response = client_ref
        .add_mcp_server(request).await
        .map_err(|e| format!("Failed to add MCP servers: {}", e))?;

    let reply = response.into_inner();
    Ok(reply)
}

#[tauri::command]
pub async fn edit_mcp_server(
    client: State<'_, SharedClient>,
    id: i32, // int32 required for GRPC
    server_name: String,
    command: String,
    args: String,
    url: String,
    env: String
) -> Result<super_builder::EditMcpServerResponse, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let server = super_builder::McpServer {
        id,
        server_name,
        command,
        args,
        url,
        env,
    };

    let request = super_builder::EditMcpServerRequest {
        server: Some(server),
    };

    let response = client_ref
        .edit_mcp_server(request).await
        .map_err(|e| format!("Failed to edit MCP servers: {}", e))?;

    let reply = response.into_inner();
    Ok(reply)
}

#[tauri::command]
pub async fn remove_mcp_server(
    client: State<'_, SharedClient>,
    server_name: String
) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let request = super_builder::RemoveMcpServerRequest {
        server_name,
    };

    let response = client_ref
        .remove_mcp_server(request).await
        .map_err(|e| format!("Failed to remove MCP servers: {}", e))?;

    let reply = response.into_inner();
    if reply.success {
        Ok(reply.message) // Return success message
    } else {
        Err(reply.message) // Return error message
    }
}

#[tauri::command]
pub async fn start_mcp_server(
    client: State<'_, SharedClient>,
    server_name: String
) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let request = super_builder::StartMcpServerRequest {
        server_name,
    };

    let response = client_ref
        .start_mcp_server(request).await
        .map_err(|e| format!("Failed to load MCP server: {}", e))?;

    let reply = response.into_inner();

    if reply.success {
        Ok(reply.message) // Return success message
    } else {
        Err(reply.message) // Return error message
    }
}

#[tauri::command]
pub async fn stop_mcp_server(
    client: State<'_, SharedClient>,
    server_name: String
) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let request = super_builder::StopMcpServerRequest {
        server_name, // This should be a JSON string of server names
    };

    let response = client_ref
        .stop_mcp_server(request).await
        .map_err(|e| format!("Failed to stop MCP servers: {}", e))?;

    let reply = response.into_inner();
    if reply.success {
        Ok(reply.message) // Return success message
    } else {
        Err(reply.message) // Return error message
    }
}

#[tauri::command]
pub async fn get_active_mcp_servers(client: State<'_, SharedClient>) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let request = super_builder::GetActiveMcpServersRequest {};

    let response = client_ref
        .get_active_mcp_servers(request).await
        .map_err(|e| format!("Failed to get active MCP server: {}", e))?;

    let reply = response.into_inner();
    // Return this string to the frontend
    Ok(serde_json::to_string(&reply.names).map_err(|e| format!("Failed to serialize: {}", e))?)
}

#[tauri::command]
pub async fn get_mcp_server_tools(
    client: State<'_, SharedClient>,
    server_name: String
) -> Result<String, String> {
    let mut client_guard = client.lock().await;
    let client_ref = client_guard.as_mut().ok_or("Client not initialized")?;

    let request = super_builder::GetMcpServerToolsRequest {
        server_name,
    };

    let response = client_ref
        .get_mcp_server_tools(request).await
        .map_err(|e| format!("Failed to get MCP server tools: {}", e))?;

    let reply = response.into_inner();
    // Return this string to the frontend
    if reply.success {
        Ok(reply.message) // Return success message
    } else {
        Err(reply.message) // Return error message
    }
}
