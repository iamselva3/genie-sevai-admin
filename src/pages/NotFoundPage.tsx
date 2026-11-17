import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';

export default function NotFoundPage() {
  return (
    <div className="card">
      <EmptyState
        title="Page not found"
        body="This page does not exist or was moved."
        action={
          <Link to="/" className="font-semibold underline">
            Back to dashboard
          </Link>
        }
      />
    </div>
  );
}
