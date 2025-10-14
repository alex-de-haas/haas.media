using System.Text;
using Haas.Media.Core.FFMpeg;
using Haas.Media.Downloader.Api.Authentication;
using Haas.Media.Downloader.Api.Encodings;
using Haas.Media.Downloader.Api.Files;
using Haas.Media.Downloader.Api.Infrastructure;
using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;
using Haas.Media.Downloader.Api.Metadata;
using Haas.Media.Downloader.Api.Torrents;
using Haas.Media.Downloader.Api.Jellyfin;
using Haas.Media.ServiceDefaults;
using LiteDB;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Configure data protection to use persistent storage
var dataDirectory =
    builder.Configuration["DATA_DIRECTORY"]
    ?? throw new InvalidOperationException("DATA_DIRECTORY is not configured.");
var keysDirectory = Path.Combine(dataDirectory, ".keys");
Directory.CreateDirectory(keysDirectory);
builder.Services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(keysDirectory));

// Add default service configurations.
builder.AddServiceDefaults();

builder.Services.AddBackgroundTasks();
builder.Services.AddHttpContextAccessor();

var databaseDirectory = Path.Combine(dataDirectory, ".db");
Directory.CreateDirectory(databaseDirectory);
var databasePath = Path.Combine(databaseDirectory, "common.db");
builder.Services.AddSingleton(_ => new LiteDatabase($"Filename={databasePath};Connection=shared;"));

builder.AddEncoding();
builder.AddFiles();
builder.AddMetadata();
builder.AddTorrent();
builder.AddLocalAuthentication();
builder.AddJellyfin();

// Add services to the container.
builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddSignalR();

// Authentication Configuration - Local JWT only
var jwtSecret = builder.Configuration["JWT_SECRET"];

if (!string.IsNullOrWhiteSpace(jwtSecret))
{
    var jwtIssuer = builder.Configuration["JWT_ISSUER"] ?? "haas-media-local";
    var jwtAudience = builder.Configuration["JWT_AUDIENCE"] ?? "haas-media-api";

    builder
        .Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtIssuer,
                ValidAudience = jwtAudience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret!))
            };

            // Allow tokens via query string for WebSockets/SignalR
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    var path = context.HttpContext.Request.Path;
                    if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hub"))
                    {
                        context.Token = accessToken!;
                    }
                    return Task.CompletedTask;
                },
                OnAuthenticationFailed = context =>
                {
                    var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                    logger.LogError(
                        "Authentication failed for {Path}: {Exception}",
                        context.HttpContext.Request.Path,
                        context.Exception.Message
                    );
                    return Task.CompletedTask;
                },
            };
        });

    builder.Services.AddAuthorization();
}

var origins = builder.Configuration["ALLOWED_CORS_ORIGINS"]?.Split(',') ?? [];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
    });
});

var app = builder.Build();

var logger = app.Services.GetRequiredService<ILogger<Program>>();
logger.LogInformation(Environment.CurrentDirectory);
logger.LogInformation(GlobalFFOptions.Current.BinaryFolder);

// Log Authentication configuration
if (!string.IsNullOrWhiteSpace(jwtSecret))
{
    logger.LogInformation("🔐 Local JWT Authentication ENABLED");
    logger.LogInformation("   Issuer: {Issuer}", builder.Configuration["JWT_ISSUER"] ?? "haas-media-local");
    logger.LogInformation("   Audience: {Audience}", builder.Configuration["JWT_AUDIENCE"] ?? "haas-media-api");
}
else
{
    logger.LogWarning("⚠️  Authentication DISABLED - Configure JWT_SECRET to enable authentication");
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// app.UseHttpsRedirection();

app.UseCors();

app.UseMiddleware<GlobalExceptionHandlingMiddleware>();

// Authentication & Authorization
if (!string.IsNullOrWhiteSpace(jwtSecret))
{
    app.UseAuthentication();
    app.UseAuthorization();
}

app.MapDefaultEndpoints();

app.MapControllers();
app.UseJellyfin();

app.UseLocalAuthentication();
app.UseEncoding();
app.UseBackgroundTasks();
app.UseFiles();
app.UseMetadata();
app.UseTorrent();

app.Run();
