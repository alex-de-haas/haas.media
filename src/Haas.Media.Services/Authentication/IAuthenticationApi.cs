using System.Collections.Generic;

namespace Haas.Media.Services.Authentication;

public interface IAuthenticationApi
{
    AuthResponse? Register(RegisterRequest request);
    AuthResponse? Login(LoginRequest request);
    User? GetUserByUsername(string username);
    IReadOnlyList<User> GetAllUsers();
    AuthResponse? UpdateProfile(string username, UpdateProfileRequest request);
    bool UpdatePassword(string username, UpdatePasswordRequest request);

    // External token management
    ExternalTokenResponse CreateExternalToken(User user, CreateExternalTokenRequest request);
    IReadOnlyList<ExternalTokenInfo> GetExternalTokens(User user);
    bool RevokeExternalToken(User user, string tokenId);
    User? ValidateExternalToken(string token);
}
