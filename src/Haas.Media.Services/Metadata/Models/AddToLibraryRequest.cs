using System.ComponentModel.DataAnnotations;

namespace Haas.Media.Services.Metadata;

public class AddToLibraryRequest
{
    [Required]
    public required LibraryType Type { get; set; }

    [Required]
    public required int Id { get; set; }
}
