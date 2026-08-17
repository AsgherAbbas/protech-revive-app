import { NextResponse } from 'next/server';
import { assertSupportedCompany, getCollection, ensureCompanyCollection, upsertCollectionItem, deleteCollectionItem, pushActivityLog } from '../../../lib/dashboardStore';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = assertSupportedCompany(searchParams.get('company') || 'PROtech');
    const typeFilter = searchParams.get('type'); // incoming, outgoing, or all
    const statusFilter = searchParams.get('status'); // pending, completed, cancelled, or all
    const dateFilter = searchParams.get('date'); // YYYY-MM-DD

    const salesRecords = getCollection(company, 'sales').map((record) => ({
      ...record,
      company
    }));
    let filtered = salesRecords;
    
    if (typeFilter && typeFilter !== 'all') {
      filtered = filtered.filter(r => r.type === typeFilter);
    }
    
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    
    if (dateFilter) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.date).toISOString().split('T')[0];
        return recordDate === dateFilter;
      });
    }

    // Sort by date descending (most recent first)
    filtered.sort((a, b) => new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp));

    return NextResponse.json({
      success: true,
      company,
      count: filtered.length,
      timestamp: new Date().toISOString(),
      data: filtered
    });
  } catch (error) {
    console.error('Sales API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const company = assertSupportedCompany(body.company || 'PROtech');
    const { record } = body;

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record is required' },
        { status: 400 }
      );
    }

    const userName = body.userName || record.recordedBy || record.salesperson || 'System';

    ensureCompanyCollection(company);

    const newRecord = {
      id: record.id || `sales-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...record,
      company
    };

    const savedRecord = upsertCollectionItem(company, 'sales', newRecord);

    await pushActivityLog({
      company,
      userName,
      actionDescription: record.id ? `Updated ${record.type} sale for ${record.productName || record.sku || 'item'}` : `Recorded ${record.type} sale for ${record.productName || record.sku || 'item'}`,
      actionType: record.id ? 'sales_update' : 'sales_record',
      details: `${record.quantity || 0} units | AED ${record.totalValue || 0}`,
      status: 'Completed'
    });

    return NextResponse.json({
      success: true,
      message: 'Sales record saved',
      data: savedRecord
    });
  } catch (error) {
    console.error('Sales POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sales
 * Deletes a sales record
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = assertSupportedCompany(searchParams.get('company') || 'PROtech');
    const recordId = searchParams.get('id');
    const userName = searchParams.get('userName') || 'System';

    if (!recordId) {
      return NextResponse.json(
        { success: false, error: 'Record ID is required' },
        { status: 400 }
      );
    }

    const deletedRecord = deleteCollectionItem(company, 'sales', recordId);

    if (!deletedRecord) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    await pushActivityLog({
      company,
      userName,
      actionDescription: `Deleted ${deletedRecord.type} sale for ${deletedRecord.productName || deletedRecord.sku || 'item'}`,
      actionType: 'sales_delete',
      details: `${deletedRecord.quantity || 0} units`,
      status: 'Completed'
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Record deleted',
      data: deletedRecord
    });
  } catch (error) {
    console.error('Sales DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
