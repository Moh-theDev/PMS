using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PMS.Domain.Entities
{
    public class AiReport
    {
        public int Id { get; set; }

        public int UserId { get; set; }
        public User? User { get; set; }

        public string? Type { get; set; }

        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }

        [Range(0, 100)]
        public float ProductivityScore { get; set; }

        [Range(0, int.MaxValue)]
        public int? FocusTime { get; set; }

        [Range(0, int.MaxValue)]
        public int? CompletedTasks { get; set; }

        [Range(0, int.MaxValue)]
        public int? PendingTasks { get; set; }

        public string? Problems { get; set; }
        public string? Suggestions { get; set; }
        public string? Recommendations { get; set; }

        public string? MotivationalMessage { get; set; }

        public string Content { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
