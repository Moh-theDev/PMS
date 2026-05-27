using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMS.Application.DTO.Task;
using PMS.Application.Interfaces.Services;
using PMS.Helpers;
using System.Security.Claims;
//using Swashbuckle.AspNetCore.Annotations;

namespace PMS.Controllers
{
    [Authorize(Roles = "User")]
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : Controller
    {
        private readonly ITaskService _taskService;

        public TasksController(ITaskService taskService)
        {
            _taskService = taskService;
        }

        [HttpPost]

        //[SwaggerOperation( Summary = "Create Task", Description = "Creates a new task for the authenticated user")]
        [ProducesResponseType(typeof(TaskDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Create([FromBody] CreateTaskDto dto, [FromQuery] int? CategoryId=null)
        {
            var UserId = User.GetBusinessUserId();
            var result = await _taskService.CreateAsync(dto,UserId,CategoryId);
            if(result==null)
                return BadRequest("Task Creation Faild");
            if (result.error != null)
            {
                return BadRequest(result.error);
            }
            //return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
            return Ok(result);
        }//

        [HttpGet("{Taskid}")]
        public async Task<IActionResult> GetById(int Taskid)
        {
            var UserId = User.GetBusinessUserId();
            var task = await _taskService.GetByIdAsync(Taskid, UserId);
            if (task == null)
                return NotFound();

            return Ok(task);
        }//

        [HttpGet]
        public async Task<IActionResult> GetAllTasks()
        {
            var UserId = User.GetBusinessUserId();
            var tasks = await _taskService.GetByUserAsync(UserId);
            //if(tasks == null)
            //    return NotFound();
            return Ok(tasks);
        }//

        [HttpPut("{taskId}")]
        public async Task<IActionResult> Update([FromBody] UpdateTaskDto dto, int taskId)
        {
            var UserId = User.GetBusinessUserId();
            var result = await _taskService.UpdateAsync(dto,taskId,UserId);
            if (!result)
                return NotFound();


            return NoContent(); ;
        }//

        [HttpDelete("{taskId}")]
        public async Task<IActionResult> Delete(int taskId)
        {
            var userId = User.GetBusinessUserId();

            var result = await _taskService.DeleteAsync(taskId, userId);

            if (result.NotFound)
                return NotFound(result.Message);

            if (result.HasScheduleConflict)
                return Conflict(result);
          

            if (result.Success)
                return NoContent();

            return BadRequest(result.Message);
        }


        [HttpPut("{Taskid}/status")]
        public async Task<IActionResult> ChangeStatus(int Taskid,[FromBody] string status)
        {
           var  userId = User.GetBusinessUserId();
            var result = await _taskService.ChangeStatusAsync(Taskid, status, userId);
            if (!result)
                return BadRequest();

            return Ok();
        }//



        [HttpGet("filter")]
        public async Task<IActionResult> Filter([FromQuery] int? categoryId,[FromQuery] int? tagId,[FromQuery] DateTime? from,[FromQuery] DateTime? to)
        {
            var UserId = User.GetBusinessUserId();
            var tasks = await _taskService.FilterAsync(UserId, categoryId, tagId, from, to);
            if (tasks==null) return NotFound();
            return Ok(tasks);
        }//

        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string keyword)
        {
            var UserId = User.GetBusinessUserId();
            var tasks = await _taskService.SearchAsync(UserId, keyword);
            if(tasks==null) return NotFound();
            return Ok(tasks);
        }//


        [HttpPost("{taskId}/resolve-delete")]
        public async Task<IActionResult> ResolveDelete(int taskId, [FromBody] DeleteResolutionRequest request)
        {
            var userId = User.GetBusinessUserId();

            var result = await _taskService.ResolveDeleteAsync(taskId,userId,request.Option,(int)request.NewTaskId);

            if (!result.Success)
                return BadRequest(result.Message);

            return Ok(result);
        }

        [HttpPatch("clear-start-end/{taskId}")]
        public async Task<IActionResult> ClearStartEnd(int taskId)
        {
            var userId = User.GetBusinessUserId();

            var result = await _taskService.ClearStartEnd(taskId, userId);

            if (!result)
                return NotFound(new { message = "Task not found" });

            return Ok(new
            {
                message = "EarliestStart and LatestEnd cleared successfully"
            });
        }
    }
}
