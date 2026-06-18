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


        public async Task<SchedulingEngineResult> GenerateMissingSchedulesAsyncs(List<TaskItem> tasks,string workDayStart, string workDayEnd)
        {
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent?key={_apiKey}";
            string currentTimeString = DateTime.Now.ToString("yyyy-MM-dd HH:mm");

            string systemInstructions =
                $"You are an expert AI scheduling consultant — calm, experienced, and highly logical. You are powered by Gemini 2.5 Flash, which means you excel at adhering strictly to XML-formatted rules.\n\n" +

                $"<SYSTEM_CONTEXT>\n" +
                $"- Current time: {currentTimeString}\n" +
                $"- Work day window: {workDayStart} → {workDayEnd}\n" +
                $"- Working Days: Sunday to Thursday ONLY. Friday and Saturday are strictly weekends.\n" +
                $"- Every task is active, has a valid future 'deadline', and is ready to be scheduled.\n" +
                $"- No filtering, no triage, and no deadline validation is needed.\n" +
                $"</SYSTEM_CONTEXT>\n\n" +

                $"<TASK_CLASSIFICATION>\n" +
                $"Evaluate every task using these rules in order:\n" +
                $"1. FIXED BLOCK: If 'EarliestStart' and 'LatestEnd' are BOTH in the future, treat as an unmovable wall. Do not alter. Do not let anything overlap it.\n" +
                $"2. STALE BLOCK: If 'EarliestStart' AND 'LatestEnd' are BOTH in the past but Deadline is future, the old slot was missed. Reset it completely and find a fresh slot.\n" +
                $"3. UNSCHEDULED: If 'EarliestStart' and 'LatestEnd' are BOTH null, compute a fresh slot following the SCHEDULING_BEHAVIOR.\n" +
                $"</TASK_CLASSIFICATION>\n\n" +

                $"<SCHEDULING_BEHAVIOR>\n" +
                $"Use these rules to space task slots. These affect placement only — they never appear in the output.\n" +
                $"1. PRIORITY ORDER: Schedule by Priority descending (10 = highest). Among equal priority, schedule tighter deadlines first.\n" +
                $"2. WEEKENDS OFF: NEVER schedule any task to start or end on a Friday or Saturday. Skip weekends entirely.\n" +
                $"3. START DELAY: Any new task schedule MUST start AT LEAST 30 minutes after {currentTimeString}. Never schedule a task to start immediately.\n" +
                $"4. WORK WINDOW STRICTNESS: You may ONLY schedule work hours between {workDayStart} and {workDayEnd}. If {currentTimeString} is past {workDayEnd}, start on the NEXT valid working day.\n" +
                $"5. MULTI-DAY SCHEDULING ALGORITHM (CRITICAL): To calculate the correct 'end' timestamp, you MUST simulate consuming the task's 'DurationMinutes' only during valid work hours.\n" +
                $"   - Step A: Start the task within the {workDayStart} → {workDayEnd} window.\n" +
                $"   - Step B: If the task's remaining DurationMinutes exceeds the time left before {workDayEnd} today, consume what you can until {workDayEnd}.\n" +
                $"   - Step C: Pause the task overnight (and over weekends).\n" +
                $"   - Step D: Resume the task on the next valid working day at exactly {workDayStart}.\n" +
                $"   - Step E: Repeat until all DurationMinutes are consumed. The exact moment the final minute is consumed is the 'end' timestamp.\n" +
                $"   => Because of overnight pauses, the absolute clock difference between 'start' and 'end' for multi-day tasks will mathematically be MUCH LARGER than DurationMinutes. This is exactly what is expected!\n" +
                $"</SCHEDULING_BEHAVIOR>\n\n" +

                $"<CONFLICT_DETECTION>\n" +
                $"Set isSuccessful = false ONLY if:\n" +
                $"1. Not enough time remains before a task deadline given existing fixed blocks, weekend skipping, and work windows.\n" +
                $"2. Two fixed blocks overlap each other in time.\n" +
                $"Otherwise, isSuccessful = true.\n" +
                $"</CONFLICT_DETECTION>\n\n" +

                $"<OUTPUT_RULES>\n" +
                $"- Output raw JSON only. No markdown fences. No extra text.\n" +
                $"- scheduledTasks contains ONLY real task work blocks.\n" +
                $"- NO rest entries. NO gap entries. NO null taskId entries ever.\n" +
                $"- Every entry must have a valid non-null integer taskId.\n" +
                $"- start and end reflect the ACTUAL task work window.\n" +
                $"- scheduledTasks must be null if nothing was scheduled.\n" +
                $"- conflictMessage must be null if there is no conflict.\n" +
                $"</OUTPUT_RULES>";

            // ── Step 2: Build Tasks Payload ───────────────────────────────────────────
            var tasksPayload = tasks.Select(t => new
            {
                t.Id,
                t.Title,
                DurationMinutes = t.Duration.TotalMinutes,
                Deadline = t.Deadline.ToString("yyyy-MM-dd HH:mm"),
                EarliestStart = t.EarliestStart?.ToString("yyyy-MM-dd HH:mm"),
                LatestEnd = t.LatestEnd?.ToString("yyyy-MM-dd HH:mm"),
                t.Priority,
                EffortLevel = t.EffortLevel.ToString(),
                Status = t.Status.ToString()
            }).ToList();

            var userPrompt =
                $"WorkDayStart : {workDayStart}\n" +
                $"WorkDayEnd   : {workDayEnd}\n" +
                $"CurrentTime  : {currentTimeString}\n\n" +
                $"Tasks Dataset:\n" +
                JsonSerializer.Serialize(
                    tasksPayload,
                    new JsonSerializerOptions { WriteIndented = true });

            // ── Step 3: Build Request Payload With Response Schema ────────────────────
            var requestPayload = new
            {
                contents = new[]
                {
            new
            {
                parts = new[]
                {
                    new { text = $"{systemInstructions}\n\nDataset:\n{userPrompt}" }
                }
            }
        },
                generationConfig = new
                {
                    responseMimeType = "application/json",
                    responseSchema = new
                    {
                        type = "OBJECT",
                        required = new[] { "isSuccessful" },
                        properties = new
                        {
                            isSuccessful = new
                            {
                                type = "BOOLEAN",
                                description = "True if scheduling succeeded. " +
                                              "False only on a true physical conflict."
                            },
                            scheduledTasks = new
                            {
                                type = "ARRAY",
                                description = "Only real task work blocks. No rest entries. No null taskIds.",
                                items = new
                                {
                                    type = "OBJECT",
                                    required = new[] { "taskId", "start", "end" },
                                    properties = new
                                    {
                                        taskId = new
                                        {
                                            type = "INTEGER",
                                            description = "The task Id. Never null."
                                        },
                                        start = new
                                        {
                                            type = "STRING",
                                            description = "yyyy-MM-dd HH:mm"
                                        },
                                        end = new
                                        {
                                            type = "STRING",
                                            description = "yyyy-MM-dd HH:mm"
                                        }
                                    }
                                }
                            },
                            conflictMessage = new
                            {
                                type = "STRING",
                                description = "Null if no conflict. " +
                                              "Detailed explanation if isSuccessful = false."
                            }
                        }
                    }
                }
            };

            // ── Step 4: Serialize and Send ────────────────────────────────────────────
            var jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            var httpContent = new StringContent(
                JsonSerializer.Serialize(requestPayload, jsonOptions),
                Encoding.UTF8,
                "application/json");

            var response = await _httpClient.PostAsync(url, httpContent);
            response.EnsureSuccessStatusCode();

            // ── Step 5: Extract Raw AI Text ───────────────────────────────────────────
            var jsonResponse = await response.Content.ReadAsStringAsync();

            using var doc = JsonDocument.Parse(jsonResponse);
            var rawAiText = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            // ── Step 6: Handle Empty Response ─────────────────────────────────────────
            if (string.IsNullOrWhiteSpace(rawAiText))
            {
                return new SchedulingEngineResult
                {
                    IsSuccessful = false,
                    ConflictMessage = "Gemini returned an empty response. Please try again."
                };
            }

            // ── Step 7: Strip Markdown Fences (defensive) ─────────────────────────────
            rawAiText = rawAiText.Trim();
            if (rawAiText.StartsWith("```json")) rawAiText = rawAiText[7..];
            if (rawAiText.StartsWith("```")) rawAiText = rawAiText[3..];
            if (rawAiText.EndsWith("```")) rawAiText = rawAiText[..^3];
            rawAiText = rawAiText.Trim();

            // ── Step 8: Deserialize ───────────────────────────────────────────────────
            var deserializeOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                AllowTrailingCommas = true
            };

            var finalResult = JsonSerializer.Deserialize<SchedulingEngineResult>(
                rawAiText,
                deserializeOptions);

            // ── Step 9: Fallback if Deserialization Fails ─────────────────────────────
            return finalResult ?? new SchedulingEngineResult
            {
                IsSuccessful = false,
                ConflictMessage = "Failed to parse the scheduling response. Please try again."
            };
        }





        public async Task<GeminiReportResponse> GenerateDailyReportAsync(List<TaskItem> tasks, List<TimeTracking> trackings)
        {
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent?key={_apiKey}";
            string currentTimeString = DateTime.Now.ToString("yyyy-MM-dd HH:mm");

            // 1. صياغة الـ System Instructions لطلب الـ Report فقط بالـ Markdown والـ Headers المطلوبة
            string systemInstructions =
                "You are an expert AI Productivity Coach and Data Analyst.\n" +
                "Your job is to analyze the user's daily tasks and their actual tracked time to generate a highly motivational, analytical daily report.\n\n" +
                "CRITICAL RULES:\n" +
                "1. Calculate a 'ProductivityScore' (0 to 100) as a float based on: tasks completed vs. pending,tracking partial progress of 'InProgress' tasks, strict deadline compliance, and how close the actual tracked time matches the estimated duration.\n" +
                "2. Write the 'Content' field strictly in English, using an encouraging, professional, and slightly witty tone.\n" +
                "3. Output raw JSON matching the required schema. Do not wrap code inside markdown blocks.\n\n" +
                "THE 'Content' FIELD MUST BE IN MARKDOWN AND INCLUDE THESE EXACT HEADERS:\n" +
                "- ##  Daily Achievements Summary\n" +
                "  (Celebrate completed tasks, congratulate them on wins, especially high priority ones)\n" +
                "- ##  Performance and Time Analysis\n" +
                "  (Deep dive into numbers. Compare estimated task Duration vs. actual AccumulatedSeconds/CurrentDuration. Tell them where they spent too much time or where they were efficient)\n" +
                "- ##  Points for Improvement\n" +
                "  (Gently but directly highlight missed deadlines, unstarted high-priority tasks, or severe time overruns. What went wrong today?)\n" +
                "- ##  Smart Tips for the Next Day\n" +
                "  (Provide 2-3 actionable, personalized, smart tips based on today's performance data to help them optimize tomorrow)\n" +
                "- ##  Our Encouraging Saying Today\n" +
                "  (End the report with a powerful, deeply inspiring motivational quote relevant to their struggle or success today)";

            // 2. تحضير وتجميع البيانات (Payload) لبيانات الـ Report
            var reportsPayload = new
            {
                CurrentSystemTime = currentTimeString,
                Tasks = tasks.Select(t => new
                {
                    t.Id,
                    t.Title,
                    EstimatedDurationMinutes = t.Duration.TotalMinutes,
                    Deadline = t.Deadline.ToString("yyyy-MM-dd HH:mm"),
                    Priority = t.Priority,
                    EffortLevel = t.EffortLevel,
                    Status = t.Status.ToString()
                }).ToList(),
                TimeLogs = trackings.Select(g => new
                {
                    g.TaskId,
                    TaskTitle = g.Task?.Title,
                    ActualTrackedMinutes = TimeSpan.FromSeconds(g.AccumulatedSeconds).TotalMinutes,
                    g.IsPaused
                }).ToList()
            };

            var userPrompt = $"Analyze this dataset and generate the productivity report:\n" +
                             JsonSerializer.Serialize(reportsPayload, new JsonSerializerOptions { WriteIndented = true });

            // 3. تجهيز الـ Request لـ Gemini مع الـ responseSchema لضمان عدم رجوع null
            var requestPayload = new
            {
                contents = new[] { new { parts = new[] { new { text = $"{systemInstructions}\n\nDataset:\n{userPrompt}" } } } },
                generationConfig = new
                {
                    responseMimeType = "application/json",
                    responseSchema = new
                    {
                        type = "OBJECT",
                        properties = new
                        {
                            productivityScore = new
                            {
                                type = "NUMBER",
                                description = "The calculated productivity score from 0 to 100 based on data analysis."
                            },
                            content = new
                            {
                                type = "STRING",
                                description = "The full English markdown report with all required sections."
                            }
                        },
                        required = new[] { "productivityScore", "content" }
                    }
                }
            };

            var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            var httpContent = new StringContent(JsonSerializer.Serialize(requestPayload, jsonOptions), Encoding.UTF8, "application/json");

            // 4. إرسال الطلب لـ Gemini API
            var response = await _httpClient.PostAsync(url, httpContent);
            response.EnsureSuccessStatusCode();

            var jsonResponse = await response.Content.ReadAsStringAsync();

            // 5. استخراج الـ JSON وعمل الـ Deserialize بأمان لتجنب مشاكل حالة الأحرف
            using var doc = JsonDocument.Parse(jsonResponse);
            var rawAiText = doc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();

            if (string.IsNullOrEmpty(rawAiText))
            {
                return new GeminiReportResponse { ProductivityScore = 0, Content = "## 📊 Daily Performance Report\nSorry, the AI returned an empty response." };
            }

            // تنظيف النص في حال وجود علامات الكود ماركداون
            rawAiText = rawAiText.Trim();
            if (rawAiText.StartsWith("```json")) rawAiText = rawAiText.Substring(7);
            if (rawAiText.StartsWith("```")) rawAiText = rawAiText.Substring(3);
            if (rawAiText.EndsWith("```")) rawAiText = rawAiText.Substring(0, rawAiText.Length - 3);
            rawAiText = rawAiText.Trim();

            var deserializeOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                AllowTrailingCommas = true
            };

            var finalResult = JsonSerializer.Deserialize<GeminiReportResponse>(rawAiText, deserializeOptions);

            if (finalResult == null || string.IsNullOrEmpty(finalResult.Content))
            {
                return new GeminiReportResponse
                {
                    ProductivityScore = 50,
                    Content = "##  Daily Performance Report\nYour report was generated successfully but failed to format correctly."
                };
            }

            return finalResult;
        }
    }
}
    

