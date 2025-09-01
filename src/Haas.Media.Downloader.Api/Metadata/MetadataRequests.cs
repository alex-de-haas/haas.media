using System.ComponentModel.DataAnnotations;

namespace Haas.Media.Downloader.Api.Metadata;

public class CreateLibraryRequest
{
    [Required]
    public required string DirectoryPath { get; set; }
    
    [Required]
    public required string Title { get; set; }
    
    public string? Description { get; set; }
}

public class UpdateLibraryRequest
{
    [Required]
    public required string DirectoryPath { get; set; }
    
    [Required]
    public required string Title { get; set; }
    
    public string? Description { get; set; }
}
