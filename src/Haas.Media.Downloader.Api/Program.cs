using Haas.Media.Core.FFMpeg;
using Haas.Media.Downloader.Api.Encodings;
using Haas.Media.Downloader.Api.Files;
using Haas.Media.Downloader.Api.Infrastructure;
using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;
using Haas.Media.Downloader.Api.Metadata;
using Haas.Media.Downloader.Api.Torrents;
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

var databaseDirectory = Path.Combine(dataDirectory, ".db");
Directory.CreateDirectory(databaseDirectory);
var databasePath = Path.Combine(databaseDirectory, "common.db");
builder.Services.AddSingleton(_ => new LiteDatabase($"Filename={databasePath};Connection=shared;"));

builder.AddEncoding();
builder.AddFiles();
builder.AddMetadata();
builder.AddTorrent();

// Add services to the container.
builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddSignalR();

// Auth0 Authentication
var auth0Domain = builder.Configuration["AUTH0_DOMAIN"];
var auth0Audience = builder.Configuration["AUTH0_AUDIENCE"];

if (!string.IsNullOrWhiteSpace(auth0Domain) && !string.IsNullOrWhiteSpace(auth0Audience))
{
    builder
        .Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.Authority = $"https://{auth0Domain}";
            options.Audience = auth0Audience;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
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
                OnTokenValidated = context =>
                {
                    var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                    logger.LogInformation(
                        "Token validated successfully for {Path}",
                        context.HttpContext.Request.Path
                    );
                    return Task.CompletedTask;
                },
                OnChallenge = context =>
                {
                    var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                    logger.LogWarning(
                        "Auth challenge for {Path}: {Error} - {ErrorDescription}",
                        context.HttpContext.Request.Path,
                        context.Error,
                        context.ErrorDescription
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

// Log Auth0 configuration
if (!string.IsNullOrWhiteSpace(auth0Domain) && !string.IsNullOrWhiteSpace(auth0Audience))
{
    logger.LogInformation("🔐 Auth0 Authentication ENABLED");
    logger.LogInformation("   Domain: {Domain}", auth0Domain);
    logger.LogInformation("   Audience: {Audience}", auth0Audience);
    logger.LogInformation("   Authority: https://{Domain}", auth0Domain);
}
else
{
    logger.LogWarning("⚠️  Auth0 Authentication DISABLED - Missing AUTH0_DOMAIN or AUTH0_AUDIENCE");
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// app.UseHttpsRedirection();

app.UseCors();

app.UseMiddleware<GlobalExceptionHandlingMiddleware>();

// Auth
if (!string.IsNullOrWhiteSpace(auth0Domain) && !string.IsNullOrWhiteSpace(auth0Audience))
{
    app.UseAuthentication();
    app.UseAuthorization();
}

app.MapDefaultEndpoints();

app.MapControllers();

app.UseEncoding();
app.UseBackgroundTasks();
app.UseFiles();
app.UseMetadata();
app.UseTorrent();

app.Run();
