using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PMS.Application.DTO.AIDto
{
    public class SchedulingEngineResult
    {
        public bool IsSuccessful { get; set; }
        public List<GeneratedAllocation>? ScheduledTasks { get; set; }
        public string? ConflictMessage { get; set; }
    }
}
