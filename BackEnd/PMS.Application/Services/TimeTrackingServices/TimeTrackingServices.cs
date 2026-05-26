using PMS.Application.DTO.Task;
using PMS.Application.DTO.TimeEntry;
using PMS.Application.Interfaces.Repositories;
using PMS.Application.Interfaces.Services;
using PMS.Domain.Entities;
using PMS.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using static System.Runtime.InteropServices.JavaScript.JSType;


namespace PMS.Application.Services.TimeTrackingServices
{
    public class TimeTrackingServices : ITimeTrackingService
    {

        private readonly Irepsitory<TimeTracking> _irepsitory;
        private readonly Irepsitory<TaskItem> _taskrepo;
        private readonly IunitOfWork _unitOfWork;

        public TimeTrackingServices(Irepsitory<TimeTracking> irepsitory, IunitOfWork unitOfWork, Irepsitory<TaskItem> taskrepo)
        {
            _irepsitory = irepsitory;
            _unitOfWork = unitOfWork;
            _taskrepo = taskrepo;
        }

        public async Task<TimeEntryDto?> GetActiveAsync(int userId)
        {
            var result = await _irepsitory
            .FindAsyncAdvanced(e =>
                e.UserId == userId &&
                e.EndedAt == null,
              e => new TimeEntryDto
              {
                  Id = e.Id,
                  TaskId = e.TaskId,
                  IsPaused = e.IsPaused,
                  AccumulatedSeconds = e.AccumulatedSeconds,
                  StartedAt = e.StartedAt,
                  CreatedAt=e.CreatedAt,
                  CurrentSeconds = e.IsPaused
                    ? e.AccumulatedSeconds
                    : e.AccumulatedSeconds +
                      (int)(DateTime.UtcNow - e.StartedAt).TotalSeconds
              });
          return result.FirstOrDefault();
        }

        public async Task<TimeEntryDto> PauseAsync(int entryId, int userId) //s      pause    resume      end
        {
            var errors = new List<string>();

            var entry = await _irepsitory.FindOneAsync(e =>
                       e.Id == entryId &&
                       e.UserId == userId &&
                       e.EndedAt == null &&
                       !e.IsPaused);

            if (entry == null)
            {
                errors.Add("no timer'id runnin");
                return new TimeEntryDto { errors = errors };
            }

            var elapsed = (int)(DateTime.UtcNow - entry.StartedAt).TotalSeconds;
            entry.AccumulatedSeconds += elapsed;
            entry.IsPaused = true;

            var task = await _taskrepo.GetByIdAsync(entry.TaskId);

            if (task == null)
            {
                errors.Add("Task not exist in time tracking id");
                return new TimeEntryDto { errors = errors };
                //throw new Exception("Task not exist in time tracking id");
            }

            task.Status=Taskstatus.Paused;
            await _taskrepo.UpdateAsync(task);

            await _unitOfWork.SaveChangesAsync();

            return new TimeEntryDto
            {
                Id= entryId,
                TaskId = entry.TaskId,
                StartedAt = entry.StartedAt,
                AccumulatedSeconds = entry.AccumulatedSeconds,
                IsPaused = entry.IsPaused,
                CreatedAt=entry.CreatedAt

            };

        }

        //private async Task<TimeTracking> GetActiveEntry(int entryId, int userId)
        //{
        //    return await _irepsitory.FindOneAsync(e =>
        //               e.Id == entryId &&
        //               e.UserId == userId &&
        //               e.EndedAt == null &&
        //               !e.IsPaused)
        //           ?? throw new Exception("no timer'id runnin");
        //}

        public async Task<TimeEntryDto> ResumeAsync(int entryId, int userId)
        {
            var errors = new List<string>();
            var entry = await _irepsitory.FindOneAsync(e =>
           e.Id == entryId &&
           e.UserId == userId &&
           e.IsPaused&&e.EndedAt==null
           );
             if (entry == null)
                 {
                errors.Add("all timers paused Or No Timers");
                return new TimeEntryDto { errors = errors };
                  }
          // ?? throw new Exception("all timers paused Or No Timers");

            entry.StartedAt = DateTime.UtcNow;

            entry.IsPaused = false;

            var task=await _taskrepo.GetByIdAsync(entry.TaskId);

            if (task == null)
            {
                errors.Add("Task not exist in time tracking id");
                return new TimeEntryDto { errors = errors };
              //  throw new Exception("Task not exist in time tracking id");
            }

            task.Status = Taskstatus.InProgress;
            await _taskrepo.UpdateAsync(task);
            await _unitOfWork.SaveChangesAsync();

            return new TimeEntryDto
            {
                CreatedAt=entry.CreatedAt,
                TaskId = entry.TaskId,
                StartedAt = entry.StartedAt,
                AccumulatedSeconds = entry.AccumulatedSeconds,
                IsPaused = entry.IsPaused,
                Id=entry.Id,
                

            };
        }

        public async Task<TimeEntryDto> StartAsync(int taskId, int userId)
        {
            var errors = new List<string>();

            var hasActive = await _irepsitory.ExistsAsync(e =>
            e.UserId == userId &&
            e.EndedAt == null /*&&
            e.IsPaused||!e.IsPaused*/);

            if (hasActive)
            {
                errors.Add("You already have an active task running");
                return new TimeEntryDto{ errors=errors};
            }
               // throw new Exception("You already have an active task running");

           var task= await _taskrepo.GetByIdAsync(taskId);
            if (task == null)
            {
                errors.Add("Task is not exist");
                return new TimeEntryDto { errors = errors };
               // throw new Exception("Task is not exist");
            }

            var entry = new TimeTracking
            {
                
                TaskId = taskId,
                UserId = userId,
                StartedAt = DateTime.UtcNow,
                AccumulatedSeconds = 0,
                IsPaused = false,
                CreatedAt = DateTime.UtcNow
            };
            task.Status = Taskstatus.InProgress;
            await  _taskrepo.UpdateAsync(task);
            await _irepsitory.AddAsync(entry);
            await _unitOfWork.SaveChangesAsync();

            var dto = new TimeEntryDto
            {
                Id = entry.Id,
                TaskId = entry.TaskId,
                StartedAt = entry.StartedAt,
                AccumulatedSeconds = 0,
                IsPaused = false,
                CreatedAt = entry.CreatedAt
            };
            return dto;
        }

        public async Task<TimeEntryDto> StopAsync(int entryId, int userId)
        {
            var errors = new List<string>();
            var entry = await _irepsitory.FindOneAsync(e =>
           e.Id == entryId &&
           e.UserId == userId &&
           e.EndedAt == null
           );
            if (entry == null)
            {
                errors.Add("Timer not found or already stopped");
                return new TimeEntryDto { errors = errors };
            }


            var task = await _taskrepo.GetByIdAsync(entry.TaskId);

            if (task == null)
            {
                errors.Add("Task not exist in time tracking id");
                return new TimeEntryDto { errors = errors };
            }


            if (!entry.IsPaused)
            {
                var elapsed = (int)(DateTime.UtcNow - entry.StartedAt).TotalSeconds;
                entry.AccumulatedSeconds += elapsed;
            }


            entry.EndedAt = DateTime.UtcNow;
            entry.IsPaused = false;

            

            task.Status=Taskstatus.InProgress;//Done
            await _taskrepo.UpdateAsync(task);

            await _irepsitory.UpdateAsync(entry);
            await _unitOfWork.SaveChangesAsync();
            return new TimeEntryDto {

                Id = entry.Id, 
                TaskId = entry.TaskId,
                StartedAt = entry.StartedAt,
                CreatedAt=entry.CreatedAt,
                AccumulatedSeconds = entry.AccumulatedSeconds,
                IsPaused = entry.IsPaused,
                EndedAt = entry.EndedAt,

                //CurrentSeconds = entry.IsPaused
                //? entry.AccumulatedSeconds
                //: entry.AccumulatedSeconds +
                //  (int)(DateTime.UtcNow - entry.StartedAt).TotalSeconds

            };
        }

        public async Task<List<TimeEntryDto>?> TasksSessions(int taskId,int userId)
        {
            var taskSessions= await _irepsitory.FindAsyncAdvanced
                                       (t => t.TaskId == taskId && t.UserId == userId,
                                         t=>new TimeEntryDto {Id=t.Id,CreatedAt=t.CreatedAt,StartedAt
                                         =t.StartedAt,EndedAt=t.EndedAt,TaskId=t.TaskId,
                                         AccumulatedSeconds=t.AccumulatedSeconds,IsPaused=t.IsPaused,
                                         });

            return taskSessions.ToList();
        }

        public async Task<List<TimeEntryDto>?> AllSessionsUser( int userId)
        {
            var taskSessions = await _irepsitory.FindAsyncAdvanced
                                       (t => t.UserId == userId,
                                         t => new TimeEntryDto
                                         {
                                             Id = t.Id,
                                             CreatedAt = t.CreatedAt,
                                             StartedAt
                                         = t.StartedAt,
                                             EndedAt = t.EndedAt,
                                             TaskId = t.TaskId,
                                             AccumulatedSeconds = t.AccumulatedSeconds,
                                             IsPaused = t.IsPaused,
                                         });

            return taskSessions.ToList();
        }

        public async Task<TimeEntryDto?> TaskSessionId(int taskId,int entryId, int userId)
        {
            var taskSession = await _irepsitory.FindAsyncAdvanced
                                       (t => t.TaskId == taskId && t.UserId == userId&&t.Id == entryId,
                                         t => new TimeEntryDto
                                         {
                                             Id = t.Id,
                                             CreatedAt = t.CreatedAt,
                                             StartedAt
                                         = t.StartedAt,
                                             EndedAt = t.EndedAt,
                                             AccumulatedSeconds = t.AccumulatedSeconds,
                                             IsPaused = t.IsPaused,
                                         });

            return taskSession.FirstOrDefault();
        }


        public async Task<TimeEntryDto?> SessionId( int entryId, int userId)
        {
            var taskSession = await _irepsitory.FindAsyncAdvanced
                                       (t =>  t.UserId == userId && t.Id == entryId,
                                         t => new TimeEntryDto
                                         {
                                             Id = t.Id,
                                             CreatedAt = t.CreatedAt,
                                             StartedAt
                                         = t.StartedAt,
                                             EndedAt = t.EndedAt,
                                             AccumulatedSeconds = t.AccumulatedSeconds,
                                             IsPaused = t.IsPaused,
                                         });

            return taskSession.FirstOrDefault();
        }

        public async Task<long> SumOfAllSessionsTaskId(int taskId,int userId)
        {
            var taskSession = await _irepsitory.FindAsync(t => t.TaskId == taskId && t.UserId == userId);
            if (taskSession == null) {  return 0; }
            var sum = 0;
            foreach (var session in taskSession) {

                sum += session.AccumulatedSeconds;
            }

            return sum;
        }

        public async Task<long> SumOfAllSessions( int userId)
        {
            var taskSession = await _irepsitory.FindAsync(t =>  t.UserId == userId);
            if (taskSession == null) { return 0; }
            var sum = 0;
            foreach (var session in taskSession)
            {

                sum += session.AccumulatedSeconds;
            }

            return sum;
        }
    }
}
