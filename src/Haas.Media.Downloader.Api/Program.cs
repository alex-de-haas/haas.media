using Haas.Media.Core.FFMpeg;
using Haas.Media.Downloader.Api.Encodings;
using Haas.Media.Downloader.Api.Files;
using Haas.Media.Downloader.Api.Torrents;
using Haas.Media.ServiceDefaults;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add default service configurations.
builder.AddServiceDefaults();

builder.AddEncoding();
builder.AddFiles();
builder.AddTorrent();

// Add services to the container.
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
            };
        });

    builder.Services.AddAuthorization();
}

var origins = builder.Configuration.GetSection("AllowedCorsOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

var logger = app.Services.GetRequiredService<ILogger<Program>>();
logger.LogInformation(Environment.CurrentDirectory);
logger.LogInformation(GlobalFFOptions.Current.BinaryFolder);

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// app.UseHttpsRedirection();

app.UseCors();

// Auth
if (!string.IsNullOrWhiteSpace(auth0Domain) && !string.IsNullOrWhiteSpace(auth0Audience))
{
    app.UseAuthentication();
    app.UseAuthorization();
}

app.MapDefaultEndpoints();

app.UseEncoding();
app.UseFiles();
app.UseTorrent();

app.Run();
