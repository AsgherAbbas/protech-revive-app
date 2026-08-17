import { insertActivityLog, listActivityLogs } from '../../../lib/db';

const ALLOWED_STATUS = new Set(['Automated', 'Pending', 'Replied', 'Completed', 'Success']);

function sanitizeText(value, maxLength) {
  if (typeof value !== 'string') {
    return '';
  }

function getPacketTimestamp() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

  return value.trim().slice(0, maxLength);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const limit = Number(searchParams.get('limit') || 100);

    if (!['PROtech', 'Revive'].includes(company)) {
      return Response.json({ error: 'A valid tenant company is required' }, { status: 400 });
    }

    const logs = await listActivityLogs({
      companyName: company,
      limit
    });

    return Response.json({ success: true, logs });
  } catch (error) {
    console.error('List activity logs error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const companyName = sanitizeText(body.companyName, 32);
    const userName = sanitizeText(body.userName, 120);
    const actionDescription = sanitizeText(body.actionDescription, 300);
    const actionType = sanitizeText(body.actionType, 64) || null;
    const details = sanitizeText(body.details, 500) || null;
    const requestedStatus = sanitizeText(body.status, 24);
    const status = ALLOWED_STATUS.has(requestedStatus) ? requestedStatus : 'Completed';

    if (!companyName || !userName || !actionDescription) {
      return Response.json(
        { error: 'companyName, userName, and actionDescription are required' },
        { status: 400 }
      );
    }

    if (!['PROtech', 'Revive'].includes(companyName)) {
      return Response.json({ error: 'Unsupported tenant company' }, { status: 400 });
    }

    await insertActivityLog({
      companyName,
      userName,
      actionDescription,
      status,
      actionType,
      details,
      timestamp: getPacketTimestamp()
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Create activity log error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
