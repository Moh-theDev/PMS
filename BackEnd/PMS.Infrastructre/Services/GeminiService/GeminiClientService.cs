using Microsoft.Extensions.Options;
using PMS.Application.DTO.AIDto;
using PMS.Domain.Entities;
using PMS.Infrastructre.AiSetting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace PMS.Infrastructre.Services.GeminiService
{
    public class GeminiClientService
    {
        private readonly string _apiKey;
        private readonly HttpClient _httpClient;
       private readonly string _model;
        // Direct injection via IOptions
        public GeminiClientService(HttpClient httpClient, IOptions<GeminiSettings> options)
        {
            _httpClient = httpClient;
            _apiKey = options.Value.ApiKey;
            _model = options.Value.Model ?? "gemini-2.5-flash";
        }

        public async Task<SchedulingEngineResult> GenerateMissingSchedulesAsync(List<TaskItem> tasks)
        {
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent?key={_apiKey}";
            string currentTimeString = DateTime.Now.ToString("yyyy-MM-dd HH:mm");
            string systemInstructions = $"You are a deterministic logic scheduler engine.\n" +
                $"CRITICAL TIME CONSTRAINTS:\n" +
                $"- The current real-world system date and time is EXACTLY: {currentTimeString}.\n" +
                $"- ANY newly generated task schedule MUST start from this current time ({currentTimeString}) or later. NEVER schedule any task in the past.\n" +
                $"- CRITICAL DEADLINE RULE: ONLY tasks that have BOTH 'EarliestStart' and 'LatestEnd' equal to null are considered unscheduled tasks.\n" +
                $"- If any unscheduled task has a 'Deadline' earlier than the current time ({currentTimeString}), you MUST immediately cancel the scheduling process.\n" +
                $"- Tasks that already contain 'EarliestStart' and 'LatestEnd' are already scheduled and MUST ignore this past-deadline validation.\n\n" +
                "You are a deterministic logic scheduler engine.\n" +
             "CRITICAL RULES:\n" +
           "1. Current system time is NOW. Never schedule tasks in the past.\n" +
            "2. Any generated schedule MUST start from the current real-world date/time or later.\n" +
            "3. If a task deadline is already in the past, treat it as impossible to schedule.\n" +

            "4. If a task ALREADY has 'EarliestStart' and 'LatestEnd' times populated, treat it as an unmovable block. Do not alter its time, and do not let other tasks overlap it.\n" +

            "5. If ALL tasks already have 'EarliestStart' and 'LatestEnd' populated, do not generate or modify any schedule. Return:\n" +
            "   {\"isSuccessful\": true, \"scheduledTasks\": null, \"conflictMessage\": \"All tasks already have scheduled time ranges.\"}\n" +

            "6. If a task has 'EarliestStart' and 'LatestEnd' set to null, you MUST compute a valid Start and End time execution window for it.\n" +

            "7. Every generated timeline block must strictly respect the task's Duration, Deadline, Priority constraints.\n" +

            "8. Prioritize tasks with higher Priority (10 is highest) and tighter deadlines.\n" +

            "9. If all missing tasks can be allocated without overlapping existing or newly scheduled blocks and all missing tasks can be allocated successfully without past deadlines or conflicts , return a JSON layout matching this schema:\n" +
            "   {\"isSuccessful\": true, \"scheduledTasks\": [{\"taskId\": 1, \"start\": \"yyyy-MM-dd HH:mm\", \"end\": \"yyyy-MM-dd HH:mm\"}], \"conflictMessage\": null}\n" +

           "10. If a physical timeline conflict makes scheduling impossible (e.g., overlapping static tasks or running out of hours before a deadline), OR if ANY UNSCHEDULED task (a task with null 'EarliestStart' and null 'LatestEnd') has a deadline before {currentTimeString}, DO NOT build the schedule. Return:\n" +
            "   {\"isSuccessful\": false, \"scheduledTasks\": null, \"conflictMessage\": \"Detailed explanation of why task X clashes with task Y\"}\n" +

            "11. Output raw JSON only. Do not wrap code inside markdown blocks.";

            // 2. Flatten the dynamic task details into text for the AI context payload
            var tasksPayload = tasks.Select(t => new
            {
                t.Id,
                t.Title,
                DurationMinutes = t.Duration.TotalMinutes,
                Deadline = t.Deadline.ToString("yyyy-MM-dd HH:mm"),
                EarliestStart = t.EarliestStart?.ToString("yyyy-MM-dd HH:mm"),
                LatestEnd = t.LatestEnd?.ToString("yyyy-MM-dd HH:mm"),
                t.Priority,
                t.EffortLevel,
                Status = t.Status.ToString(),
                //Start = t.Start?.ToString("yyyy-MM-dd HH:mm"), // Sent as string or null
                //End = t.End?.ToString("yyyy-MM-dd HH:mm")     // Sent as string or null
            }).ToList();

            var userPrompt = $"Analyze this exact dataset and schedule the missing entries:\n" +
                             JsonSerializer.Serialize(tasksPayload, new JsonSerializerOptions { WriteIndented = true });

            // 3. Setup standard request parameters
            var requestPayload = new
            {
                contents = new[] { new { parts = new[] { new { text = $"{systemInstructions}\n\nDataset:\n{userPrompt}" } } } },
                generationConfig = new { responseMimeType = "application/json" }
            };

            var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            var httpContent = new StringContent(JsonSerializer.Serialize(requestPayload, jsonOptions), Encoding.UTF8, "application/json");

            // 4. Send request to the endpoint
            var response = await _httpClient.PostAsync(url, httpContent);
            response.EnsureSuccessStatusCode();

            var jsonResponse = await response.Content.ReadAsStringAsync();

            // 5. Extract and parse the returned content payload safely
            using var doc = JsonDocument.Parse(jsonResponse);
            var rawAiText = doc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();

            var finalResult = JsonSerializer.Deserialize<SchedulingEngineResult>(rawAiText ?? "{}", jsonOptions);
            return finalResult ?? new SchedulingEngineResult { IsSuccessful = false, ConflictMessage = "Failed to evaluate schedule rules." };
        }
    }
}
