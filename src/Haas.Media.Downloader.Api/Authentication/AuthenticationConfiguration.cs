namespace Haas.Media.Downloader.Api.Authentication;

public static class AuthenticationConfiguration
{
    public static WebApplicationBuilder AddLocalAuthentication(this WebApplicationBuilder builder)
    {
        builder.Services.AddScoped<IAuthenticationApi, AuthenticationService>();
        return builder;
    }

    public static WebApplication UseLocalAuthentication(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Authentication");

        group.MapPost("/register", async (RegisterRequest request, IAuthenticationApi authService) =>
        {
            var response = await authService.RegisterAsync(request);
            return response != null ? Results.Ok(response) : Results.BadRequest(new { error = "Registration failed" });
        })
        .AllowAnonymous()
        .WithName("Register");

        group.MapPost("/login", async (LoginRequest request, IAuthenticationApi authService) =>
        {
            var response = await authService.LoginAsync(request);
            return response != null ? Results.Ok(response) : Results.Unauthorized();
        })
        .AllowAnonymous()
        .WithName("Login");

        group.MapGet("/me", async (HttpContext context, IAuthenticationApi authService) =>
        {
            var username = context.User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
            {
                return Results.Unauthorized();
            }

            var user = await authService.GetUserByUsernameAsync(username);
            if (user == null)
            {
                return Results.NotFound();
            }

            return Results.Ok(new { user.Username, user.Email, user.CreatedAt, user.LastLoginAt });
        })
        .RequireAuthorization()
        .WithName("GetCurrentUser");

        return app;
    }
}
