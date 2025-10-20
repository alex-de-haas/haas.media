using System.ComponentModel.DataAnnotations;

namespace Haas.Media.Services.Metadata;

public class UpdateLibraryRequest
{
    [Required]
    public LibraryType Type { get; set; }
    
    [Required]
    public required string DirectoryPath { get; set; }
    
    [Required]
    public required string Title { get; set; }
    
    public string? Description { get; set; }
}

