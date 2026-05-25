using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PMS.Application.DTO.Category;
using PMS.Application.Interfaces.Services;
using PMS.Domain.Entities;
using PMS.Helpers;
using Prometheus;
using Swashbuckle.Swagger.Annotations;

namespace PMS.Controllers
{
    [Authorize(Roles ="User")]
    [Route("api/[controller]")]
    [ApiController]

    public class CategoriesController : ControllerBase
    {
        private readonly ICategoryService _service;

        public CategoriesController(ICategoryService service)
        {
            _service = service;
        }


       // [SwaggerOperation(Summary = "Create Category", Description = "Creates a new category for the authenticated business user")]
        [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]

        [HttpPost]
        public async Task<IActionResult> Create(CreateCategoryDto dto)
        {
            var UserId = User.GetBusinessUserId();
            var id = await _service.CreateAsync(dto, UserId);
            if (id == -1)
                return Conflict("Category already exists");
            return Ok(id);
        }
        [HttpGet]
        public async Task<IActionResult> GetAllCategories()
        {
            var UserId = User.GetBusinessUserId();
            var data = await _service.GetByUserAsync(UserId);
            return Ok(data);
        }


        [HttpGet("{categoryId}")]
        public async Task<IActionResult> Get(int categoryId)
        {
            if (categoryId <= 0)
            {
                return BadRequest("Invalid category id");
            }
            var userId = User.GetBusinessUserId();

            var data = await _service.GetByIdAsync(categoryId, userId);

            if (data == null)
                return NotFound();

            return Ok(data);
        }

        [HttpPut("{categoryId}")]
        public async Task<IActionResult> Update(UpdateCategory dto,int categoryId)
        {
            if (categoryId <= 0)
                return BadRequest("Invalid category id");
            var userId = User.GetBusinessUserId();
            var result = await _service.UpdateAsync(dto,categoryId,userId);
            if (!result)
                return NotFound();

            return Ok();
        }

        [HttpDelete("{categoryId}")]
        public async Task<IActionResult> Delete(int categoryId)
        {
            if (categoryId <= 0)
                return BadRequest("Invalid category id");
            var UserId = User.GetBusinessUserId();
            var result = await _service.DeleteAsync(categoryId, UserId);
            if (!result)
                return NotFound();

            return Ok();
        }

    }
}
