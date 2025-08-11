using Haas.Media.Downloader.Api.Torrents;
using Haas.Media.ServiceDefaults;

var builder = WebApplication.CreateBuilder(args);

// Add default service configurations.
builder.AddServiceDefaults();

builder.AddTorrent();

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddSignalR();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins("http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// app.UseHttpsRedirection();

app.UseCors();

app.MapDefaultEndpoints();

app.UseTorrent();

app.Run();
