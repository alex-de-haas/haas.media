namespace Haas.Media.Services.GlobalSettings;

internal static class GlobalSettingsConfiguration
{
    internal static void AddGlobalSettings(this IHostApplicationBuilder builder)
    {
        builder.Services.AddScoped<IGlobalSettingsApi, GlobalSettingsService>();
    }

    internal static void UseGlobalSettings(this WebApplication app)
    {
        var api = app.MapGroup("/api/global-settings");

        api.MapGet("/", async (IGlobalSettingsApi settingsApi) =>
        {
            var settings = await settingsApi.GetSettingsAsync();
            return Results.Ok(settings);
        })
        .RequireAuthorization()
        .WithName("GetGlobalSettings")
        .WithTags("GlobalSettings");

        api.MapPut("/", async (UpdateGlobalSettingsRequest request, IGlobalSettingsApi settingsApi) =>
        {
            // Validate inputs
            if (string.IsNullOrWhiteSpace(request.PreferredMetadataLanguage))
            {
                return Results.BadRequest(new { error = "PreferredMetadataLanguage is required" });
            }

            if (string.IsNullOrWhiteSpace(request.CountryCode))
            {
                return Results.BadRequest(new { error = "CountryCode is required" });
            }

            // Validate country code format (ISO 3166-1 alpha-2)
            if (request.CountryCode.Length != 2 || !request.CountryCode.All(char.IsLetter))
            {
                return Results.BadRequest(new { error = "CountryCode must be a 2-letter ISO 3166-1 alpha-2 code" });
            }

            var settings = await settingsApi.UpdateSettingsAsync(request);
            return Results.Ok(settings);
        })
        .RequireAuthorization()
        .WithName("UpdateGlobalSettings")
        .WithTags("GlobalSettings");
    }
}
