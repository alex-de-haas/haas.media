using Haas.Media.Services.Authentication;

namespace Haas.Media.Services.Jellyfin;

public static class HttpContextExtensions
{
    private const string AuthenticatedUserKey = "JellyfinAuthenticatedUser";

    /// <summary>
    /// Gets the authenticated user from the HttpContext.Items dictionary.
    /// This user is set by the JellyfinAuthFilter during request authentication.
    /// </summary>
    /// <param name="context">The HTTP context</param>
    /// <returns>The authenticated user</returns>
    /// <exception cref="InvalidOperationException">Thrown when the user is not authenticated</exception>
    public static User GetAuthenticatedUser(this HttpContext context)
    {
        return context.Items[AuthenticatedUserKey] as User
            ?? throw new InvalidOperationException("User not authenticated");
    }

    /// <summary>
    /// Sets the authenticated user in the HttpContext.Items dictionary.
    /// This is used internally by the JellyfinAuthFilter.
    /// </summary>
    /// <param name="context">The HTTP context</param>
    /// <param name="user">The authenticated user</param>
    internal static void SetAuthenticatedUser(this HttpContext context, User user)
    {
        context.Items[AuthenticatedUserKey] = user;
    }
}
