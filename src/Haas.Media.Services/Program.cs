using System.Text;
using Haas.Media.Core.FFMpeg;
using Haas.Media.Services.Authentication;
using Haas.Media.Services.Encodings;
using Haas.Media.Services.Files;
using Haas.Media.Services.GlobalSettings;
using Haas.Media.Services.Infrastructure;
using Haas.Media.Services.Infrastructure.BackgroundTasks;
using Haas.Media.Services.Jellyfin;
using Haas.Media.Services.Metadata;
using Haas.Media.Services.Nodes;
using Haas.Media.Services.Torrents;
using LiteDB;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
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
builder.Services.AddHttpClient();

var databaseDirectory = Path.Combine(dataDirectory, ".db");
Directory.CreateDirectory(databaseDirectory);
var databasePath = Path.Combine(databaseDirectory, "common.db");
builder.Services.AddSingleton(_ => new LiteDatabase($"Filename={databasePath};Connection=shared;"));

builder.AddEncoding();
builder.AddFiles();
builder.AddGlobalSettings();
builder.AddMetadata();
builder.AddNodes();
builder.AddTorrent();
builder.AddLocalAuthentication();
builder.AddJellyfin();

// Add services to the container.
builder.Services.AddControllers();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddSignalR();

// Authentication Configuration - Hybrid JWT + External Tokens
var jwtSecret = builder.Configuration["JWT_SECRET"];

if (!string.IsNullOrWhiteSpace(jwtSecret))
{
    var jwtIssuer = builder.Configuration["JWT_ISSUER"] ?? "haas-media-local";
    var jwtAudience = builder.Configuration["JWT_AUDIENCE"] ?? "haas-media-api";

    builder
        .Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddScheme<JwtBearerOptions, HybridAuthenticationHandler>(
            JwtBearerDefaults.AuthenticationScheme,
            options =>
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
                        var logger = context.HttpContext.RequestServices.GetRequiredService<
                            ILogger<Program>
                        >();
                        logger.LogError(
                            "Authentication failed for {Path}: {Exception}",
                            context.HttpContext.Request.Path,
                            context.Exception.Message
                        );
                        return Task.CompletedTask;
                    },
                };
            }
        );

    // Configure authorization policies
    builder
        .Services.AddAuthorizationBuilder()
        .AddPolicy(AuthorizationPolicies.Authenticated, policy => policy.RequireAuthenticatedUser())
        .AddPolicy(
            AuthorizationPolicies.JwtOnly,
            policy => policy.AddRequirements(new JwtOnlyRequirement())
        )
        .AddPolicy(
            AuthorizationPolicies.AllowExternalToken,
            policy => policy.RequireAuthenticatedUser()
        );

    // Register authorization handlers
    builder.Services.AddSingleton<IAuthorizationHandler, JwtOnlyRequirementHandler>();
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
logger.LogInformation("Data Directory: {DataDirectory}", dataDirectory);
logger.LogInformation("Database Path: {DatabasePath}", databasePath);

// Log Authentication configuration
if (!string.IsNullOrWhiteSpace(jwtSecret))
{
    logger.LogInformation("🔐 Local JWT Authentication ENABLED");
    logger.LogInformation(
        "   Issuer: {Issuer}",
        builder.Configuration["JWT_ISSUER"] ?? "haas-media-local"
    );
    logger.LogInformation(
        "   Audience: {Audience}",
        builder.Configuration["JWT_AUDIENCE"] ?? "haas-media-api"
    );
}
else
{
    logger.LogWarning(
        "⚠️  Authentication DISABLED - Configure JWT_SECRET to enable authentication"
    );
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
app.UseGlobalSettings();
app.UseMetadata();
app.UseNodes();
app.UseTorrent();

app.Run();
