using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using LiteDB;
using Microsoft.IdentityModel.Tokens;

namespace Haas.Media.Downloader.Api.Authentication;

public class AuthenticationService(LiteDatabase db, IConfiguration configuration, ILogger<AuthenticationService> logger) : IAuthenticationApi
{
    private readonly ILiteCollection<User> _users = db.GetCollection<User>("users");
    private const int WorkFactor = 12; // BCrypt work factor

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest request)
    {
        // Validate input
        if (string.IsNullOrWhiteSpace(request.Username) || request.Username.Length < 3)
        {
            logger.LogWarning("Registration failed: Invalid username");
            return null;
        }

        if (string.IsNullOrWhiteSpace(request.Email) || !IsValidEmail(request.Email))
        {
            logger.LogWarning("Registration failed: Invalid email");
            return null;
        }

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
        {
            logger.LogWarning("Registration failed: Password too short");
            return null;
        }

        // Check if user already exists
        var existingUser = _users.FindOne(u => u.Username == request.Username || u.Email == request.Email);
        if (existingUser != null)
        {
            logger.LogWarning("Registration failed: User already exists");
            return null;
        }

        // Hash password
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, WorkFactor);

        // Create user
        var user = new User
        {
            Username = request.Username,
            Email = request.Email,
            PasswordHash = passwordHash,
            CreatedAt = DateTime.UtcNow
        };

        _users.Insert(user);
        _users.EnsureIndex(u => u.Username);
        _users.EnsureIndex(u => u.Email);

        logger.LogInformation("User registered: {Username}", user.Username);

        // Generate token
        var token = GenerateJwtToken(user);
        return new AuthResponse(token, user.Username, user.Email);
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            logger.LogWarning("Login failed: Invalid credentials format");
            return null;
        }

        // Find user by username or email
        var user = _users.FindOne(u => u.Username == request.Username || u.Email == request.Username);
        if (user == null)
        {
            logger.LogWarning("Login failed: User not found");
            return null;
        }

        // Verify password
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            logger.LogWarning("Login failed: Invalid password for user {Username}", user.Username);
            return null;
        }

        // Update last login
        user.LastLoginAt = DateTime.UtcNow;
        _users.Update(user);

        logger.LogInformation("User logged in: {Username}", user.Username);

        // Generate token
        var token = GenerateJwtToken(user);
        return new AuthResponse(token, user.Username, user.Email);
    }

    public async Task<User?> GetUserByUsernameAsync(string username)
    {
        return _users.FindOne(u => u.Username == username);
    }

    public async Task<User?> GetUserByEmailAsync(string email)
    {
        return _users.FindOne(u => u.Email == email);
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
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim("auth_type", "local")
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

    private static bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }
}
