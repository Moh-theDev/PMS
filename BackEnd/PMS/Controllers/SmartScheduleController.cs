using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PMS.Application.Interfaces.Services;
using PMS.Domain.Enums;
using PMS.Helpers;
using PMS.Infrastructre.Data;
using PMS.Infrastructre.Services.GeminiService;
using System.Globalization;

namespace PMS.Controllers
{

    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "User")]
    public class SmartScheduleController : ControllerBase
    {
        private readonly GeminiClientService _geminiService;
        private readonly AppDbContext _context;
        private readonly ITaskService _taskService;

    
        public SmartScheduleController(GeminiClientService geminiService, AppDbContext context, ITaskService taskService)
        {
            
            _geminiService = geminiService;
            _context = context;
            _taskService = taskService;
            
        }

        [HttpPost("auto-fill-blank-times")]
        public async Task<IActionResult> AutoFillSchedule(/*startWorking,EndWorking*/)
        {
            try
            {
               var userId=User.GetBusinessUserId();

                // 1. Fetch all system tasks (both scheduled and unscheduled)
                var allTasks = await _context.Tasks.Where(t => t.UserId == userId).ToListAsync();

                if (!allTasks.Any())
                {
                    return BadRequest("No tasks exist in the database to compile.");
                }

                // 2. Compute timeline calculations via Gemini Client
                var engineResult = await _geminiService.GenerateMissingSchedulesAsync(allTasks);

                // 3. Handle physical runtime constraints exceptions
                if (!engineResult.IsSuccessful)
                {
                    return UnprocessableEntity(new
                    {
                        Status = "Conflict Detected",
                        Details = engineResult.ConflictMessage
                    });
                }
                //
                if (engineResult.ScheduledTasks == null || !engineResult.ScheduledTasks.Any())
                {
                    return Ok(new
                    {
                        Status = "No Action Needed",
                        Message = engineResult.ConflictMessage
                    });
                }

                // 4. Match up computed allocations and save updates to database
                foreach (var allocation in engineResult.ScheduledTasks!)
                {
                    var targetTask = allTasks.FirstOrDefault(t => t.Id == allocation.TaskId);
                    if (targetTask != null)
                    {
                        // Parse strings back to valid native database DateTime structures
                        targetTask.EarliestStart = DateTime.ParseExact(allocation.Start, "yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture);
                        targetTask.LatestEnd = DateTime.ParseExact(allocation.End, "yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture);
                    }
                }

                // Write updates to your relational tables
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    Status = "Success",
                    Message = "All open tasks successfully aligned around existing schedules without conflict markers."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Engine operational fault: {ex.Message}");
            }
        }



        [HttpPost("update-auto-fill-blank-time")]
        public async Task<IActionResult> UpdateAutoFillSchedule( [FromQuery] TimeSpan workDayStart, [FromQuery] TimeSpan workDayEnd)
        {
            try
            {
                // ── Step 1: Validate work hour range ──────────────────────────────────
                // Format validation is handled automatically by ASP.NET
                // We only need to check the logical range here
                if (workDayStart >= workDayEnd)
                {
                    return BadRequest(new
                    {
                        Status = "Invalid Range",
                        Message = "WorkDayStart must be earlier than WorkDayEnd."
                    });
                }

                if (workDayStart < TimeSpan.Zero ||
                    workDayEnd > TimeSpan.FromHours(24))
                {
                    return BadRequest(new
                    {
                        Status = "Invalid Range",
                        Message = "Work hours must be between 00:00 and 23:59."
                    });
                }

                // ── Step 2: Convert to clean HH:mm strings for Gemini prompt ─────────
                // Gemini works with strings not TimeSpan
                var workDayStartString = workDayStart.ToString(@"hh\:mm");
                var workDayEndString = workDayEnd.ToString(@"hh\:mm");

                // ── Step 3: Get current user ──────────────────────────────────────────
                var userId = User.GetBusinessUserId();

                // ── Step 4: Fetch only active tasks ───────────────────────────────────
                var eligibleTasks = await _context.Tasks
                    .Where(t => t.UserId == userId &&
                                t.Status != Taskstatus.Done &&
                                t.Status != Taskstatus.Cancelled)
                    .ToListAsync();

                if (!eligibleTasks.Any())
                {
                    return Ok(new
                    {
                        Status = "No Action Needed",
                        Message = "No active tasks found to schedule."
                    });
                }
                //frontend
                //// ── Step 5: Defensive expired deadline check ──────────────────────────
                //var expiredDeadlineTasks = eligibleTasks
                //    .Where(t => t.Deadline <= DateTime.Now)
                //    .ToList();

                //if (expiredDeadlineTasks.Any())
                //{
                //    return BadRequest(new
                //    {
                //        Status = "Expired Deadlines Detected",
                //        Message = "Some tasks have deadlines in the past. " +
                //                  "Please update or delete them before planning.",
                //        Tasks = expiredDeadlineTasks.Select(t => new
                //        {
                //            t.Id,
                //            t.Title,
                //            Deadline = t.Deadline.ToString("yyyy-MM-dd HH:mm")
                //        })
                //    });
                //}

                // ── Step 6: Classify task states ──────────────────────────────────────
                var hasUnscheduledTasks = eligibleTasks.Any(t =>
                    t.EarliestStart == null &&
                    t.LatestEnd == null);

                var hasStaleTasks = eligibleTasks.Any(t =>
                    t.EarliestStart.HasValue &&
                    t.LatestEnd.HasValue &&
                    t.EarliestStart.Value < DateTime.Now &&
                    t.LatestEnd.Value < DateTime.Now &&
                    t.Deadline > DateTime.Now);

                //var hasInFlightTasks = eligibleTasks.Any(t =>
                //    t.EarliestStart.HasValue &&
                //    t.LatestEnd.HasValue &&
                //    t.EarliestStart.Value < DateTime.Now &&
                //    t.LatestEnd.Value > DateTime.Now &&
                //    t.Deadline > DateTime.Now);

                if (!hasUnscheduledTasks && !hasStaleTasks )
                {
                    return Ok(new
                    {
                        Status = "No Action Needed",
                        Message = "All active tasks are already scheduled " +
                                  "with valid future time blocks."
                    });
                }

                // ── Step 7: Call Gemini scheduling engine ─────────────────────────────
                var engineResult = await _geminiService.GenerateMissingSchedulesAsyncs(
                    eligibleTasks,
                    workDayStartString,
                    workDayEndString);

                // ── Step 8: Handle physical conflict ──────────────────────────────────
                if (!engineResult.IsSuccessful)
                {
                    return UnprocessableEntity(new
                    {
                        Status = "Conflict Detected",
                        Message = engineResult.ConflictMessage
                    });
                }

                // ── Step 9: Handle empty result edge case ─────────────────────────────
                if (engineResult.ScheduledTasks == null ||
                    !engineResult.ScheduledTasks.Any())
                {
                    return Ok(new
                    {
                        Status = "No Action Needed",
                        Message = "No scheduling changes were needed " +
                                  "based on current task states."
                    });
                }

                // ── Step 10: Persist to database ──────────────────────────────────────
                foreach (var block in engineResult.ScheduledTasks)
                {
                    var targetTask = eligibleTasks
                        .FirstOrDefault(t => t.Id == block.TaskId);

                    if (targetTask == null) continue;

                    targetTask.EarliestStart = DateTime.ParseExact(
                        block.Start,
                        "yyyy-MM-dd HH:mm",
                        CultureInfo.InvariantCulture);

                    targetTask.LatestEnd = DateTime.ParseExact(
                        block.End,
                        "yyyy-MM-dd HH:mm",
                        CultureInfo.InvariantCulture);
                }

                await _context.SaveChangesAsync();

                // ── Step 11: Return final schedule ────────────────────────────────────
                return Ok(new
                {
                    Status = "Success",
                   // Summary = engineResult.ScheduleSummary,
                    Schedule = engineResult.ScheduledTasks.Select(block => new
                    {
                        block.TaskId,
                        block.Start,
                        block.End
                    })
                });
            }
            catch (FormatException ex)
            {
                return BadRequest(new
                {
                    Status = "Date Parse Error",
                    Message = $"Gemini returned an invalid date format: {ex.Message}"
                });
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(503, new
                {
                    Status = "AI Service Unavailable",
                    Message = $"Could not reach the scheduling engine: {ex.Message}"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    Status = "Engine Fault",
                    Message = ex.Message
                });
            }
        }
    }
}
