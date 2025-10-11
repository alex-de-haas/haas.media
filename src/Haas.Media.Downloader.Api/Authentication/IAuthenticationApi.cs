using System.Collections.Generic;

namespace Haas.Media.Downloader.Api.Authentication;

public interface IAuthenticationApi
{
    Task<AuthResponse?> RegisterAsync(RegisterRequest request);
    Task<AuthResponse?> LoginAsync(LoginRequest request);
    Task<User?> GetUserByUsernameAsync(string username);
    Task<User?> GetUserByEmailAsync(string email);
    Task<IReadOnlyList<User>> GetAllUsersAsync();
    Task<AuthResponse?> UpdateProfileAsync(string username, UpdateProfileRequest request);
    Task<bool> UpdatePasswordAsync(string username, UpdatePasswordRequest request);
}
