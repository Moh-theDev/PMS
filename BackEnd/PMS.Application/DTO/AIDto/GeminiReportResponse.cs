using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace PMS.Application.DTO.AIDto
{
    public class GeminiReportResponse
    {
        [JsonPropertyName("productivityScore")]
        public float ProductivityScore { get; set; }

        [JsonPropertyName("content")]
        public string Content { get; set; } = null!;
    }
}
