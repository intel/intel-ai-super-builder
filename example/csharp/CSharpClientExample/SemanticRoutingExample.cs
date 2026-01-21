using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace CSharpClientExample
{
    /// <summary>
    /// Semantic Routing Sample Code
    /// 
    /// Requirements:
    /// - .NET 8.0
    /// - System.Text.Json (included in .NET)
    /// - HttpClient (included in .NET)
    /// </summary>
    /// 
    public class EmbeddingModel
    {
        private readonly string _modelName;
        private readonly string _baseUrl;
        private readonly HttpClient _httpClient;

        public EmbeddingModel(
            string modelName = "C:/ProgramData/IntelAIA/local_models/bge-base-en-v1.5-int8-ov",
            string baseUrl = "http://localhost:8101/v3/embeddings")
        {
            _modelName = modelName;
            _baseUrl = baseUrl;
            _httpClient = new HttpClient();
        }

        public async Task<List<double[]>> EncodeAsync(List<string> texts)
        {
            var requestBody = new
            {
                input = texts,
                model = _modelName
            };

            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(_baseUrl, content);
            response.EnsureSuccessStatusCode();

            var responseContent = await response.Content.ReadAsStringAsync();
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };
            var result = JsonSerializer.Deserialize<EmbeddingResponse>(responseContent, options);

            if (result?.Data == null || result.Data.Count == 0)
            {
                throw new InvalidOperationException($"Embedding API returned no data. Response: {responseContent}");
            }

            return result.Data.Select(d => d.Embedding).ToList();
        }

        public static double CosineSimilarity(double[] embedding1, double[] embedding2)
        {
            // Normalize embeddings
            var norm1 = Math.Sqrt(embedding1.Sum(x => x * x));
            var norm2 = Math.Sqrt(embedding2.Sum(x => x * x));

            var embedding1Norm = embedding1.Select(x => x / norm1).ToArray();
            var embedding2Norm = embedding2.Select(x => x / norm2).ToArray();

            // Calculate dot product
            var similarity = embedding1Norm.Zip(embedding2Norm, (a, b) => a * b).Sum();
            return similarity;
        }

        private class EmbeddingResponse
        {
            [JsonPropertyName("data")]
            public List<EmbeddingData> Data { get; set; } = new();
        }

        private class EmbeddingData
        {
            [JsonPropertyName("embedding")]
            public double[] Embedding { get; set; } = Array.Empty<double>();
        }
    }

    public class TestCase
    {
        public string Query { get; set; } = string.Empty;
        public string ExpectedRoute { get; set; } = string.Empty;

        public TestCase(string query, string expectedRoute)
        {
            Query = query;
            ExpectedRoute = expectedRoute;
        }
    }

    public class Route
    {
        public string Name { get; }
        public List<string> Examples { get; }
        private readonly EmbeddingModel _embeddingModel;
        private List<double[]> _exampleEmbeddings = new();

        public Route(string name, List<string> examples, EmbeddingModel embeddingModel)
        {
            Name = name;
            Examples = examples;
            _embeddingModel = embeddingModel;
        }

        public async Task InitializeAsync()
        {
            _exampleEmbeddings = await _embeddingModel.EncodeAsync(Examples);
        }

        public double Score(double[] queryEmbedding)
        {
            if (_exampleEmbeddings.Count == 0)
                return 0.0;

            var similarities = _exampleEmbeddings
                .Select(exampleEmb => EmbeddingModel.CosineSimilarity(queryEmbedding, exampleEmb))
                .ToList();

            return similarities.Max();
        }
    }

    public class SemanticRouter
    {
        private readonly EmbeddingModel _embeddingModel;
        private readonly List<Route> _routes = new();
        private readonly double _threshold;

        public SemanticRouter(EmbeddingModel embeddingModel, double threshold = 0.5)
        {
            _embeddingModel = embeddingModel;
            _threshold = threshold;
        }

        public async Task<Route> AddRouteAsync(string name, List<string> examples)
        {
            var route = new Route(name, examples, _embeddingModel);
            await route.InitializeAsync();
            _routes.Add(route);
            return route;
        }

        public async Task<(string RouteName, double Score)> RouteAsync(string query)
        {
            // Encode the query
            var queryEmbeddings = await _embeddingModel.EncodeAsync(new List<string> { query });
            
            if (queryEmbeddings.Count == 0)
            {
                throw new InvalidOperationException("Failed to generate embedding for query");
            }
            
            var queryEmbedding = queryEmbeddings[0];

            // Find best matching route
            Route? bestRoute = null;
            double bestScore = 0.0;

            foreach (var route in _routes)
            {
                var score = route.Score(queryEmbedding);
                if (score > bestScore)
                {
                    bestScore = score;
                    bestRoute = route;
                }
            }

            if (bestRoute != null && bestScore >= _threshold)
            {
                return (bestRoute.Name, bestScore);
            }
            else
            {
                return ("default", bestScore);
            }
        }
    }

    public class ThresholdAnalyzer
    {
        private readonly EmbeddingModel _embeddingModel;
        private readonly List<(string Name, List<string> Examples)> _routesConfig;

        public ThresholdAnalyzer(
            EmbeddingModel embeddingModel,
            List<(string, List<string>)> routesConfig)
        {
            _embeddingModel = embeddingModel;
            _routesConfig = routesConfig;
        }

        public async Task<Dictionary<string, object>> EvaluateAsync(
            List<TestCase> testCases,
            double threshold)
        {
            // Create router with specified threshold
            var router = new SemanticRouter(_embeddingModel, threshold);

            Console.WriteLine($"\nEvaluating threshold {threshold:F2}...");
            foreach (var (name, examples) in _routesConfig)
            {
                await router.AddRouteAsync(name, examples);
            }

            // Evaluate
            int correct = 0;
            int routedToDefault = 0;
            var confusionMatrix = new Dictionary<(string, string), int>();
            var scores = new List<double>();

            foreach (var testCase in testCases)
            {
                var (predicted, score) = await router.RouteAsync(testCase.Query);
                var expected = testCase.ExpectedRoute;
                scores.Add(score);

                if (predicted == expected)
                    correct++;

                if (predicted == "default")
                    routedToDefault++;

                var key = (expected, predicted);
                confusionMatrix[key] = confusionMatrix.GetValueOrDefault(key, 0) + 1;
            }

            int total = testCases.Count;
            double accuracy = total > 0 ? (double)correct / total : 0;
            double defaultRate = total > 0 ? (double)routedToDefault / total : 0;
            double avgScore = scores.Count > 0 ? scores.Average() : 0;

            return new Dictionary<string, object>
            {
                ["threshold"] = threshold,
                ["accuracy"] = accuracy,
                ["correct"] = correct,
                ["total"] = total,
                ["default_rate"] = defaultRate,
                ["avg_score"] = avgScore,
                ["confusion_matrix"] = confusionMatrix
            };
        }

        public async Task<List<Dictionary<string, object>>> AnalyzeThresholdRangeAsync(
            List<TestCase> testCases,
            double start = 0.3,
            double end = 0.9,
            double step = 0.05)
        {
            var results = new List<Dictionary<string, object>>();
            double threshold = start;

            while (threshold <= end)
            {
                var result = await EvaluateAsync(testCases, Math.Round(threshold, 2));
                results.Add(result);
                threshold += step;
            }

            return results;
        }

        public async Task<(double OptimalThreshold, Dictionary<string, object> BestResult)>
            FindOptimalThresholdAsync(
                List<TestCase> testCases,
                string metric = "accuracy",
                double start = 0.3,
                double end = 0.9,
                double step = 0.05)
        {
            var results = await AnalyzeThresholdRangeAsync(testCases, start, end, step);

            double bestThreshold = 0.0;
            double bestScore = 0.0;
            Dictionary<string, object>? bestResult = null;

            foreach (var result in results)
            {
                var score = Convert.ToDouble(result[metric]);
                if (score > bestScore)
                {
                    bestScore = score;
                    bestThreshold = Convert.ToDouble(result["threshold"]);
                    bestResult = result;
                }
            }

            return (bestThreshold, bestResult ?? new Dictionary<string, object>());
        }
    }

    public static class SemanticRoutingExampleRunner
    {
        public static (List<(string, List<string>)> RoutesConfig, List<TestCase> TestCases)
            CreateExampleSystem()
        {
            // Define routes (name, examples)
            var routesConfig = new List<(string, List<string>)>
            {
                (
                    "get_mkt_name",
                    new List<string>
                    {
                        "What is the MKT name of this laptop?",
                        "Can you tell me the model name of this laptop?",
                        "What is this laptop model called?",
                        "I'd like to know the MKT name of this laptop.",
                        "Could you please provide the laptop's MKT name?"
                    }
                ),
                (
                    "get_hw_info",
                    new List<string>
                    {
                        "What are the hardware specifications of this laptop?",
                        "Check the hardware specifications of this laptop.",
                        "I'd like to know the specs of this laptop, especially the CPU, RAM, and storage.",
                        "Can you tell me the HW details of this laptop?",
                        "Could you provide information about the processor and memory of this laptop?"
                    }
                ),
                (
                    "get_speaker_device",
                    new List<string>
                    {
                        "Select audio output.",
                        "Change sound device.",
                        "Which audio device to use?",
                        "Choose playback device.",
                        "Change sound output."
                    }
                ),
                (
                    "open_live_caption",
                    new List<string>
                    {
                        "Turn on live captions.",
                        "Enable captions.",
                        "Activate live text.",
                        "Display what is being said.",
                        "Start displaying subtitles."
                    }
                ),
                (
                    "generic_question",
                    new List<string>
                    {
                        "How is the weather today?",
                        "What's the weather like?",
                        "Tell me a joke.",
                        "What's the meaning of life?",
                        "Who won the game last night?",
                        "What's the capital of France?",
                        "How do I cook pasta?"
                    }
                )
            };

            // Define test cases with expected routes
            var testCases = new List<TestCase>
            {
                new("What's the brand/model designation of this laptop?", "get_mkt_name"),
                new("Could you identify the MKT name for me?", "get_mkt_name"),
                new("What model of laptop is this?", "get_mkt_name"),
                new("Could you tell me what this laptop is called?", "get_mkt_name"),
                new("What's the brand/model designation of this laptop?", "get_mkt_name"),
                new("What are the technical specifications of this laptop?", "get_hw_info"),
                new("Can you show me the hardware specs for this laptop?", "get_hw_info"),
                new("Please check this laptop's hardware specifications", "get_hw_info"),
                new("I need to know this laptop's specs, particularly the CPU, RAM, and storage.?", "get_hw_info"),
                new("Choose audio output.", "get_speaker_device"),
                new("Select the audio device.", "get_speaker_device"),
                new("Switch audio output device.", "get_speaker_device"),
                new("Change audio output device.", "get_speaker_device"),
                new("Turn on captions.", "open_live_caption"),
                new("Enable live captions.", "open_live_caption"),
                new("Switch on live captions", "open_live_caption"),
                new("Activate captions.", "open_live_caption"),
                new("How is the weather?", "generic_question"),
                new("What's the weather forecast?", "generic_question"),
                new("Tell me something funny.", "generic_question"),
                new("What time is it?", "generic_question"),
                new("How do I make coffee?", "generic_question")
            };

            return (routesConfig, testCases);
        }

        public static void PrintRecommendations(double optimalThreshold, Dictionary<string, object> result)
        {
            Console.WriteLine("\n" + new string('=', 80));
            Console.WriteLine("RECOMMENDATIONS");
            Console.WriteLine(new string('=', 80));
            Console.WriteLine($"\nOptimal Threshold: {optimalThreshold:F2}");
            Console.WriteLine($"Expected Accuracy: {Convert.ToDouble(result["accuracy"]):P2}");
            Console.WriteLine($"Default Route Rate: {Convert.ToDouble(result["default_rate"]):P2}");
            Console.WriteLine($"Average Similarity Score: {Convert.ToDouble(result["avg_score"]):F3}");
        }

        public static async Task RunAsync()
        {
            Console.WriteLine("=== Semantic Routing Example ===\n");

            // Initialize embedding model
            var embeddingModel = new EmbeddingModel();

            // Create system
            var (routesConfig, testCases) = CreateExampleSystem();

            // ***********[START] this section is optional, only if you want to find optimal threshold for your use case
            // Create analyzer
            var analyzer = new ThresholdAnalyzer(embeddingModel, routesConfig);

            // Analyze threshold range
            double minThreshold = 0.3;
            double maxThreshold = 0.9;
            double step = 0.05;

            // Find optimal threshold
            var (optimalThreshold, bestResult) = await analyzer.FindOptimalThresholdAsync(
                testCases, "accuracy", minThreshold, maxThreshold, step);

            // Print recommendations
            PrintRecommendations(optimalThreshold, bestResult);
            // ***********this section is optional, only if you want to find optimal threshold for your use case [END]

            // Route with recommended threshold
            // Create router
            var router = new SemanticRouter(embeddingModel, optimalThreshold);
            foreach (var (routeName, examples) in routesConfig)
            {
                await router.AddRouteAsync(routeName, examples);
            }

            Console.WriteLine("\n\n=== Testing Routes ===");
            foreach (var testCase in testCases)
            {
                var query = testCase.Query;
                var (routeName, score) = await router.RouteAsync(query);
                Console.WriteLine($"\nQuery: {query}");
                Console.WriteLine($"Route: {routeName}");
                Console.WriteLine($"Score: {score}");
                Console.WriteLine(new string('-', 60));
            }

            var guidelines = @"Guidelines for threshold selection with embeddings:
• Low threshold (e.g., 0.3-0.5): More routing, captures semantic similarity
• Medium threshold (e.g., 0.5-0.7): Balanced precision and recall
• High threshold (e.g., 0.7-0.85): Conservative, high confidence matches only
• Very high threshold (e.g., 0.85+): Extremely strict

Usually embedding works well with thresholds of 0.5-0.7
But the optimal threshold depends on your data!";

            Console.WriteLine("\n" + new string('=', 80));
            Console.WriteLine(guidelines);
            Console.WriteLine(new string('=', 80) + "\n");

            Console.WriteLine("\n" + new string('=', 80));
            Console.WriteLine("TIP: Adjust test_cases to match your real use case for accurate tuning!");
            Console.WriteLine(new string('=', 80));
        }
    }
}
