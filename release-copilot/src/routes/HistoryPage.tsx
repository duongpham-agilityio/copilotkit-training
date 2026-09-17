import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Archive, Trash2 } from 'lucide-react';
import Button, { ButtonSize, ButtonVariant } from '@/components/common/Button.tsx';
import Card, { CardEmphasis } from '@/components/common/Card.tsx';
import ConfirmDialog from '@/components/common/ConfirmDialog.tsx';
import EmptyState from '@/components/common/EmptyState.tsx';
import ErrorBoundary from '@/components/common/ErrorBoundary.tsx';
import ReleaseHistoryList from '@/components/history/ReleaseHistoryList.tsx';
import ReleaseDetailHeader from '@/components/history/ReleaseDetailHeader.tsx';
import ReleaseDetailBody from '@/components/history/ReleaseDetailBody.tsx';
import { ROUTE_DASHBOARD } from '@/constants/routings.ts';
import { cn } from '@/lib/cn.ts';
import { copyText } from '@/lib/clipboard.ts';
import { publishToSlack } from '@/services/publish-to-slack.ts';
import { useReleaseHistory } from '@/hooks/use-release-history.ts';

// The design's `.card`: 14px radius, hairline ring, no inner padding — each
// pane owns its own spacing.
const PANE_CARD_CLASSES =
  'border-outline-subtle flex flex-col overflow-hidden rounded-[14px] p-0 shadow-[0_1px_2px_rgba(23,21,28,0.04)]';

// Export / Open in new thread / Copy link / Remove have no handler yet —
// UI-first pass, same "build the surface, defer the behavior" pattern as
// ThreadHeader. Copy and Send to Slack keep their existing wiring.
const HistoryPage = () => {
  const navigate = useNavigate();
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const {
    groups,
    selectedItem,
    selectedItemId,
    latestItemId,
    totalCount,
    filteredCount,
    query,
    filter,
    isLoading,
    isError,
    selectItem,
    setQuery,
    setFilter,
    clearFilters,
  } = useReleaseHistory();

  const countLabel =
    filteredCount === totalCount
      ? `${totalCount} archived`
      : `${filteredCount} of ${totalCount} archived`;

  const handleCopy = () => {
    if (!selectedItem) return;
    void copyText(selectedItem.markdown);
  };

  const handleSendToSlack = () => {
    if (!selectedItem) return;
    const { platformId, platformLabel, markdown } = selectedItem;
    void publishToSlack({ platformId, label: platformLabel, content: markdown });
  };

  const closeRemoveDialog = () => setIsRemoveDialogOpen(false);

  const renderListContent = () => {
    if (isError) {
      return <p className="text-body-sm text-error p-4">Failed to load release history.</p>;
    }
    return (
      <ReleaseHistoryList
        groups={groups}
        isLoading={isLoading}
        selectedItemId={selectedItemId}
        latestItemId={latestItemId}
        query={query}
        filter={filter}
        onQueryChange={setQuery}
        onFilterChange={setFilter}
        onClearFilters={clearFilters}
        onSelectItem={selectItem}
      />
    );
  };

  return (
    <div className="flex h-full min-w-0 flex-col">
      <header className="border-outline-subtle flex h-14 shrink-0 items-center justify-between gap-4 border-b pr-4 pl-6">
        <h1 className="text-body-md text-on-surface min-w-0 truncate font-semibold">
          Release history
        </h1>
        {!isLoading && !isError && (
          <span className="text-on-surface-muted shrink-0 text-[12.5px] tabular-nums">
            {countLabel}
          </span>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-8 pt-5 pb-6">
        <p className="text-on-surface-muted shrink-0 text-[13.5px]">
          Release notes you’ve archived.
        </p>

        <div className="flex min-h-0 flex-1 gap-5">
          <Card emphasis={CardEmphasis.Outlined} className={cn(PANE_CARD_CLASSES, 'w-85 shrink-0')}>
            <ErrorBoundary title="Release history unavailable">
              {renderListContent()}
            </ErrorBoundary>
          </Card>

          <Card emphasis={CardEmphasis.Outlined} className={cn(PANE_CARD_CLASSES, 'min-w-0 flex-1')}>
            <ErrorBoundary title="Release detail unavailable">
              {selectedItem ? (
                <>
                  <ReleaseDetailHeader
                    item={selectedItem}
                    onSendToSlack={handleSendToSlack}
                    onExport={() => {}}
                    onCopy={handleCopy}
                    onOpenInNewThread={() => {}}
                    onCopyLink={() => {}}
                    onRemove={() => setIsRemoveDialogOpen(true)}
                  />
                  <ReleaseDetailBody markdown={selectedItem.markdown} />
                </>
              ) : (
                !isLoading && (
                  <EmptyState
                    icon={<Archive className="size-5" />}
                    title="Nothing archived yet"
                    description="Archive a draft from a thread and it will show up here."
                    action={
                      <Button
                        variant={ButtonVariant.Secondary}
                        size={ButtonSize.Sm}
                        onClick={() => navigate(ROUTE_DASHBOARD)}
                      >
                        Go to Dashboard
                      </Button>
                    }
                    className="flex-1 justify-center"
                  />
                )
              )}
            </ErrorBoundary>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isRemoveDialogOpen && !!selectedItem}
        icon={<Trash2 className="size-4.75" />}
        title={`Remove ${selectedItem?.version} (${selectedItem?.platformLabel})?`}
        description="These archived release notes will be removed from history. Anything already sent to Slack stays in Slack."
        confirmLabel="Remove"
        onConfirm={closeRemoveDialog}
        onCancel={closeRemoveDialog}
      />
    </div>
  );
};

export default HistoryPage;
