import { redirect } from 'next/navigation';

/** Legacy URL — allocation UI lives at `/pr-approval-manage`. */
export default function PRApprovalManageLegacyRedirect() {
  redirect('/pr-approval-manage');
}
