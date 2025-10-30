using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;

namespace Haas.Media.Services.Authentication;

/// <summary>
/// Custom authentication handler that supports both JWT tokens and external tokens.
/// JWT tokens have expiration, external tokens do not.
/// Use authorization policies to control which endpoints accept external tokens.
/// </summary>
public class HybridAuthenticationHandler : AuthenticationHandler<JwtBearerOptions>
{
    private readonly IAuthenticationApi _authenticationApi;
    private readonly JwtBearerHandler _jwtHandler;

    public HybridAuthenticationHandler(
        IOptionsMonitor<JwtBearerOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IAuthenticationApi authenticationApi
    )
        : base(options, logger, encoder)
    {
        _authenticationApi = authenticationApi;
        _jwtHandler = new JwtBearerHandler(options, logger, encoder);
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // Extract token from header or query string
        var token = ExtractToken();
        if (string.IsNullOrWhiteSpace(token))
        {
            return AuthenticateResult.NoResult();
        }

        // First, try to validate as external token
        var user = _authenticationApi.ValidateExternalToken(token);
        if (user != null)
        {
            // Create claims for the authenticated user
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim("auth_type", "external_token"),
                new Claim(ClaimTypes.Role, user.IsAdmin ? "Admin" : "User")
            };

            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme.Name);

            Logger.LogDebug("External token validated for user: {Username}", user.Username);
            return AuthenticateResult.Success(ticket);
        }

        // If not a valid external token, try JWT validation
        try
        {
            await _jwtHandler.InitializeAsync(
                new AuthenticationScheme(
                    JwtBearerDefaults.AuthenticationScheme,
                    null,
                    typeof(JwtBearerHandler)
                ),
                Context
            );
            var result = await _jwtHandler.AuthenticateAsync();

            if (result.Succeeded)
            {
                Logger.LogDebug("JWT token validated");
            }

            return result;
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "JWT authentication failed");
            return AuthenticateResult.Fail("Invalid token");
        }
    }

    private string? ExtractToken()
    {
        // Check Authorization header
        var authHeader = Request.Headers.Authorization.ToString();
        if (
            !string.IsNullOrEmpty(authHeader)
            && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
        )
        {
            return authHeader.Substring("Bearer ".Length).Trim();
        }

        // Check query string (for SignalR)
        var accessToken = Request.Query["access_token"].ToString();
        if (!string.IsNullOrEmpty(accessToken))
        {
            return accessToken;
        }

        // Check X-Api-Key header (alternative for external tokens)
        var apiKey = Request.Headers["X-Api-Key"].ToString();
        if (!string.IsNullOrEmpty(apiKey))
        {
            return apiKey;
        }

        return null;
    }
}
