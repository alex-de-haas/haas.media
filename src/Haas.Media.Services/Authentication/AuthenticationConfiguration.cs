namespace Haas.Media.Services.Authentication;

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

        group
            .MapPost(
                "/register",
                (RegisterRequest request, IAuthenticationApi authService) =>
                {
                    var response = authService.Register(request);
                    return response != null
                        ? Results.Ok(response)
                        : Results.BadRequest(new { error = "Registration failed" });
                }
            )
            .AllowAnonymous()
            .WithName("Register");

        group
            .MapPost(
                "/login",
                (LoginRequest request, IAuthenticationApi authService) =>
                {
                    var response = authService.Login(request);
                    return response != null ? Results.Ok(response) : Results.Unauthorized();
                }
            )
            .AllowAnonymous()
            .WithName("Login");

        group
            .MapGet(
                "/me",
                (HttpContext context, IAuthenticationApi authService) =>
                {
                    var username = context.User.Identity?.Name;
                    if (string.IsNullOrEmpty(username))
                    {
                        return Results.Unauthorized();
                    }

                    var user = authService.GetUserByUsername(username);
                    if (user == null)
                    {
                        return Results.NotFound();
                    }

                    return Results.Ok(
                        new
                        {
                            user.Username,
                            user.CreatedAt,
                            user.LastLoginAt
                        }
                    );
                }
            )
            .RequireAuthorization()
            .WithName("GetCurrentUser");

        // Profile update endpoint removed - language/country now configured per library

        group
            .MapPut(
                "/me/password",
                (
                    HttpContext context,
                    UpdatePasswordRequest request,
                    IAuthenticationApi authService
                ) =>
                {
                    var username = context.User.Identity?.Name;
                    if (string.IsNullOrEmpty(username))
                    {
                        return Results.Unauthorized();
                    }

                    var success = authService.UpdatePassword(username, request);
                    return success
                        ? Results.NoContent()
                        : Results.BadRequest(new { error = "Password update failed" });
                }
            )
            .RequireAuthorization()
            .WithName("UpdatePassword");

        return app;
    }
}
