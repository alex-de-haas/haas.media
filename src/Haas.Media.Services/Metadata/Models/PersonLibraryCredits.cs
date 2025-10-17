using System;
using System.Collections.Generic;

namespace Haas.Media.Services.Metadata;

public class PersonLibraryCredits
{
    public IReadOnlyList<MovieMetadata> Movies { get; init; } = [];

    public IReadOnlyList<TVShowMetadata> TvShows { get; init; } = [];
}
