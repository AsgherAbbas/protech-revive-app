import { NextResponse } from 'next/server';
import { assertSupportedCompany, getCollection, ensureCompanyCollection, upsertCollectionItem, deleteCollectionItem, pushActivityLog } from '../../../lib/dashboardStore';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = assertSupportedCompany(searchParams.get('company') || 'PROtech');
    const statusFilter = searchParams.get('status'); // active, inactive, or all
    const categoryFilter = searchParams.get('category');

    const priceRecords = getCollection(company, 'prices');
    let filtered = priceRecords;
    
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    
    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(r => r.category === categoryFilter);
    }

    // Sort by lastUpdated descending (most recent first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.lastUpdated || a.timestamp || 0);
      const dateB = new Date(b.lastUpdated || b.timestamp || 0);
      return dateB - dateA;
    });

    return NextResponse.json({
      success: true,
      company,
      count: filtered.length,
      timestamp: new Date().toISOString(),
      data: filtered
    });
  } catch (error) {
    console.error('Prices API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/prices
 * Creates or updates a price record
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const company = assertSupportedCompany(body.company || 'PROtech');
    const { record, userName = 'System' } = body;

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record is required' },
        { status: 400 }
      );
    }

    ensureCompanyCollection(company);

    const newRecord = {
      id: record.id || `price-${Date.now()}`,
      timestamp: new Date().toISOString(),
      lastUpdated: new Date().toISOString().split('T')[0],
      ...record
    };

    const savedRecord = upsertCollectionItem(company, 'prices', newRecord);

    await pushActivityLog({
      company,
      userName,
      actionDescription: record.id ? `Updated price for ${record.productName || record.sku || 'item'}` : `Added price for ${record.productName || record.sku || 'item'}`,
      actionType: record.id ? 'price_update' : 'price_add',
      details: `SKU: ${record.sku || 'N/A'} | AED ${record.newPrice || 0}`,
      status: 'Completed'
    });

    return NextResponse.json({
      success: true,
      message: 'Price record saved',
      data: savedRecord
    });
  } catch (error) {
    console.error('Prices POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

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

    const deletedRecord = deleteCollectionItem(company, 'prices', recordId);

    if (!deletedRecord) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    await pushActivityLog({
      company,
      userName,
      actionDescription: `Deleted price for ${deletedRecord.productName || deletedRecord.sku || 'item'}`,
      actionType: 'price_delete',
      details: `SKU: ${deletedRecord.sku || 'N/A'}`,
      status: 'Completed'
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Record deleted',
      data: deletedRecord
    });
  } catch (error) {
    console.error('Prices DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
