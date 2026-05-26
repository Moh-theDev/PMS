using PMS.Application.DTO.TimeEntry;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PMS.Application.Interfaces.Services
{
    public interface ITimeTrackingService
    {
        public Task<TimeEntryDto> StartAsync(int taskId, int userId);
        public Task<TimeEntryDto> PauseAsync(int entryId, int userId);
        public Task<TimeEntryDto> ResumeAsync(int entryId, int userId);
        public Task<TimeEntryDto> StopAsync(int entryId, int userId);
        public Task<TimeEntryDto?> GetActiveAsync(int userId);

        public Task<List<TimeEntryDto>?> TasksSessions(int taskId, int userId);

        public Task<TimeEntryDto?> TaskSessionId(int taskId, int entryId, int userId);

        public Task<TimeEntryDto?> SessionId(int entryId, int userId);

        public Task<long> SumOfAllSessionsTaskId(int taskId, int userId);

        public Task<long> SumOfAllSessions(int userId);

        public Task<List<TimeEntryDto>?> AllSessionsUser(int userId);
        //public Task<TimeEntryDto> GetActiveEntry(int entryId, int userId);
    }
}
