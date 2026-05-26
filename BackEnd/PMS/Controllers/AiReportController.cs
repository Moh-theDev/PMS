using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PMS.Application.DTO.AIDto;
using PMS.Domain.Entities;
using PMS.Helpers;
using PMS.Infrastructre.Data;
using PMS.Infrastructre.Services.GeminiService;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace PMS.WebApi.Controllers
{
    
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "User")]
    public class AiReportController : ControllerBase
    {
        private readonly GeminiClientService _geminiService;
        private readonly AppDbContext _context; 

        public AiReportController(GeminiClientService geminiService, AppDbContext context)
        {
            _geminiService = geminiService;
            _context = context;
        }

        [HttpPost("generate-daily")]
        public async Task<IActionResult> GenerateDailyReport()
        {
            var userId = User.GetBusinessUserId();
        
            var startOfDay = DateTime.UtcNow.Date;
            var endOfDay = startOfDay.AddDays(1).AddTicks(-1);

            // 2. جلب الـ Time Tracking الخاص باليوم الحالي للمستخدم
            var trackings = await _context.Set<TimeTracking>()
                .Include(t => t.Task)
                .Where(t => t.UserId == userId && t.CreatedAt >= startOfDay && t.CreatedAt <= endOfDay)
                .ToListAsync();

            if (!trackings.Any())
            {
                return BadRequest(new { message = "There are no tasks recorded with time today to create a report." });
            }

         
            var taskIds = trackings.Select(t => t.TaskId).Distinct().ToList();
            var tasks = await _context.Set<TaskItem>()
                .Where(t => taskIds.Contains(t.Id) || (t.Deadline >= startOfDay && t.Deadline <= endOfDay))
                .ToListAsync();

            try
            {
              
                var aiResult = await _geminiService.GenerateDailyReportAsync(tasks, trackings);

              
                var finalReport = new AiReport
                {
                    UserId = userId,
                    Type = "Daily",
                    PeriodStart = startOfDay,
                    PeriodEnd = endOfDay,
                    ProductivityScore = aiResult.ProductivityScore,
                    Content = aiResult.Content
                };

                _context.Set<AiReport>().Add(finalReport);
                await _context.SaveChangesAsync();

                return Ok(finalReport);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while generating the smart report.", error = ex.Message });
            }
        }
    }
}