using Haas.Media.Services.Authentication;

namespace Haas.Media.Services.Jellyfin;

internal sealed class JellyfinAuthFilter : IEndpointFilter
{
    private const string AuthenticatedUserKey = "JellyfinAuthenticatedUser";

    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next
    )
    {
        var httpContext = context.HttpContext;
        var authService = httpContext.RequestServices.GetRequiredService<JellyfinAuthService>();

        var user = await authService.AuthenticateRequestAsync(httpContext.Request);
        if (user is null)
        {
            return Results.Unauthorized();
        }

        // Store authenticated user in HttpContext.Items for endpoint access
        httpContext.Items[AuthenticatedUserKey] = user;

        return await next(context);
    }

    public static User GetAuthenticatedUser(HttpContext context)
    {
        return context.Items[AuthenticatedUserKey] as User
            ?? throw new InvalidOperationException("User not authenticated");
    }
}
