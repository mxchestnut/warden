import { useParams } from 'react-router-dom';
import { GroupDetail } from '../components/GroupDetail';

export function GroupPage() {
  const { slug } = useParams<{ slug: string }>();
  
  if (!slug) {
    return <div className="error">Group not found</div>;
  }
  
  return <GroupDetail slug={slug} />;
}
