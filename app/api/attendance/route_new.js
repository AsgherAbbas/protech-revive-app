import { NextResponse } from 'next/server';
import { getCollection, ensureCompanyCollection, upsertCollectionItem, deleteCollectionItem, pushActivityLog } from '../../../lib/dashboardStore';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || 'PROtech';
    const dateFilter = searchParams.get('date');

    const attendanceRecords = getCollection(company, 'attendance');
    let filtered = attendanceRecords;

    if (dateFilter) {
      filtered = attendanceRecords.filter(record => {
        const recordDate = new Date(record.date).toISOString().split('T')[0];
        return recordDate === dateFilter;
      });
    }

    filtered.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));

    return NextResponse.json({
      success: true,
      company,
      count: filtered.length,
      timestamp: new Date().toISOString(),
      data: filtered
    });
  } catch (error) {
    console.error('Attendance GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { company = 'PROtech', record, userName } = await request.json();

    if (!record) {
      return NextResponse.json({ success: false, error: 'Record is required' }, { status: 400 });
    }

    ensureCompanyCollection(company);
    const isUpdate = !!record.id;
    const savedRecord = upsertCollectionItem(company, 'attendance', record);

    if (userName) {
      const action = isUpdate ? 'Updated' : 'Marked';
      const employeeName = savedRecord.employeeName || savedRecord.name || 'Unknown';
      await pushActivityLog({
        company,
        userName,
        actionDescription: `${action} attendance for ${employeeName}`,
        actionType: isUpdate ? 'attendance_update' : 'attendance_mark',
        details: `Status: ${savedRecord.status || 'N/A'}`,
        status: 'Completed'
      });
    }

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

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || 'PROtech';
    const recordId = searchParams.get('id');
    const userName = searchParams.get('userName');

    if (!recordId) {
      return NextResponse.json({ success: false, error: 'Record ID is required' }, { status: 400 });
    }

    const deletedRecord = deleteCollectionItem(company, 'attendance', recordId);

    if (!deletedRecord) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }

    if (userName) {
      const employeeName = deletedRecord.employeeName || deletedRecord.name || 'Unknown';
      await pushActivityLog({
        company,
        userName,
        actionDescription: `Deleted attendance for ${employeeName}`,
        actionType: 'attendance_delete',
        details: `Date: ${deletedRecord.date || 'N/A'}`,
        status: 'Completed'
      });
    }

    return NextResponse.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    console.error('Attendance DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
