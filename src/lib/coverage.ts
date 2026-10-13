/**
 * The span of General Conference years currently in the search index.
 *
 * Shown on the home page as the site's coverage claim, so it must never run ahead
 * of what is actually indexed — a visitor who searches for a conference we have not
 * indexed gets a confident answer assembled from older talks.
 *
 * LATEST_CONFERENCE_YEAR is bumped by hand after indexing a new conference with
 * `poetry run python -m models.update_conference` in the models repo. That script
 * reads this file when it finishes and prints the exact edit if this value is behind.
 */
export const EARLIEST_CONFERENCE_YEAR = 1980

export const LATEST_CONFERENCE_YEAR = 2026
