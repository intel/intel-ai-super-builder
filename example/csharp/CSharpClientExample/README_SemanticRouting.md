# Semantic Routing Example - C#

This example demonstrates how to implement semantic routing using embeddings in C#. Semantic routing uses vector embeddings to intelligently route user queries to the appropriate handlers based on semantic similarity.

## Overview

The semantic routing system consists of:

1. **EmbeddingModel**: Connects to an OpenAI-compatible embedding API and calculates cosine similarity
2. **Route**: Represents a semantic route with example phrases
3. **SemanticRouter**: Routes queries to the best matching route based on semantic similarity
4. **ThresholdAnalyzer**: Analyzes routing performance across different similarity thresholds to find the optimal one

## Features

- **Async/Await Pattern**: All operations use modern async patterns for better performance
- **Threshold Optimization**: Automatically finds the optimal similarity threshold for your use case
- **Cosine Similarity**: Uses cosine similarity to compare query embeddings with route examples
- **Test Cases**: Includes comprehensive test cases for evaluation
- **Confusion Matrix**: Tracks routing accuracy and errors

## Requirements

- .NET 8.0
- Running embedding service at `http://localhost:8101` (or configure your own endpoint)
- Local embedding model at `C:/ProgramData/IntelAIA/local_models/bge-base-en-v1.5-int8-ov` (or configure your own)

## Usage

### Running the Example

The semantic routing example is integrated into the main Program.cs. Simply run the project:

```bash
dotnet run
```

Or use the existing Visual Studio solution.

### Using Semantic Routing in Your Code

```csharp
using CSharpClientExample;

// 1. Initialize the embedding model
var embeddingModel = new EmbeddingModel();

// 2. Create a router with a threshold (0.5 is a good starting point)
var router = new SemanticRouter(embeddingModel, threshold: 0.5);

// 3. Add routes with example phrases
await router.AddRouteAsync("get_hardware_info", new List<string>
{
    "What are the hardware specifications?",
    "Tell me about the CPU and RAM",
    "What processor does this have?"
});

await router.AddRouteAsync("get_model_name", new List<string>
{
    "What is the model name?",
    "What model is this laptop?",
    "Tell me the product name"
});

// 4. Route a query
var (routeName, score) = await router.RouteAsync("What CPU does this computer have?");
Console.WriteLine($"Route: {routeName}, Confidence: {score:F3}");

// 5. Handle the route
switch (routeName)
{
    case "get_hardware_info":
        // Handle hardware info request
        break;
    case "get_model_name":
        // Handle model name request
        break;
    case "default":
        // Handle unknown query
        break;
}
```

### Finding the Optimal Threshold

```csharp
// Create test cases for your domain
var testCases = new List<TestCase>
{
    new("What's the CPU?", "get_hardware_info"),
    new("Tell me the model", "get_model_name"),
    // ... more test cases
};

// Create analyzer
var analyzer = new ThresholdAnalyzer(embeddingModel, routesConfig);

// Find optimal threshold
var (optimalThreshold, bestResult) = await analyzer.FindOptimalThresholdAsync(
    testCases, 
    metric: "accuracy",
    start: 0.3, 
    end: 0.9, 
    step: 0.05
);

Console.WriteLine($"Optimal threshold: {optimalThreshold}");
Console.WriteLine($"Expected accuracy: {bestResult["accuracy"]}");
```

## How It Works

1. **Route Definition**: Each route is defined with a name and a list of example phrases that represent that intent
2. **Embedding Generation**: All example phrases are converted to vector embeddings
3. **Query Processing**: When a query comes in, it's converted to an embedding
4. **Similarity Matching**: The query embedding is compared to all example embeddings using cosine similarity
5. **Route Selection**: The route with the highest similarity score above the threshold is selected
6. **Threshold Handling**: If no route scores above the threshold, the query is routed to "default"

## Threshold Guidelines

- **Low (0.3-0.5)**: More aggressive routing, captures broader semantic similarity
- **Medium (0.5-0.7)**: Balanced approach, recommended starting point
- **High (0.7-0.85)**: Conservative, only routes high-confidence matches
- **Very High (0.85+)**: Extremely strict, may route most queries to default

**Note**: The optimal threshold depends on your specific use case and data. Use the ThresholdAnalyzer to find the best value for your application.

## Example Routes Included

The example includes four pre-configured routes for a laptop assistant:

1. **get_mkt_name**: Questions about the laptop model/brand name
2. **get_hw_info**: Questions about hardware specifications
3. **get_speaker_device**: Questions about audio output settings
4. **open_live_caption**: Questions about enabling captions

## Customization

### Using a Different Embedding Service

```csharp
var embeddingModel = new EmbeddingModel(
    modelName: "your-model-name",
    baseUrl: "http://your-server:port/v3/embeddings"
);
```

### Adding Custom Routes

```csharp
await router.AddRouteAsync("your_route_name", new List<string>
{
    "Example phrase 1",
    "Example phrase 2",
    "Example phrase 3"
});
```

### Adjusting Test Cases

Modify the test cases in `CreateExampleSystem()` to match your real-world queries for more accurate threshold tuning.

## Performance Considerations

- Embeddings are computed asynchronously for better performance
- Route example embeddings are pre-computed during initialization
- Each query requires one embedding API call
- Similarity calculations are fast (in-memory vector operations)

## Troubleshooting

**Error: "The remote server returned an error: (404) Not Found"**
- Make sure the embedding service is running at the configured URL
- Check that the base URL is correct

**Low Accuracy**
- Add more diverse example phrases to your routes
- Adjust the similarity threshold
- Review test cases to ensure they're representative of real queries

**All Queries Route to Default**
- Threshold may be too high, try lowering it
- Check that the embedding service is returning valid embeddings
- Ensure route examples are semantically diverse

## Related Files

- [SemanticRoutingExample.cs](SemanticRoutingExample.cs) - Full implementation
- [Program.cs](Program.cs) - Integration example
- [Python Version](../../python/examples/semantic_routing_examples.py) - Original Python implementation
