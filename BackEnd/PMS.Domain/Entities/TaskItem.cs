using PMS.Domain.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PMS.Domain.Entities
{
    public class TaskItem
    {
 

        public int Id { get; set; }

        public string Title { get; set; } = null!;

        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Core input for AI
        public TimeSpan Duration { get; set; }

        public DateTime Deadline { get; set; }

        // Optional constraints
        public DateTime? EarliestStart { get; set; }
        public DateTime? LatestEnd { get; set; }

        // AI ranking factors
        public int Priority { get; set; } // 1 - 10
        public int EffortLevel { get; set; } // 1 - 5

        // Status tracking
        public Taskstatus Status { get; set; } = Taskstatus.Todo;


        [Required]
        public int UserId { get; set; }

        public int? CategoryId { get; set; }

        public User User { get; set; }
        public Category? Category { get; set; }

        public ICollection<TaskTag>? TaskTags { get; set; }
        public ICollection<TimeTracking>? TimeTrackings { get; set; }
    }
}
//public int Id { get; set; }

//[Required, MaxLength(200)]
//public string Title { get; set; }

//[MaxLength(2000)]
//public string ?Description { get; set; }

//public DateTime? Date { get; set; }

//public TimeSpan? Time { get; set; }

//[Required, MaxLength(20)]
//public string Priority { get; set; } = null!;

//[Required, MaxLength(20)]
//public string Status { get; set; }= null!;
////////////////////////////////////////////