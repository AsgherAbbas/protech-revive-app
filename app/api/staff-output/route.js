import { NextResponse } from 'next/server';
import { getCollection, ensureCompanyCollection, upsertCollectionItem, pushActivityLog } from '../../../lib/dashboardStore';

const REVIVE = 'Revive';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if ((searchParams.get('company') || REVIVE) !== REVIVE) {
    return NextResponse.json({ success: false, error: 'Unsupported company' }, { status: 400 });
  }

  return NextResponse.json({ success: true, company: REVIVE, data: getCollection(REVIVE, 'staffOutput') });
}

export async function POST(request) {
  const body = await request.json();
  if (body.company !== REVIVE || !body.record) {
    return NextResponse.json({ success: false, error: 'Revive company and record are required' }, { status: 400 });
  }

  ensureCompanyCollection(REVIVE);
  const record = upsertCollectionItem(REVIVE, 'staffOutput', {
    ...body.record,
    company: REVIVE,
    timestamp: new Date().toISOString()
  });
  await pushActivityLog({
    company: REVIVE,
    userName: body.userName || record.recordedBy || record.staffName || 'System',
    actionDescription: body.record.id ? `Updated output for ${record.staffName || 'staff member'}` : `Recorded output for ${record.staffName || 'staff member'}`,
    actionType: body.record.id ? 'staff_output_update' : 'staff_output_record',
    details: `${record.tasksCompleted || 0} tasks - Quality: ${record.qualityScore || 0}%`,
    status: 'Completed'
  });
  return NextResponse.json({ success: true, company: REVIVE, data: record });
}