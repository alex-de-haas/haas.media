using Microsoft.AspNetCore.Authorization;

namespace Haas.Media.Services.Authentication;

/// <summary>
/// Authorization requirement that enforces JWT-only authentication (no external tokens).
/// </summary>
public class JwtOnlyRequirement : IAuthorizationRequirement { }

/// <summary>
/// Handler for JwtOnlyRequirement that checks if the user authenticated with a JWT token.
/// </summary>
public class JwtOnlyRequirementHandler : AuthorizationHandler<JwtOnlyRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        JwtOnlyRequirement requirement
    )
    {
        // Check if user is authenticated
        if (!context.User.Identity?.IsAuthenticated ?? true)
        {
            return Task.CompletedTask;
        }

        // Check if user authenticated with external token
        var authType = context.User.FindFirst("auth_type")?.Value;
        if (authType == "external_token")
        {
            // Fail - external tokens are not allowed
            context.Fail();
            return Task.CompletedTask;
        }

        // Success - user authenticated with JWT
        context.Succeed(requirement);
        return Task.CompletedTask;
    }
}
