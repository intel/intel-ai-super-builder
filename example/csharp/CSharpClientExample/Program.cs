using CSharpClientExample;
using Google.Protobuf.Collections;
using Grpc.Core;
using Grpc.Net.Client;
using SuperBuilderWinService;
using Newtonsoft.Json;

var grpcServerAddress = "http://localhost:5006";

Console.WriteLine("Creating connection to SuperBuilder middleware (AssistantService)...");


var httpClientHandler = new HttpClientHandler
{
    UseProxy = false, // Disable the proxy
    SslProtocols = System.Security.Authentication.SslProtocols.Tls12 | System.Security.Authentication.SslProtocols.Tls13,
    ServerCertificateCustomValidationCallback = HttpClientHandler.DangerousAcceptAnyServerCertificateValidator // For development only
};

// Create the HttpClient with the handler
var httpClient = new HttpClient(httpClientHandler)
{
    DefaultRequestVersion = new Version(2, 0),
    DefaultVersionPolicy = HttpVersionPolicy.RequestVersionOrHigher
};

// Create the GrpcChannel with the HttpClient
var channel = GrpcChannel.ForAddress(grpcServerAddress, new GrpcChannelOptions
{
    HttpClient = httpClient,
    Credentials = ChannelCredentials.Insecure // Use Insecure for local development
});



//using var channel = GrpcChannel.ForAddress("http://localhost:5006");
var client = new SuperBuilder.SuperBuilderClient(channel);

Console.WriteLine("\n\n-------- Say Hello -------");

// Make a gRPC call
try
{
    var sayHelloResponse = await client.SayHelloAsync(new SayHelloRequest { Name = "SuperBuilder C# Client!" });
    Console.WriteLine("Server Reply: " + sayHelloResponse.Message);
}
catch (RpcException e)
{
    Console.WriteLine($"gRPC error: {e.Status.Detail}");
}
catch (HttpRequestException e)
{
    Console.WriteLine($"HTTP request error: {e.Message}");
}


Console.WriteLine("\n\n-------- Get Software Update ------- ");
var updateResponse = await client.GetSoftwareUpdateAsync(new SayHelloRequest { Name = "SuperBuilder C# Client!" });
Console.WriteLine("Server Reply: " + updateResponse.Message);

Console.WriteLine("\n\n-------- Health Check -------");
var checkHealthResponse = await client.CheckHealthAsync(new CheckHealthRequest { TypeOfCheck = "RAG" });
Console.WriteLine("\nServer Reply: " + checkHealthResponse.Status);



// CHAT TEST
Console.WriteLine("\n\n-------- Chat -------");
var chatRequest = new ChatRequest
{
    Name = "SuperBuilder C# Client!",
    Prompt = "What were we just talking about?",
};
// add in some chat history
chatRequest.History.Add(new ConversationHistory { Role = "user", Content = "Tell me a bit about yourself" });
chatRequest.History.Add(new ConversationHistory { Role = "assistant", Content = "I am an Intel AI Assistant, a chatbot developed by Intel. I can help you with various tasks provided context." });
var fullResponse = "";
try
{
    // // Set a timeout of 10 seconds (For testing)
    // var callOptions = new CallOptions(deadline: DateTime.UtcNow.AddSeconds(5));
    var r = client.Chat(chatRequest);
    await foreach (var response in r.ResponseStream.ReadAllAsync())
    {
        Console.WriteLine("Response chunk: " + response.Message);
        fullResponse += response.Message;
    }
}
catch (Exception ex)
{
    Console.WriteLine($"Unexpected error: {ex.Message}");
    Console.WriteLine($"Sending stop generation now...");
    var stopRequest = new StopChatRequest { };
    var stopResponse = client.StopChat(stopRequest);
    Console.WriteLine($"Generation stopped");
}
finally
{
    Console.WriteLine($"Full response: {fullResponse}");
}


//Chat with RAG
Console.WriteLine("\n\n-------- Chat with RAG (Attached Files) -------");

// Step 1: Upload file to knowledge base first, you can also add files by our APP UI.
// Skip this step if the file has already been added to knowledge base!
var readmePath = @"C:\Users\labuser\Desktop\intel_aia\README.md"; //update this path with the file you want to upload
Console.WriteLine($"Uploading README file: {readmePath}");

// Verify file exists before uploading
if (!File.Exists(readmePath))
{
    Console.WriteLine($"ERROR: File does not exist at: {readmePath}");
    Console.WriteLine($"Current directory: {Directory.GetCurrentDirectory()}");
    Console.WriteLine($"Base directory: {AppContext.BaseDirectory}");
}
else
{
    Console.WriteLine($"File verified: {readmePath}");

    var addFilesRequest = new AddFilesRequest
    {
        FilesToUpload = $"[\"{readmePath.Replace("\\", "\\\\")}\"]"
    };

    try
    {
        Console.WriteLine("Starting file upload...");
        var uploadStream = client.AddFiles(addFilesRequest);
        await foreach (var uploadResponse in uploadStream.ResponseStream.ReadAllAsync())
        {
            if (!string.IsNullOrEmpty(uploadResponse.CurrentFileUploading))
            {
                Console.WriteLine($"Uploading: {uploadResponse.CurrentFileUploading} - {uploadResponse.CurrentFileProgress}%");
            }
            if (!string.IsNullOrEmpty(uploadResponse.FilesUploaded))
            {
                Console.WriteLine($"Files uploaded: {uploadResponse.FilesUploaded}");
            }
        }
        Console.WriteLine("File upload complete!");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Upload error: {ex.Message}");
    }

    // Step 2: Chat with the uploaded file
    var ragChatRequest = new ChatRequest
    {
        Name = "SuperBuilder C# Client!",
        Prompt = "What is superbuilder?",
        AttachedFiles = $"[\"{readmePath.Replace("\\", "\\\\")}\"]" // Query the uploaded file
    };

    var ragFullResponse = "";
    try
    {
        var r = client.Chat(ragChatRequest);
        await foreach (var response in r.ResponseStream.ReadAllAsync())
        {
            Console.WriteLine("Response chunk: " + response.Message);
            ragFullResponse += response.Message;
        
            // Print references if available
            if (response.References.Count > 0)
            {
                Console.WriteLine("\nReferences:");
                foreach (var reference in response.References)
                {
                    Console.WriteLine($"  - File: {reference.File}");
                    if (reference.HasPage)
                    {
                        Console.WriteLine($"    Page: {reference.Page}");
                    }
                    if (!string.IsNullOrEmpty(reference.Sheet))
                    {
                        Console.WriteLine($"    Sheet: {reference.Sheet}");
                    }
                }
            }
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Unexpected error: {ex.Message}");
        Console.WriteLine($"Sending stop generation now...");
        var stopRequest = new StopChatRequest { };
        var stopResponse = client.StopChat(stopRequest);
        Console.WriteLine($"Generation stopped");
    }
    finally
    {
        Console.WriteLine($"\nFull RAG response: {ragFullResponse}");
    }
}



Console.WriteLine("\n\n-------- Get All MCP Servers -------");
var getRequest = new GetMCPServersRequest();

try
{
    var getResponse = await client.GetMCPServersAsync(getRequest);

    Console.WriteLine("\n=== GetMCPServers Response ===");
    foreach (var srv in getResponse.Servers)
    {
        Console.WriteLine($"ID: {srv.Id}");
        Console.WriteLine($"Name: {srv.ServerName}");
        Console.WriteLine($"Command: {srv.Command}");
        Console.WriteLine($"Args: {srv.Args}");
        Console.WriteLine($"Url: {srv.Url}");
        Console.WriteLine($"Env: {srv.Env}");
        Console.WriteLine("-----------------------------");
    }
}
catch (Exception ex)
{
    Console.WriteLine("GetMCPServers failed:");
    Console.WriteLine(ex);
}

Console.WriteLine("\n\n-------- Add an MCP Server -------");
var addRequest = new AddMCPServerRequest
{
    Server = new MCPServer
    {
        Id = 1,  // Server will assign its own ID if needed
        ServerName = "mcp-server-fetch",
        Command = "cmd",
        Args = "/c uvx mcp-server-fetch",
        Env = "" // NOTE: Add proxy if required
    }
};

try
{
    var addResponse = await client.AddMCPServerAsync(addRequest);

    Console.WriteLine("=== AddMCPServer Response ===");
    Console.WriteLine($"Success: {addResponse.Success}");
    Console.WriteLine($"Message: {addResponse.Message}");
}
catch (Exception ex)
{
    Console.WriteLine("AddMCPServer failed:");
    Console.WriteLine(ex);
}



Console.WriteLine("\n\n-------- Add an MCP Agent -------");
var addAgentRequest = new AddMCPAgentRequest
{
    Agent = new MCPAgent
    {
        Id = 1,                     // Server can assign if needed
        Name = "FetchAgent",
        Desc = "Fetch details of a webpage",
        Message = "Follow the users instructions",
        // Link the agent to the server(s) by ID
        ServerIds = { 1 }
    }
};

try
{
    var addAgentResponse = await client.AddMCPAgentAsync(addAgentRequest);

    Console.WriteLine("\n=== AddMCPAgent Response ===");
    Console.WriteLine($"Success: {addAgentResponse.Success}");
    Console.WriteLine($"Message: {addAgentResponse.Message}");
}
catch (Exception ex)
{
    Console.WriteLine("AddMCPAgent failed:");
    Console.WriteLine(ex);
}

Console.WriteLine("\n\n-------- Start an MCP Agent -------");
var startAgentRequest = new StartMCPAgentRequest
{
    AgentName = "FetchAgent"
};

try
{
    var startAgentResponse = await client.StartMCPAgentAsync(startAgentRequest);

    Console.WriteLine("\n=== StartMCPAgent Response ===");
    Console.WriteLine($"Success: {startAgentResponse.Success}");
    Console.WriteLine($"Message: {startAgentResponse.Message}");
}
catch (Exception ex)
{
    Console.WriteLine("StartMCPAgent failed:");
    Console.WriteLine(ex);
}

Console.WriteLine("\n\n-------- Chat with SuperAgent MCP -------");
var promptOptions = new PromptOptions
{
    SuperAgentPrompt = new PromptOptions.Types.SuperAgentPrompt()
};

// Build ChatRequest
var request = new ChatRequest
{
    Name = "client",
    Prompt = "What is this website about https://github.com/intel/intel-ai-assistant-builder",
    SessionId = 1,
    PromptOptions = promptOptions   // <-- REQUIRED
};

// Optionally add conversation history
request.History.Add(new ConversationHistory
{
    Role = "user",
    Content = "Hi there"
});

var fullChatResponse = "";
try
{
    var r = client.Chat(request);
    await foreach (var response in r.ResponseStream.ReadAllAsync())
    {
        Console.WriteLine("Response chunk: " + response.Message);
        fullChatResponse += response.Message;
    }
}
catch (Exception ex)
{
    Console.WriteLine($"Unexpected error: {ex.Message}");
    Console.WriteLine($"Sending stop generation now...");
    var stopRequest = new StopChatRequest { };
    var stopResponse = client.StopChat(stopRequest);
    Console.WriteLine($"Generation stopped");
}
finally
{
    Console.WriteLine($"Full response: {fullChatResponse}");
}
Console.WriteLine("\n=== Done ===");