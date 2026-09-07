import ErrorBoundary from '@/components/common/ErrorBoundary.tsx';
import ReleaseHistoryList from '@/components/history/ReleaseHistoryList.tsx';

const HistoryPage = () => (
  <ErrorBoundary title="History unavailable">
    <ReleaseHistoryList releases={[]} onSelectVersion={() => {}} />
  </ErrorBoundary>
);

export default HistoryPage;
