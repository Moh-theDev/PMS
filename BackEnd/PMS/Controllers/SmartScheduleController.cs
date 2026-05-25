using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PMS.Application.Interfaces.Services;
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
        public async Task<IActionResult> AutoFillSchedule()
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
    }
}
