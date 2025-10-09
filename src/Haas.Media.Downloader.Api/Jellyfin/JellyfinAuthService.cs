using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Security.Cryptography;
using Haas.Media.Downloader.Api.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;
using Microsoft.IdentityModel.Tokens;

namespace Haas.Media.Downloader.Api.Jellyfin;

public class JellyfinAuthService
{
    private readonly IAuthenticationApi _authenticationApi;
    private readonly ILogger<JellyfinAuthService> _logger;
    private readonly JwtSecurityTokenHandler _tokenHandler = new();
    private readonly TokenValidationParameters? _tokenValidationParameters;
    private readonly string _serverVersion;
    private readonly string _serverId;
    private readonly string _dataDirectory;

    public JellyfinAuthService(
        IAuthenticationApi authenticationApi,
        IConfiguration configuration,
        ILogger<JellyfinAuthService> logger
    )
    {
        _authenticationApi = authenticationApi;
        _logger = logger;

        _dataDirectory =
            configuration["DATA_DIRECTORY"]
            ?? throw new InvalidOperationException("DATA_DIRECTORY is not configured.");
        _serverId = JellyfinService.ComputeServerId(_dataDirectory);
        _serverVersion = typeof(JellyfinAuthService).Assembly.GetName().Version?.ToString() ?? "0.0.0";

        var jwtSecret = configuration["JWT_SECRET"];
        if (!string.IsNullOrWhiteSpace(jwtSecret))
        {
            var issuer = configuration["JWT_ISSUER"] ?? "haas-media-local";
            var audience = configuration["JWT_AUDIENCE"] ?? "haas-media-api";
            _tokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = issuer,
                ValidateAudience = true,
                ValidAudience = audience,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                ClockSkew = TimeSpan.FromMinutes(2)
            };
        }
    }

    public JellyfinClientInfo GetClientInfo(HttpRequest request)
    {
        var (token, client) = ParseAuthorizationHeader(request.Headers["X-Emby-Authorization"]);
        if (!string.IsNullOrWhiteSpace(token))
        {
            request.HttpContext.Items["jellyfin.token.from-header"] = token;
        }

        if (client != null)
        {
            return client;
        }

        string? device = request.Headers["X-Emby-Device"].FirstOrDefault()
            ?? request.Headers["X-MediaBrowser-Device"].FirstOrDefault();
        string? deviceId = request.Headers["X-Emby-Device-Id"].FirstOrDefault()
            ?? request.Headers["X-MediaBrowser-Device-Id"].FirstOrDefault();
        string? clientName = request.Headers["X-Emby-Client"].FirstOrDefault()
            ?? request.Headers["X-MediaBrowser-Client"].FirstOrDefault();
        string? version = request.Headers["X-Emby-Client-Version"].FirstOrDefault()
            ?? request.Headers["X-MediaBrowser-Client-Version"].FirstOrDefault();

        return new JellyfinClientInfo(clientName, device, deviceId, version);
    }

    public async Task<User?> AuthenticateRequestAsync(HttpRequest request, CancellationToken cancellationToken = default)
    {
        var token = ExtractAccessToken(request);
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        if (_tokenValidationParameters is null)
        {
            _logger.LogWarning("JWT secret is not configured; Jellyfin token validation is unavailable.");
            return null;
        }

        try
        {
            var principal = _tokenHandler.ValidateToken(token, _tokenValidationParameters, out _);
            var username =
                principal.FindFirstValue(JwtRegisteredClaimNames.UniqueName)
                ?? principal.Identity?.Name
                ?? principal.FindFirstValue(ClaimTypes.Name);

            if (string.IsNullOrWhiteSpace(username))
            {
                return null;
            }

            return await _authenticationApi.GetUserByUsernameAsync(username);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to validate Jellyfin access token");
            return null;
        }
    }

    public async Task<JellyfinAuthenticateResponse?> AuthenticateAsync(
        JellyfinAuthenticateRequest request,
        JellyfinClientInfo clientInfo,
        CancellationToken cancellationToken = default
    )
    {
        if (string.IsNullOrWhiteSpace(request.Username))
        {
            return null;
        }

        var password = request.Pw ?? request.Password;
        if (string.IsNullOrWhiteSpace(password))
        {
            return null;
        }

        var authResponse = await _authenticationApi.LoginAsync(new LoginRequest(request.Username, password));

        if (authResponse is null)
        {
            return null;
        }

        var user = await _authenticationApi.GetUserByUsernameAsync(authResponse.Username);
        if (user is null)
        {
            return null;
        }

        var mergedClientInfo = clientInfo with
        {
            DeviceId = request.DeviceId ?? clientInfo.DeviceId ?? GenerateDeviceId(user.Id),
            Device = request.DeviceName ?? clientInfo.Device ?? clientInfo.Client,
            Client = clientInfo.Client ?? "Jellyfin Client",
            Version = clientInfo.Version ?? _serverVersion,
        };

        var session = CreateSessionInfo(user, mergedClientInfo);
        var userContract = CreateUserContract(user);

        return new JellyfinAuthenticateResponse
        {
            AccessToken = authResponse.Token,
            User = userContract,
            SessionInfo = session,
        };
    }

    public JellyfinUserContract CreateUserContract(User user)
    {
        return new JellyfinUserContract
        {
            Id = user.Id,
            Name = user.Username,
            PrimaryImageTag = null,
            ServerId = _serverId,
        };
    }

    public JellyfinSessionInfo CreateSessionInfo(User user, JellyfinClientInfo clientInfo)
    {
        var deviceId = clientInfo.DeviceId ?? GenerateDeviceId(user.Id);
        var deviceName = clientInfo.Device ?? clientInfo.Client ?? "Unknown Device";
        var clientName = clientInfo.Client ?? "Jellyfin Client";
        var version = clientInfo.Version ?? _serverVersion;

        return new JellyfinSessionInfo
        {
            Id = GenerateSessionId(user.Id, deviceId),
            DeviceId = deviceId,
            DeviceName = deviceName,
            Client = clientName,
            UserId = user.Id,
            UserName = user.Username,
            ApplicationVersion = version,
            ServerId = _serverId,
        };
    }

    public string? ExtractAccessToken(HttpRequest request)
    {
        if (request.HttpContext.Items.TryGetValue("jellyfin.token.from-header", out var tokenObj)
            && tokenObj is string cachedToken
            && !string.IsNullOrWhiteSpace(cachedToken))
        {
            return cachedToken;
        }

        if (TryGetFirstNonEmpty(request.Headers, "X-MediaBrowser-Token", out var token)
            || TryGetFirstNonEmpty(request.Headers, "X-Emby-Token", out token))
        {
            return token;
        }

        if (request.Query.TryGetValue("api_key", out var apiKeyValues))
        {
            var apiKey = apiKeyValues.FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                return apiKey;
            }
        }

        var (headerToken, _) = ParseAuthorizationHeader(request.Headers["X-Emby-Authorization"]);
        if (!string.IsNullOrWhiteSpace(headerToken))
        {
            return headerToken;
        }

        if (request.Headers.TryGetValue("Authorization", out var authorizationValues))
        {
            var authorization = authorizationValues.FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(authorization))
            {
                if (authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    return authorization["Bearer ".Length..].Trim();
                }

                if (authorization.StartsWith("MediaBrowser ", StringComparison.OrdinalIgnoreCase))
                {
                    var tuple = ParseAuthorizationHeader(new StringValues(authorization));
                    if (!string.IsNullOrWhiteSpace(tuple.Token))
                    {
                        return tuple.Token;
                    }
                }
            }
        }

        return null;
    }

    private static (string? Token, JellyfinClientInfo? ClientInfo) ParseAuthorizationHeader(StringValues headerValues)
    {
        var headerValue = headerValues.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(headerValue))
        {
            return (null, null);
        }

        var trimmed = headerValue.Trim();
        if (trimmed.StartsWith("MediaBrowser", StringComparison.OrdinalIgnoreCase))
        {
            var parameters = trimmed["MediaBrowser".Length..].Trim();
            var parts = parameters.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
            string? client = null;
            string? device = null;
            string? deviceId = null;
            string? version = null;
            string? token = null;

            foreach (var part in parts)
            {
                var kvp = part.Split('=', 2, StringSplitOptions.TrimEntries);
                if (kvp.Length != 2)
                {
                    continue;
                }

                var key = kvp[0];
                var value = kvp[1].Trim().Trim('"');

                switch (key.ToLowerInvariant())
                {
                    case "client":
                        client = value;
                        break;
                    case "device":
                        device = value;
                        break;
                    case "deviceid":
                        deviceId = value;
                        break;
                    case "version":
                        version = value;
                        break;
                    case "token":
                        token = value;
                        break;
                }
            }

            var clientInfo = new JellyfinClientInfo(client, device, deviceId, version);
            return (token, clientInfo);
        }

        return (null, null);
    }

    private static bool TryGetFirstNonEmpty(IHeaderDictionary headers, string key, out string? value)
    {
        if (headers.TryGetValue(key, out var values))
        {
            var candidate = values.FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(candidate))
            {
                value = candidate;
                return true;
            }
        }

        value = null;
        return false;
    }

    private static string GenerateSessionId(string userId, string deviceId)
    {
        using var sha = SHA256.Create();
        var payload = Encoding.UTF8.GetBytes($"{userId}:{deviceId}");
        var hash = sha.ComputeHash(payload);
        return Convert.ToHexString(hash)[..16];
    }

    private static string GenerateDeviceId(string seed)
    {
        using var sha = SHA256.Create();
        var payload = Encoding.UTF8.GetBytes($"{seed}:{Guid.NewGuid():N}");
        var hash = sha.ComputeHash(payload);
        return Convert.ToHexString(hash)[..16];
    }
}
