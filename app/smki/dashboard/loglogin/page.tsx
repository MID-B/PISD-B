import { redirect } from 'next/navigation';

// Existing bookmarks now lead to the combined activity and login history page.
export default function LogLoginPage() {
  redirect('/smki/dashboard?tab=log-activity');
}
