using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using LiteDB;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

namespace Haas.Media.Services.Authentication;

public class AuthenticationService(LiteDatabase db, IConfiguration configuration, ILogger<AuthenticationService> logger) : IAuthenticationApi
{
    private readonly ILiteCollection<User> _users = db.GetCollection<User>("users");
    private readonly PasswordHasher<User> _passwordHasher = new();
    private const string DefaultCountryCode = "US";

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest request)
    {
        // Validate input
        if (string.IsNullOrWhiteSpace(request.Username) || request.Username.Length < 3)
        {
            logger.LogWarning("Registration failed: Invalid username");
            return null;
        }

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
        {
            logger.LogWarning("Registration failed: Password too short");
            return null;
        }

        // Check if user already exists
        var existingUser = _users.FindOne(u => u.Username == request.Username);
        if (existingUser != null)
        {
            logger.LogWarning("Registration failed: User already exists");
            return null;
        }

        // Check if this is the first user
        var isFirstUser = _users.Count() == 0;
        var preferredLanguage = NormalizeLanguage(request.PreferredMetadataLanguage);
        var countryCode = NormalizeCountryCode(request.CountryCode, DefaultCountryCode);

        // Create user with placeholder password hash (will be set immediately after)
        var user = new User
        {
            Username = request.Username,
            PasswordHash = string.Empty, // Temporary, will be replaced below
            IsAdmin = isFirstUser,
            CreatedAt = DateTime.UtcNow,
            PreferredMetadataLanguage = preferredLanguage,
            CountryCode = countryCode
        };

        // Hash password using ASP.NET Core Identity's PasswordHasher
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        _users.Insert(user);
        _users.EnsureIndex(u => u.Username);

        logger.LogInformation("User registered: {Username} (Admin: {IsAdmin})", user.Username, user.IsAdmin);

        // Generate token
        var token = GenerateJwtToken(user);
        user.CountryCode ??= DefaultCountryCode;

        return new AuthResponse(
            token,
            user.Username,
            user.PreferredMetadataLanguage ?? "en",
            user.CountryCode
        );
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            logger.LogWarning("Login failed: Invalid credentials format");
            return null;
        }

        // Find user by username
        var user = _users.FindOne(u => u.Username == request.Username);
        if (user == null)
        {
            logger.LogWarning("Login failed: User not found");
            return null;
        }

        // Verify password using ASP.NET Core Identity's PasswordHasher
        var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            logger.LogWarning("Login failed: Invalid password for user {Username}", user.Username);
            return null;
        }

        // Update last login and ensure country code is set
        user.LastLoginAt = DateTime.UtcNow;
        user.CountryCode ??= DefaultCountryCode;
        _users.Update(user);

        logger.LogInformation("User logged in: {Username}", user.Username);

        // Generate token
        var token = GenerateJwtToken(user);

        return new AuthResponse(
            token,
            user.Username,
            user.PreferredMetadataLanguage ?? "en",
            user.CountryCode
        );
    }

    public async Task<User?> GetUserByUsernameAsync(string username)
    {
        return _users.FindOne(u => u.Username == username);
    }

    public Task<IReadOnlyList<User>> GetAllUsersAsync()
    {
        var users = _users.FindAll().ToList();
        return Task.FromResult<IReadOnlyList<User>>(users);
    }

    public async Task<AuthResponse?> UpdateProfileAsync(string username, UpdateProfileRequest request)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            logger.LogWarning("Profile update failed: username missing");
            return null;
        }

        var user = _users.FindOne(u => u.Username == username);
        if (user == null)
        {
            logger.LogWarning("Profile update failed: user {Username} not found", username);
            return null;
        }

        var preferredLanguage = NormalizeLanguage(request.PreferredMetadataLanguage);
        user.PreferredMetadataLanguage = preferredLanguage;

        if (request.CountryCode is not null)
        {
            user.CountryCode = NormalizeCountryCode(
                request.CountryCode,
                user.CountryCode ?? DefaultCountryCode
            );
        }
        else if (string.IsNullOrWhiteSpace(user.CountryCode))
        {
            user.CountryCode = DefaultCountryCode;
        }
        _users.Update(user);

        var token = GenerateJwtToken(user);
        return new AuthResponse(
            token,
            user.Username,
            user.PreferredMetadataLanguage ?? "en",
            user.CountryCode
        );
    }

    public async Task<bool> UpdatePasswordAsync(string username, UpdatePasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            logger.LogWarning("Password update failed: username missing");
            return false;
        }

        var user = _users.FindOne(u => u.Username == username);
        if (user == null)
        {
            logger.LogWarning("Password update failed: user {Username} not found", username);
            return false;
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
        {
            logger.LogWarning("Password update failed for {Username}: password too short", username);
            return false;
        }

        // Verify current password using ASP.NET Core Identity's PasswordHasher
        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
        {
            logger.LogWarning("Password update failed for {Username}: current password missing", username);
            return false;
        }

        var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword);
        if (result == PasswordVerificationResult.Failed)
        {
            logger.LogWarning("Password update failed for {Username}: current password invalid", username);
            return false;
        }

        // Hash new password
        user.PasswordHash = _passwordHasher.HashPassword(user, request.NewPassword);
        _users.Update(user);

        logger.LogInformation("Password updated for user {Username}", username);
        return true;
    }

    private string GenerateJwtToken(User user)
    {
        var jwtSecret = configuration["JWT_SECRET"];
        if (string.IsNullOrWhiteSpace(jwtSecret))
        {
            throw new InvalidOperationException("JWT_SECRET is not configured");
        }

        var jwtIssuer = configuration["JWT_ISSUER"] ?? "haas-media-local";
        var jwtAudience = configuration["JWT_AUDIENCE"] ?? "haas-media-api";
        var jwtExpirationMinutes = int.Parse(configuration["JWT_EXPIRATION_MINUTES"] ?? "1440"); // 24 hours default

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim("auth_type", "local"),
            new Claim(ClaimTypes.Role, user.IsAdmin ? "Admin" : "User"),
            new Claim("preferred_language", user.PreferredMetadataLanguage ?? "en"),
            new Claim("country_code", user.CountryCode ?? DefaultCountryCode)
        };

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(jwtExpirationMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string NormalizeLanguage(string? language)
    {
        if (string.IsNullOrWhiteSpace(language))
        {
            return "en";
        }

        return language.Trim();
    }

    private static string NormalizeCountryCode(string? countryCode, string fallback)
    {
        if (string.IsNullOrWhiteSpace(countryCode))
        {
            return fallback;
        }

        var normalized = countryCode.Trim().ToUpperInvariant();
        if (normalized.Length != 2 || normalized.Any(ch => ch is < 'A' or > 'Z'))
        {
            return fallback;
        }

        return normalized;
    }
}
