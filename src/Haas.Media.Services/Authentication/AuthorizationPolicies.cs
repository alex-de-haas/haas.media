namespace Haas.Media.Services.Authentication;

/// <summary>
/// Authorization policy names used throughout the application.
/// </summary>
public static class AuthorizationPolicies
{
    /// <summary>
    /// Standard policy requiring any authenticated user (JWT or external token).
    /// </summary>
    public const string Authenticated = "Authenticated";

    /// <summary>
    /// Policy that only allows JWT token authentication (no external tokens).
    /// </summary>
    public const string JwtOnly = "JwtOnly";

    /// <summary>
    /// Policy that allows external token authentication (and JWT tokens).
    /// </summary>
    public const string AllowExternalToken = "AllowExternalToken";
}
