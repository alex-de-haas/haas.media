using Haas.Media.Services.Authentication;

namespace Haas.Media.Services.Jellyfin;

internal sealed class JellyfinAuthFilter : IEndpointFilter
{
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
        httpContext.SetAuthenticatedUser(user);

        return await next(context);
    }
}
