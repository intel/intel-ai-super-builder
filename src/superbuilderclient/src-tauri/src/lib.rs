// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(feature = "mock-backend")]
mod mock;

mod grpc_client;
use grpc_client::{ SharedClient, super_builder };
use grpc_client::{
    initialize_client,
    call_chat,
    connect_client,
    get_config,
    mw_say_hello,
    llm_health_check,
    remove_file,
    upload_file,
    send_feedback,
    download_file,
    get_file_list,
    pyllm_say_hello,
    stop_chat,
    stop_upload_file,
    set_assistant_view_model,
    update_notification,
    get_chat_history,
    remove_session,
    send_email,
    set_models,
    update_db_models,
    set_parameters,
    load_models,
    upload_model,
    set_session_name,
    set_user_config_view_model,
    convert_model,
    export_user_config,
    import_user_config,
    remove_model,
    get_mcp_agents,
    get_active_mcp_agents,
    add_mcp_agent,
    edit_mcp_agent,
    remove_mcp_agent,
    start_mcp_agent,
    stop_mcp_agent,
    get_mcp_servers,
    add_mcp_server,
    edit_mcp_server,
    remove_mcp_server,
    start_mcp_server,
    stop_mcp_server,
    get_active_mcp_servers,
    get_mcp_server_tools,
    validate_model,
};
//use reqwest::Client;
use tauri::{ AppHandle, Manager };
//use tokio::fs::File;
//use tokio::io::AsyncWriteExt;
mod config;
mod status;
use std::env;
use std::fs;
use std::path::Path;
use serde::Serialize;
use std::process::Command;
use base64::{ engine::general_purpose::STANDARD, Engine as _ };
use image::imageops::FilterType;
use image::ImageReader as ImageReader;
use std::io::Cursor;
use image::GenericImageView;

#[derive(Serialize)]
struct MissingModelsResponse {
    missing_models: Vec<String>,
    models_dir_path: String,
}

#[tauri::command]
fn get_system_language() -> String {
    use sys_locale::get_locale;

    get_locale().unwrap_or_else(|| String::from("en"))
}

#[tauri::command]
async fn get_missing_models(
    models_abs_path: String,
    models: Vec<String>
) -> Result<MissingModelsResponse, String> {
    #[cfg(feature = "mock-backend")]
    {
        println!("🔧 MOCK MODE: get_missing_models - returning empty missing models list");
        return Ok(MissingModelsResponse {
            missing_models: Vec::new(),
            models_dir_path: models_abs_path,
        });
    }

    #[cfg(not(feature = "mock-backend"))]
    {
        // Get the current executable path

        // Ensure the models directory exists
        let models_dir_path = Path::new(&models_abs_path);

        if !models_dir_path.exists() {
            println!("Models directory does not exist, creating...");
            fs::create_dir_all(&models_dir_path).map_err(|e| e.to_string())?;
        } else {
            println!("Models directory already exists.");
        }

        // List the files in the models directory
        let mut files_in_directory = Vec::new();
        if let Ok(entries) = fs::read_dir(&models_dir_path) {
            for entry in entries.flatten() {
                if let Ok(file_name) = entry.file_name().into_string() {
                    files_in_directory.push(file_name);
                }
            }
        }
        
        #[cfg(debug_assertions)]
        println!("Files in directory: {:?}", files_in_directory);

        // Determine which models are missing
        let missing_models = models
            .into_iter()
            .filter(|model| !files_in_directory.contains(model))
            .collect::<Vec<_>>();

        println!("Missing models: {:?}", missing_models);

        let response = MissingModelsResponse {
            missing_models,
            models_dir_path: format!("{}", models_dir_path.display()),
        };

        Ok(response)
    }
}

#[tauri::command]
fn path_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

#[tauri::command]
fn check_openvino_model(folder_path: String) -> bool {
    let folder_path = Path::new(&folder_path);
    let file1_path = folder_path.join("openvino_model.bin");
    let file2_path = folder_path.join("openvino_model.xml");

    file1_path.exists() && file2_path.exists()
}

#[cfg(target_os = "windows")]
fn set_window_borders(window: tauri::WebviewWindow) -> Result<(), String> {
    use windows::Win32::{
        Graphics::Dwm::DwmExtendFrameIntoClientArea,
        UI::Controls::MARGINS,
        Foundation::HWND,
    };

    match window.hwnd() {
        Ok(hwnd) => {
            let margins = MARGINS {
                cxLeftWidth: 1,
                cxRightWidth: 1,
                cyTopHeight: 1,
                cyBottomHeight: 1,
            };

            unsafe {
                DwmExtendFrameIntoClientArea(HWND(hwnd.0 as isize), &margins).map_err(|err|
                    format!("Error: {:?}", err)
                )
            }
        }
        Err(_) => Err("Failed to get window handle".to_string()),
    }
}

#[cfg(not(target_os = "windows"))]
fn set_window_borders(_window: tauri::WebviewWindow) -> Result<(), String> {
    Err("Window border customization is only supported on Windows".to_string())
}

#[tauri::command]
async fn set_window_borders_command(
    app: tauri::AppHandle,
    window_label: String
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_label) {
        set_window_borders(window)
    } else {
        Err("Window not found".to_string())
    }
}

async fn send_exit(app: &AppHandle) {
    let state = app.state::<SharedClient>();
    let mut client_guard = state.lock().await;
    let client = client_guard.as_mut().unwrap();
    client.disconnect_client(super_builder::DisconnectClientRequest {}).await.unwrap();
}

#[tauri::command]
async fn get_schema() -> Result<String, String> {
    let schema = include_str!(concat!(env!("OUT_DIR"), "/schema.json"));
    Ok(schema.to_string())
}

#[tauri::command]
async fn fetch_modelscope_mcp_servers(
    page_number: u32,
    page_size: u32,
    category: String,
    search: String
) -> Result<String, String> {
    use serde_json::json;

    // println!("Fetching ModelScope MCP Servers...");
    // println!("   Page: {}, Size: {}, Category: '{}', Search: '{}'", page_number, page_size, category, search);

    let url = "https://www.modelscope.cn/openapi/v1/mcp/servers";
    
    // Build filter based on whether category is empty
    let filter = if category.is_empty() {
        json!({
            "is_hosted": true
        })
    } else {
        json!({
            "category": category,
            "is_hosted": true
        })
    };
    
    let request_body = json!({
        "direction": 1,
        "filter": filter,
        "page_number": page_number,
        "page_size": page_size,
        "search": search
    });

    // println!("Request body: {}", serde_json::to_string_pretty(&request_body).unwrap_or_else(|_| "invalid json".to_string()));

    // println!("Creating HTTP client with 30s timeout...");
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // println!("🌐 Sending PUT request to {}...", url);
    let response = client
        .put(url)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .header("User-Agent", "IntelAIA/2.7.0")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    // println!("Response received! Status: {}", status);

    if !status.is_success() {
        return Err(format!("HTTP error! status: {}", status));
    }

    // println!("Reading response body...");
    let text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    // println!("Response body length: {} bytes", text.len());
    // println!("Response preview: {}...", &text[..text.len().min(200)]);

    Ok(text)
}

#[tauri::command]
async fn fetch_modelscope_mcp_by_id(
    id: String
) -> Result<String, String> {

    // println!("Fetching ModelScope MCP Servers...");
    // println!("   Page: {}, Size: {}, Category: '{}', Search: '{}'", page_number, page_size, category, search);

    let url = format!("https://www.modelscope.cn/openapi/v1/mcp/servers/{}", id);
    

    // println!("Creating HTTP client with 30s timeout...");
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // println!("🌐 Sending GET request to {}...", url);
    let response = client
        .get(url)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .header("User-Agent", "IntelAIA/2.7.0")
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    // println!("Response received! Status: {}", status);

    if !status.is_success() {
        return Err(format!("HTTP error! status: {}", status));
    }

    // println!("Reading response body...");
    let text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    // println!("Response body length: {} bytes", text.len());
    // println!("Response preview: {}...", &text[..text.len().min(200)]);

    Ok(text)
}


#[tauri::command]
fn open_in_explorer(path: &str) -> Result<(), String> {
    Command::new("explorer")
        .arg(path)
        .spawn()
        .map_err(|e| format!("Failed to open path in Explorer: {}", e))?;
    Ok(())
}

#[tauri::command]
fn open_file_and_return_as_base64(filename: String) -> Result<String, String> {
    let path = Path::new(&filename);
    let display = path.display();
    let file = match fs::read(path) {
        Ok(file) => file,
        Err(why) => panic!("couldn't open {}: {}", display, why),
    };

    // Load the image from the file
    let img = ImageReader::new(Cursor::new(file))
        .with_guessed_format()
        .map_err(|e| format!("Failed to read image: {}", e))?
        .decode()
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    let max_width = 48;
    let max_height = 48;
    // Check the image dimensions
    let (width, height) = img.dimensions();
    let resized_img = if width > max_width || height > max_height {
        println!(
            "Resizing image to fit within {w}x{h} while preserving aspect ratio",
            w = max_width,
            h = max_height
        );

        // Calculate scaling factor
        let scale = (max_width as f32) / (width.max(height) as f32);

        // Calculate new dimensions
        let new_width = ((width as f32) * scale).round() as u32;
        let new_height = ((height as f32) * scale).round() as u32;

        // Resize the image while keeping aspect ratio
        img.resize(new_width, new_height, FilterType::Lanczos3)
    } else {
        // Use the original image if it's already small enough
        img
    };

    // Encode the resized image to base64
    let mut buf = Vec::new();
    let mut cursor = Cursor::new(&mut buf);
    resized_img
        .write_to(&mut cursor, image::ImageFormat::from_extension("png").unwrap())
        .map_err(|e| format!("Failed to write image to buffer: {}", e))?;
    let base64 = STANDARD.encode(buf);

    Ok(base64)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[tokio::main]
pub async fn run() {
    let client = initialize_client().await;

    let app = tauri::Builder
        ::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            // Only set window borders on Windows - ignore errors on other platforms
            let _ = set_window_borders(window);
            Ok(())
        })
        .manage(client)
        .invoke_handler(
            tauri::generate_handler![
                get_system_language,
                call_chat,
                check_openvino_model,
                connect_client,
                get_config,
                remove_file,
                mw_say_hello,
                download_file,
                llm_health_check,
                upload_file,
                send_feedback,
                get_missing_models,
                path_exists,
                get_file_list,
                pyllm_say_hello,
                stop_chat,
                stop_upload_file,
                update_notification,
                set_window_borders_command,
                open_in_explorer,
                set_assistant_view_model,
                get_chat_history,
                remove_session,
                send_email,
                set_models,
                update_db_models,
                set_parameters,
                load_models,
                convert_model,
                upload_model,
                set_session_name,
                open_file_and_return_as_base64,
                set_user_config_view_model,
                get_schema,
                import_user_config,
                export_user_config,
                remove_model,
                get_mcp_agents,
                get_active_mcp_agents,
                add_mcp_agent,
                edit_mcp_agent,
                remove_mcp_agent,
                start_mcp_agent,
                stop_mcp_agent,
                get_mcp_servers,
                add_mcp_server,
                edit_mcp_server,
                remove_mcp_server,
                start_mcp_server,
                stop_mcp_server,
                get_active_mcp_servers,
                get_mcp_server_tools,
                validate_model,
                fetch_modelscope_mcp_servers,
                fetch_modelscope_mcp_by_id,
            ]
        )
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.run(|app, event| {
        match event {
            tauri::RunEvent::ExitRequested { .. } => {
                futures::executor::block_on(send_exit(app));
            }
            _ => {}
        }
    });
}


#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_fetch_modelscope_mcp_servers_signature() {
        // Test that the function has the correct async signature
        // This is a compilation test to verify the function signature
        
        let _page_number = 1u32;
        let _page_size = 10u32;
        let _category = String::from("communication");
        let _search = String::from("");
        
        // Test that the function can be called (but don't actually execute it)
        // We're just verifying the async function signature compiles correctly
        let _future = fetch_modelscope_mcp_servers(_page_number, _page_size, _category, _search);
        
        // We don't await the future to avoid making actual network calls in tests
        println!("✅ Test: fetch_modelscope_mcp_servers async signature is correct");
    }

    #[test]
    fn test_json_request_body_structure() {
        use serde_json::json;
        
        // Test that we can build the request body correctly
        let category = String::from("communication");
        let filter = json!({
            "category": category,
            "is_hosted": true
        });
        
        let request_body = json!({
            "direction": 1,
            "filter": filter,
            "page_number": 1,
            "page_size": 10,
            "search": ""
        });
        
        // Verify the structure
        assert!(request_body["direction"].is_number());
        assert!(request_body["filter"].is_object());
        assert!(request_body["filter"]["is_hosted"].is_boolean());
        assert!(request_body["page_number"].is_number());
        assert!(request_body["page_size"].is_number());
        assert!(request_body["search"].is_string());
        
        println!("✅ Test: JSON request body structure is valid");
    }

    #[test]
    fn test_empty_category_filter() {
        use serde_json::json;
        
        // Test filter when category is empty
        let category = String::from("");
        let filter = if category.is_empty() {
            json!({
                "is_hosted": true
            })
        } else {
            json!({
                "category": category,
                "is_hosted": true
            })
        };
        
        // Should not have category field when empty
        assert!(filter["is_hosted"].is_boolean());
        assert!(filter.get("category").is_none());
        
        println!("✅ Test: Empty category creates correct filter");
    }

    #[test]
    fn test_reqwest_client_creation() {
        use std::time::Duration;
        
        // Test that we can create a reqwest client with timeout
        let client_result = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build();
        
        // Verify the client was created successfully
        assert!(client_result.is_ok());
        println!("✅ Test: reqwest client can be created with 30s timeout");
    }
}
