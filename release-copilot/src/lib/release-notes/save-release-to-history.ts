interface SaveReleaseToHistoryResult {
  ok: boolean;
  error?: string;
  skipped?: boolean;
}

// Saving to History used to spread the live draft directly into the save
// request, which relied on the draft always carrying github/appStore/
// googlePlay/platforms. Now that a draft is a single flexible
// {platform, label, content} slot, there is no correct way to map it onto
// that historical three-named-platform shape — doing so would either fabricate
// data (e.g. putting a Slack draft's content in the required `github` field)
// or require redesigning History's own schema now, which is explicitly
// deferred to its own future plan. Disabled until that redesign lands.
export const saveReleaseToHistory =
  async (): Promise<SaveReleaseToHistoryResult> => ({
    ok: false,
    error:
      'Saving to History is temporarily unavailable while it is redesigned ' +
      'for the new flexible-platform draft model.',
  });
