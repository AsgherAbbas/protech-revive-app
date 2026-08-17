import { getDb } from '../../../../lib/db';

function execute(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function runCallback(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

export async function POST(request) {
  try {
    const db = await getDb();
    let body = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const action = body?.action;
    const sessionToken = (body?.sessionToken || '').trim();

    if (!sessionToken) {
      return Response.json({ error: 'Session token is required' }, { status: 400 });
    }

    if (action === 'heartbeat') {
      await execute(
        db,
        `UPDATE login_sessions
         SET last_seen_at = CURRENT_TIMESTAMP, is_active = 1
         WHERE session_token = ?`,
        [sessionToken]
      );

      return Response.json({ success: true });
    }

    if (action === 'logout') {
      await execute(
        db,
        `UPDATE login_sessions
         SET is_active = 0, last_seen_at = CURRENT_TIMESTAMP, logged_out_at = CURRENT_TIMESTAMP
         WHERE session_token = ?`,
        [sessionToken]
      );

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Session route error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}