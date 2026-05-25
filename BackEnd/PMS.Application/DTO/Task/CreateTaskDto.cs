using PMS.Domain.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PMS.Application.DTO.Task
{
    public class CreateTaskDto
    {
        [Required(ErrorMessage = "Title is required")]
        [MaxLength(200)]
        public string Title { get; set; } = null!;

        [MaxLength(2000)]
        public string? Description { get; set; }

        // ⏱ Core work size (AI input)
        [Required(ErrorMessage = "Duration is required")]
        [Range(1, int.MaxValue, ErrorMessage = "Duration must be greater than 0")]
        public int DurationInMinutes { get; set; }

        // 🎯 Priority (AI ranking)
        [Range(1, 10)]
        public int Priority { get; set; } = 5;

        // 🔥 Effort level (AI ranking)
        [Range(1, 5)]
        public int EffortLevel { get; set; } = 3;

        // 📌 Optional constraints
        public DateTime Deadline { get; set; }

        public DateTime? EarliestStart { get; set; }

        public DateTime? LatestEnd { get; set; }

        //public int UserId { get; set; }
        //public int? CategoryId { get; set; } 
        
        
        //[Required(ErrorMessage ="Title is required")]
        //public string Title { get; set; } = null!;
        //public string? Description { get; set; }

        //public DateTime? Date { get; set; }
        //public TimeSpan? Time { get; set; }

        //[Required(ErrorMessage = "Title is required")]
        //public string Priority { get; set; } = null!;
    }
}
