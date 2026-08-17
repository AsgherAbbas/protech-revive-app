import { NextResponse } from 'next/server';
import { ensureCompanyCollection, upsertCollectionItem, getPersistedAttendance, persistAttendanceRecord, deletePersistedAttendance, pushActivityLog } from '../../../lib/dashboardStore';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || 'PROtech';
    const dateFilter = searchParams.get('date');

    const attendanceRecords = (await getPersistedAttendance(company)).map((record) => ({
      ...record,
      company
    }));
    let filtered = attendanceRecords;
    if (dateFilter) {
      filtered = attendanceRecords.filter(record => {
        const recordDate = new Date(record.date).toISOString().split('T')[0];
        return recordDate === dateFilter;
      });
    }

    // Sort by timestamp descending (most recent first)
    filtered.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));

    return NextResponse.json({
      success: true,
      company,
      count: filtered.length,
      timestamp: new Date().toISOString(),
      data: filtered
    });
  } catch (error) {
    console.error('Attendance API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { company = 'PROtech', record } = body;

    if (!record) {
      return NextResponse.json({ success: false, error: 'Record is required' }, { status: 400 });
    }

    const userName = body.userName || record.recordedBy || record.updatedBy || 'System';

    ensureCompanyCollection(company);
    const isUpdate = !!record.id;
    const savedRecord = upsertCollectionItem(company, 'attendance', { ...record, company });
    await persistAttendanceRecord(company, savedRecord);

    await pushActivityLog({
      company,
      userName,
      actionDescription: isUpdate ? `Updated attendance for ${record.employeeName || record.name || 'employee'}` : `Marked attendance for ${record.employeeName || record.name || 'employee'}`,
      actionType: isUpdate ? 'attendance_update' : 'attendance_mark',
      details: `Status: ${record.status || 'N/A'}`,
      status: 'Completed'
    });

    return NextResponse.json({
      success: true,
      message: 'Attendance record saved',
      data: savedRecord
    });
  } catch (error) {
    console.error('Attendance POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/attendance
 * Deletes an attendance record
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || 'PROtech';
    const recordId = searchParams.get('id');
    const userName = searchParams.get('userName') || 'System';

    if (!recordId) {
      return NextResponse.json({ success: false, error: 'Record ID is required' }, { status: 400 });
    }

    const deletedRecord = await deletePersistedAttendance(company, recordId);

    if (!deletedRecord) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }

    await pushActivityLog({
      company,
      userName,
      actionDescription: `Deleted attendance for ${deletedRecord.employeeName || deletedRecord.name || 'employee'}`,
      actionType: 'attendance_delete',
      details: `Date: ${deletedRecord.date || 'N/A'}`,
      status: 'Completed'
    });

    return NextResponse.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    console.error('Attendance DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
