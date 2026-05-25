using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PMS.Application.DTO.TimeEntry;
using PMS.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using PMS.Helpers;



namespace PMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "User")]
    public class TimeTrackingController : ControllerBase
    {
        private readonly ITimeTrackingService _timeTrackingService;

        public TimeTrackingController(ITimeTrackingService timeTrackingService)
        {
            _timeTrackingService = timeTrackingService;
        }

        [HttpGet("active")]
        public async Task<ActionResult<TimeEntryDto>> GetActive()
        {
            var userId = User.GetBusinessUserId();

            var result = await _timeTrackingService.GetActiveAsync(userId);
            //if (result.errors != null)
            //{
            //    return BadRequest(result.errors);
            //}
            if (result == null)
                return NotFound("No active timer found");

            return Ok(result);
        }

        [HttpPost("start")]
        public async Task<ActionResult<TimeEntryDto>> Start([FromQuery] int taskId)
        {
            var userId = User.GetBusinessUserId();

            var result = await _timeTrackingService.StartAsync(taskId, userId);

            return CreatedAtAction(nameof(GetActive), result);
        }

        [HttpPost("{entryId}/stop")]
        public async Task<ActionResult<TimeEntryDto>> Stop(int entryId)
        {
            var userId = User.GetBusinessUserId();

            var result = await _timeTrackingService.StopAsync(entryId, userId);
            if (result.errors != null)
            {
                return BadRequest(result.errors);
            }

            return Ok(result);
        }

        [HttpPost("{entryId}/resume")]
        public async Task<ActionResult<TimeEntryDto>> Resume(int entryId)
        {
            var userId = User.GetBusinessUserId();

            var result = await _timeTrackingService.ResumeAsync(entryId, userId);
            if (result.errors != null)
            {
                return BadRequest(result.errors);
            }
            return Ok(result);
        }

        [HttpPost("{entryId}/pause")]
        public async Task<ActionResult<TimeEntryDto>> Pause(int entryId)
        {
            var userId = User.GetBusinessUserId();

            var result = await _timeTrackingService.PauseAsync(entryId, userId);
            if (result.errors != null)
            {
                return BadRequest(result.errors);
            }
            return Ok(result);
        }

    }
}
