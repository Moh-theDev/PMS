using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PMS.Application.DTO.AIDto
{
    public class GeneratedAllocation
    {
        public int TaskId { get; set; }
        public string Start { get; set; } = string.Empty; // Format: "yyyy-MM-dd HH:mm"
        public string End { get; set; } = string.Empty;   // Format: "yyyy-MM-dd HH:mm"
    }
}
