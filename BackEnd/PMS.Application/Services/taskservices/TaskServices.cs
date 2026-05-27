using PMS.Application.DTO.Task;
using PMS.Application.Interfaces.Repositories;
using PMS.Application.Interfaces.Services;
using PMS.Domain.Entities;
using PMS.Domain.Enums;

namespace PMS.Application.Services.taskservices
{
    public class TaskServices : ITaskService
    {
        private readonly Irepsitory<TaskItem> _taskRepo;
        private readonly Irepsitory<TaskTag> _taskTagRepo;
        private readonly Irepsitory<Category> _category;
        private readonly Irepsitory<ScheduleTask> _scheduleTaskRepo;
        private readonly IunitOfWork _uow;


        public TaskServices(
           Irepsitory<TaskItem> taskRepo,
           Irepsitory<Category> category,
           Irepsitory<TaskTag> taskTagRepo,
           Irepsitory<ScheduleTask> scheduleTaskRepo,
           IunitOfWork uow)
        {
            _taskRepo = taskRepo;
            _taskTagRepo = taskTagRepo;
            _category = category;
            _scheduleTaskRepo = scheduleTaskRepo;
            _uow = uow;
        }

        public async Task<bool> ChangeStatusAsync(int taskId, string status, int userid)
        {
            var task = await _taskRepo.FindOneAsync(t => t.Id == taskId && t.UserId == userid);

            if (task == null) return false;



            if (!Enum.TryParse<Taskstatus>(status, true, out var parsedStatus))
                return false;

            task.Status = parsedStatus;

            await _taskRepo.UpdateAsync(task);
            await _uow.SaveChangesAsync();

            return true;
        }//

        public async Task<TaskDto> CreateAsync(CreateTaskDto dto,int UserId, int? CategoryId)
        {
            var errors = new List<string>();
       
            if (!dto.EarliestStart.HasValue || !dto.LatestEnd.HasValue)
            {
                dto.EarliestStart = null;
                dto.LatestEnd = null;
            }

            // 1. Priority range
            if (dto.Priority < 1 || dto.Priority > 10)
                errors.Add("Priority must be between 1 and 10.");

            // 2. EffortLevel range
            if (dto.EffortLevel < 1 || dto.EffortLevel > 5)
                errors.Add("EffortLevel must be between 1 and 5.");

            // 3. Duration > 0
            if (TimeSpan.FromMinutes(dto.DurationInMinutes) <= TimeSpan.Zero)
                errors.Add("Duration must be greater than zero.");

            // 4. Earliest < Latest (only if both exist) ///
            if (dto.EarliestStart.HasValue && dto.LatestEnd.HasValue)
            {
                if (dto.EarliestStart >= dto.LatestEnd)
                    errors.Add("Start must be before End.");

                // 5. Duration must fit inside window
                var window = dto.LatestEnd.Value - dto.EarliestStart.Value;

                if (TimeSpan.FromMinutes(dto.DurationInMinutes) > window)
                    errors.Add("Duration exceeds available time window.Please Change Start,End Or change Duration");

                if (dto.EarliestStart >= dto.Deadline) {
                    errors.Add("Start must be before Deadline");
                }

                if (dto.LatestEnd > dto.Deadline)
                {
                    errors.Add("End must be before Deadline");
                }

            }

           //if ((dto.EarliestStart.HasValue && !dto.LatestEnd.HasValue) || (!dto.EarliestStart.HasValue && dto.LatestEnd.HasValue))
           //     {
           //     errors.Add("You Must Enter Start and End or no both ");
           // }

            // 6. If there is only EarliestStart + Deadline feasibility check (optional but strong)
            //if (dto.Deadline.HasValue)
            //{
            //    var reference = dto.EarliestStart ?? DateTime.UtcNow;

            //    var available = dto.Deadline.Value - reference;

            //    if (TimeSpan.FromMinutes(dto.DurationInMinutes) > available)
            //        errors.Add("Task cannot be completed before deadline.");
            //}

            // ❌ If any errors → stop
            if (errors.Any())
            {
                return new TaskDto { error = errors };
            }
                

            // 7. Validate category
            if (CategoryId != null)
            {
                var categoryExists = await _category.ExistsAsync(c =>
                    c.Id == CategoryId &&
                    c.UserId == UserId);

                if (!categoryExists)
                    CategoryId = null;
            }

            // 8. Map
            var task = new TaskItem
            {
                Title = dto.Title,
                Description = dto.Description,

                Duration = TimeSpan.FromMinutes(dto.DurationInMinutes),
                Deadline = dto.Deadline,

                EarliestStart = dto.EarliestStart,
                LatestEnd = dto.LatestEnd,

                Priority = dto.Priority,
                EffortLevel = dto.EffortLevel,

                Status = Taskstatus.Todo,

                UserId = UserId,
                CategoryId = CategoryId
            };

            await _taskRepo.AddAsync(task);
            await _uow.SaveChangesAsync();

            return new TaskDto
            {
                

                Id = task.Id,
                Title = task.Title,
                Description = task.Description,

                DurationInMinutes = (int)task.Duration.TotalMinutes,
                Deadline = task.Deadline,

                EarliestStart = task.EarliestStart,
                LatestEnd = task.LatestEnd,

                Priority = task.Priority,
                EffortLevel = task.EffortLevel,

                Status = task.Status
            };
        }

        public async Task<DeleteTaskResult> DeleteAsync(int taskId, int userId)
        {
            var check = await CheckBeforeDeleteTaskAsync(taskId, userId);

            // ❌ not found
            if (!check.CanDeleteDirectly && check.Message == "Task not found")
            {
                return new DeleteTaskResult
                {
                    Success = false,
                    NotFound = true,
                    Message = check.Message
                };
            }

            // ✔ can delete directly
            if (check.CanDeleteDirectly)
            {
                var deleted = await _taskRepo.DeleteWhereAsync(
                    t => t.Id == taskId && t.UserId == userId);

                return new DeleteTaskResult
                {
                    Success = deleted > 0
                };
            }

            // ⚠️ schedule conflict
            return new DeleteTaskResult
            {
                Success = false,
                HasScheduleConflict = true,
                Message = check.Message,
                Options = new List<string>
        {
            "ReplaceTask",
            "ReplanSchedule",
            "ClearSlot",
            "Cancel"
        }
            };




        }

        public async Task<List<TaskDto>> FilterAsync(int userId, int? categoryId, int? tagId, DateTime? from, DateTime? to)
        {

            return await _taskRepo.FindAsyncAdvanced(t=>
                                    t.UserId == userId &&
                    (categoryId == null || t.CategoryId == categoryId) &&
                    (tagId == null || t.TaskTags.Any(tt => tt.TagId == tagId)) &&
                    (
                        from == null && to == null
                        ||
                        (t.Deadline >= from || t.Deadline <= to)
                        ||
                        (t.EarliestStart <= to || t.LatestEnd >= from)
                        ),

                    task => new TaskDto
                    {
                        Id = task.Id,
                        Title = task.Title,
                        Description = task.Description,

                        DurationInMinutes = (int)task.Duration.TotalMinutes,
                        Deadline = task.Deadline,

                        EarliestStart = task.EarliestStart,
                        LatestEnd = task.LatestEnd,

                        Priority = task.Priority,
                        EffortLevel = task.EffortLevel,

                        Status = task.Status
                    });

            //////////////////////////////////////////////////


            // return await _taskRepo.FindAsyncAdvanced(
            //t =>
            //    t.UserId == userId &&
            //    (categoryId == null || t.CategoryId == categoryId) &&
            //    (tagId == null || t.TaskTags.Any(tt => tt.TagId == tagId)) &&
            //    (from == null || t.EarliestStart >= from) &&
            //    (to == null || t.LatestEnd <= to),

            //task => new TaskDto
            //{
            //    Id = task.Id,
            //    Title = task.Title,
            //    Description = task.Description,

            //    DurationInMinutes = (int)task.Duration.TotalMinutes,
            //    Deadline = task.Deadline,

            //    EarliestStart = task.EarliestStart,
            //    LatestEnd = task.LatestEnd,

            //    Priority = task.Priority,
            //    EffortLevel = task.EffortLevel,

            //    Status = task.Status
            //});
        }//

        public async Task<TaskDto?> GetByIdAsync(int taskid, int userId)
        {
            var data = await _taskRepo.FindAsyncAdvanced(
             t => t.Id == taskid && t.UserId == userId,
             t => new TaskDto
             {
                 Id = t.Id,
                 Title = t.Title,
                 Description = t.Description,

                 DurationInMinutes = t.Duration != null ? (int)t.Duration.TotalMinutes: 0,
                 Deadline = t.Deadline,

                 EarliestStart = t.EarliestStart,
                 LatestEnd = t.LatestEnd,

                 Priority = t.Priority,
                 EffortLevel = t.EffortLevel,

                 Status = t.Status
             });

            return data.FirstOrDefault();
        }//

        public async Task<List<TaskDto>> GetByUserAsync(int userId)
        {
            var tasks= await _taskRepo.FindAsyncAdvanced(
              t => t.UserId == userId,
              t => new TaskDto
              {
                  Id = t.Id,
                  Title = t.Title,
                  Description = t.Description,

                  DurationInMinutes = (int)t.Duration.TotalMinutes,
                  Deadline = t.Deadline,

                  EarliestStart = t.EarliestStart,
                  LatestEnd = t.LatestEnd,

                  Priority = t.Priority,
                  EffortLevel = t.EffortLevel,

                  Status = t.Status
              });
            return tasks ?? new List<TaskDto>();
        }//

        public async Task<List<TaskDto>> SearchAsync(int userId, string keyword)
        {
            return await _taskRepo.FindAsyncAdvanced(
            t =>
                t.UserId == userId &&
                (t.Title.Contains(keyword) ||
                 t.Description!.Contains(keyword)),

            t => new TaskDto
            {
                Id = t.Id,
                Title = t.Title,
                Description = t.Description,

                DurationInMinutes = (int)t.Duration.TotalMinutes,
                Deadline = t.Deadline,

                EarliestStart = t.EarliestStart,
                LatestEnd = t.LatestEnd,

                Priority = t.Priority,
                EffortLevel = t.EffortLevel,

                Status = t.Status
            });
        }

        public async Task<bool> UpdateAsync(UpdateTaskDto dto, int TaskId, int UserId)
        {
            var task = await _taskRepo.FindOneAsync(t => t.Id == TaskId && t.UserId == UserId);
            if (task == null) return false;

            if (dto.CategoryId != null)
            {
                var category = await _category.ExistsAsync(id => id.Id == dto.CategoryId && id.UserId == UserId);
                if (category == true)
                    task.CategoryId = dto.CategoryId;
            }

            

            //if ((dto.EarliestStart.HasValue && !dto.LatestEnd.HasValue)|| (!dto.EarliestStart.HasValue && dto.LatestEnd.HasValue))
            //{
            //    return false;
            //}

            if (dto.EarliestStart.HasValue &&dto.LatestEnd.HasValue &&dto.EarliestStart.Value < dto.LatestEnd.Value)
            {
                task.EarliestStart = dto.EarliestStart;
                task.LatestEnd = dto.LatestEnd;
            }

            if (dto.Deadline.HasValue )
            {
                if (!dto.EarliestStart.HasValue && !dto.LatestEnd.HasValue&&task.LatestEnd.HasValue&&task.LatestEnd.Value<=dto.Deadline.Value)
                {  
                     task.Deadline = dto.Deadline.Value;
                }

                if (dto.EarliestStart.HasValue && dto.LatestEnd.HasValue && dto.LatestEnd.Value <= dto.Deadline.Value)
                {
                    task.Deadline = dto.Deadline.Value;
                }

            }

            //if (dto.Deadline.HasValue && dto.EarliestStart.HasValue && dto.LatestEnd.HasValue && ((dto.Deadline.Value > dto.EarliestStart.Value) && (dto.Deadline.Value >= dto.LatestEnd.Value)))
            //{
            //    task.Deadline = dto.Deadline.Value;
            //}

            //if (dto.EarliestStart.HasValue && dto.LatestEnd.HasValue && task.Deadline != null && task.Deadline <= dto.EarliestStart.Value && task.Deadline < dto.LatestEnd.Value)
            //{
            //    return false;
            //}

            // ✏️ Basic fields
            if (dto.Title != null)
                task.Title = dto.Title;

            if (dto.Description != null)
                task.Description = dto.Description;

            // ⏱ AI Core fields
            if (dto.DurationInMinutes.HasValue)
                task.Duration = TimeSpan.FromMinutes(dto.DurationInMinutes.Value);

            //if (dto.Deadline.HasValue &&!dto.EarliestStart.HasValue&&!dto.LatestEnd.HasValue)
            //            {
            //                task.Deadline = dto.Deadline.Value;
            //            }
            //

            //task.EarliestStart = dto.EarliestStart;
            //task.LatestEnd = dto.LatestEnd;

                

            //if (dto.LatestEnd.HasValue)
            //    task.LatestEnd = dto.LatestEnd;

            // 🎯 AI ranking
            if (dto.Priority.HasValue)
                task.Priority = dto.Priority.Value;

            if (dto.EffortLevel.HasValue)
                task.EffortLevel = dto.EffortLevel.Value;

            // 📊 Status
            if (dto.Status.HasValue)
                task.Status = (Taskstatus)dto.Status.Value;

            //if (dto.CategoryId.HasValue)
            //    task.CategoryId = dto.CategoryId;

            await _taskRepo.UpdateAsync(task);
            await _uow.SaveChangesAsync();

            return true;
        }

        public async Task<TaskDeleteCheckResult> CheckBeforeDeleteTaskAsync(int taskId, int userid)
        {

            var exists = await _taskRepo.ExistsAsync(t => t.Id == taskId && t.UserId == userid);
            if (!exists)
                return new TaskDeleteCheckResult
                {
                    CanDeleteDirectly = false,
                    Message = "Task not found"
                };


            var hasSchedule = await _scheduleTaskRepo
                .ExistsAsync(st => st.TaskId == taskId && st.Task.UserId == userid);//&& st.Task.UserId == userid


            if (!hasSchedule)
                return new TaskDeleteCheckResult
                {
                    CanDeleteDirectly = true
                };


            return new TaskDeleteCheckResult
            {
                CanDeleteDirectly = false,
                HasScheduleConflict = true,
                Message = "This task is linked to a schedule",

                Options = new List<string>
            {
                "ReplaceTask",
                "ReplanSchedule",
                "ClearSlot",
                "Cancel"
            }
            };
        }


        // await ReplaceTaskAsync(oldTaskId, userId, old => newTaskId);
        // await ReplaceTaskAsync(oldTaskId, userId, old => null);
        public async Task<bool> ReplaceTaskAsync(int oldTaskId, int userid, Func<int?, int?> taskresolver)
        {

            var newTaskId = taskresolver(oldTaskId);

            if (newTaskId != null)
            {
                if (oldTaskId == newTaskId)
                    return true;

                var isValidTask = await _taskRepo.ExistsAsync(t => t.Id == newTaskId && t.UserId == userid && t.Status.Equals(2) );
                if (!isValidTask)
                    return false;

            }
            var scheduleTasks = await _scheduleTaskRepo.FindAsync(st => st.TaskId == oldTaskId);
            if (!scheduleTasks.Any())
            { return true; }

            foreach (var item in scheduleTasks)
            {
                item.TaskId = newTaskId;
                // await _scheduleTaskRepo.UpdateAsync(item);
            }
            await _uow.SaveChangesAsync();
            return true;

            //this task is replaced in all schedules m,w,d because i want delete it
        }

        public async Task<DeleteTaskResult> ResolveDeleteAsync(int taskId,int userId,string option,int newTaskId)
        {
            var task = await _taskRepo.FindOneAsync(
                t => t.Id == taskId && t.UserId == userId);

            if (task == null)
                return new DeleteTaskResult { Success = false, Message = "Task not found" };

            var schedules = await _scheduleTaskRepo.FindAsync(st => st.TaskId == taskId);

            switch (option)
            {
                case "ReplaceTask":

                    if (newTaskId==null)
                        return new DeleteTaskResult { Success = false, Message = "NewTaskId required" };

                    var isValid = await _taskRepo.ExistsAsync(t => t.Id == newTaskId && t.UserId == userId && t.Status.Equals(2));

                    if (!isValid)
                        return new DeleteTaskResult { Success = false, Message = "Invalid task" };

                    foreach (var s in schedules)
                        s.TaskId = newTaskId;

                    await _uow.SaveChangesAsync();

                    return new DeleteTaskResult { Success = true };

                case "ReplanSchedule":
                    // logic بتاعك هنا
                    return new DeleteTaskResult { Success = true };

                case "ClearSlot":
                    foreach (var s in schedules)
                        s.TaskId = null;

                    await _uow.SaveChangesAsync();

                    return new DeleteTaskResult { Success = true };

                case "Cancel":
                    return new DeleteTaskResult
                    {
                        Success = false,
                        Message = "Operation cancelled"
                    };

                default:
                    return new DeleteTaskResult
                    {
                        Success = false,
                        Message = "Invalid option"
                    };
            }
        }

        public async Task<bool> ClearStartEnd(int TaskId, int UserId)
        {
            var task = await _taskRepo.FindOneAsync(t => t.Id == TaskId && t.UserId == UserId);
            if (task == null) return false;

            task.EarliestStart = null;
            task.LatestEnd= null;
            await _taskRepo.UpdateAsync(task);
            await _uow.SaveChangesAsync();
            return true;
        }

    }


}
