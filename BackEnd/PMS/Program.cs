using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using PMS.Application.Behaviors;
using PMS.Application.Interfaces.Repositories;
using PMS.Application.Interfaces.Services;
using PMS.Application.Options;
using PMS.Application.Services.AuthService;
using PMS.Application.Services.categoryser;
using PMS.Application.Services.tagservices;
using PMS.Application.Services.taskservices;
using PMS.Application.Services.TimeTrackingServices;
using PMS.Application.Services.userser;
using PMS.Domain.Entities;
using PMS.Infrastructre.AiSetting;
using PMS.Infrastructre.Data;
using PMS.Infrastructre.Interfaces;
using PMS.Infrastructre.Repository;
using PMS.Infrastructre.Services.AuthService;
using PMS.Infrastructre.Services.GeminiService;
using PMS.Infrastructre.Services.UnitOfWork;
using System.Text;


namespace PMS
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.

            builder.Services.AddControllers();
            // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
            builder.Services.AddEndpointsApiExplorer();
            //builder.Services.AddSwaggerGen();
            builder.Services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = "PMS API",
                    Version = "v1"
                });
            });

            var jwtOptions = builder.Configuration.GetSection("Jwt").Get<JwtOptions>()
                         ?? throw new InvalidOperationException("JWT configuration is missing");
            builder.Services.AddSingleton(jwtOptions);

            builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));

            builder.Services.AddDbContext<AppDbContext>(options =>
             options.UseSqlServer(builder.Configuration.GetConnectionString("cs")));
        
            builder.Services.AddAuthentication().AddJwtBearer(JwtBearerDefaults.AuthenticationScheme,
               options =>
               {
                   options.SaveToken = true;
                   options.TokenValidationParameters = new TokenValidationParameters
                   {

                       ValidateIssuer = true,
                       ValidateAudience = true,
                       ValidateIssuerSigningKey = true,

                       ValidIssuer = jwtOptions.Issuer,
                       ValidAudience = jwtOptions.Audience,
                       IssuerSigningKey = new SymmetricSecurityKey(
                           Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
                       ValidateLifetime = true
                   };
                  //  builder.Services.AddEndpointsApiExplorer();
                   options.Events = new JwtBearerEvents
                   {

                       OnMessageReceived = context =>
                       {
                           context.Token = context.Request.Cookies["Token"];

                           return Task.CompletedTask;
                       }
                   };
               });



            //active identity


            builder.Services.AddDataProtection();

            builder.Services.AddIdentityCore<AppUser>(options =>
            {
                options.Password.RequiredLength = 8;
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireNonAlphanumeric = true;

                options.User.RequireUniqueEmail = true;

                options.User.AllowedUserNameCharacters =
                    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";

                options.SignIn.RequireConfirmedEmail = true;
                options.SignIn.RequireConfirmedPhoneNumber = true;
            })
            .AddRoles<IdentityRole>()
            .AddEntityFrameworkStores<AppDbContext>().AddDefaultTokenProviders();
            /////////////////////////
            builder.Services.Configure<GeminiSettings>(builder.Configuration.GetSection("Gemini"));
            ////////////////////////
            builder.Services.AddScoped<IAuthService, AuthService>();
            builder.Services.AddScoped<IunitOfWork, UnitOfWork>();
            builder.Services.AddScoped(typeof(Irepsitory<>), typeof(ReposetoryGeneric<>));
            builder.Services.AddScoped<ITokenService, TokenServices>();
            builder.Services.AddScoped<ICategoryService, Categoryservice>();
            builder.Services.AddScoped<ITagServices, TagService>();
            builder.Services.AddScoped<ITaskService, TaskServices>();
            builder.Services.AddScoped<ITimeTrackingService, TimeTrackingServices>();
            builder.Services.AddScoped<IUserServices, UserServices>();
            builder.Services.AddHttpClient<GeminiClientService>();
            ///////////////////////////////////


            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowReactApp",
                    policy =>
                    {
                        policy.WithOrigins("http://localhost:5173")
                            .AllowAnyHeader()
                            .AllowAnyMethod()
                            .AllowCredentials();
                    });
            });
          //  builder.Services.AddOpenApi();
            // builder.Services.AddTransient(typeof(IunitOfWork<,>), typeof(UnitOfWork<,>));
            //  builder.Services.AddTransient<IStudentServices, StudentServices>();
            //builder.Services.AddMediatR(options => options.RegisterServicesFromAssembly(typeof(Application.IAssemplyMarker).Assembly));
            //builder.Services.AddValidatorsFromAssembly(typeof(Application.IAssemplyMarker).Assembly);
            // builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehaviors<,>));
  builder.Services.AddOpenApi();

           

            var app = builder.Build();
          
            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.MapOpenApi();
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();

            app.UseCors("AllowReactApp");
            app.UseAuthentication();
            app.UseAuthorization();


            app.MapControllers();

            app.Run();
        }
    }
}
