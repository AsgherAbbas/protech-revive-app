import { NextResponse } from 'next/server';
import { assertSupportedCompany, ensureCompanyCollection, getCollection, upsertCollectionItem, deletePersistedInvoice, pushActivityLog } from '../../../lib/dashboardStore';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = assertSupportedCompany(searchParams.get('company') || 'PROtech');
    const dateFilter = searchParams.get('date');
    const statusFilter = searchParams.get('status');

    const invoices = getCollection(company, 'invoices');
    let filtered = invoices;

    if (statusFilter) {
      filtered = filtered.filter((inv) => (inv.status || '').toLowerCase() === statusFilter.toLowerCase());
    }

    if (dateFilter) {
      filtered = filtered.filter((inv) => {
        const invDate = new Date(inv.createdDate || inv.invoiceDate || '').toISOString().split('T')[0];
        return invDate === dateFilter;
      });
    }

    filtered.sort((a, b) => new Date(b.createdDate || b.invoiceDate || 0) - new Date(a.createdDate || a.invoiceDate || 0));

    return NextResponse.json({
      success: true,
      company,
      count: filtered.length,
      timestamp: new Date().toISOString(),
      data: filtered
    });
  } catch (error) {
    console.error('Invoice GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const company = assertSupportedCompany(body.company);
    const { record, userName = 'System' } = body;

    if (!company || !record) {
      return NextResponse.json({ error: 'Missing company or record' }, { status: 400 });
    }

    ensureCompanyCollection(company);
    const isUpdate = getCollection(company, 'invoices').some((invoice) => invoice.id === record.id);
    const savedRecord = upsertCollectionItem(company, 'invoices', record);

    const invoiceNum = savedRecord.invoiceNumber || savedRecord.id;
    const isExternalInvoice = savedRecord.invoiceType === 'external';
    await pushActivityLog({
      company,
      userName,
      actionDescription: isExternalInvoice
        ? `${isUpdate ? 'Updated' : 'Uploaded'} External Invoice ${invoiceNum}`
        : `${isUpdate ? 'Updated' : 'Created'} invoice ${invoiceNum}`,
      actionType: isExternalInvoice
        ? (isUpdate ? 'external_invoice_update' : 'external_invoice_upload')
        : (isUpdate ? 'invoice_update' : 'invoice_create'),
      details: `Amount: AED ${savedRecord.amount || savedRecord.total || 0}`,
      status: 'Completed'
    });

    return NextResponse.json({
      success: true,
      company,
      timestamp: new Date().toISOString(),
      data: savedRecord
    });
  } catch (error) {
    console.error('Invoice POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = assertSupportedCompany(searchParams.get('company') || 'PROtech');
    const id = searchParams.get('id');
    const userName = searchParams.get('userName') || 'System';

    if (!id) {
      return NextResponse.json({ error: 'Missing invoice ID' }, { status: 400 });
    }

    const deletedRecord = await deletePersistedInvoice(company, id);

    if (!deletedRecord) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoiceNum = deletedRecord.invoiceNumber || deletedRecord.id;
    const isExternalInvoice = deletedRecord.invoiceType === 'external';
    await pushActivityLog({
      company,
      userName,
      actionDescription: isExternalInvoice
        ? `Deleted External Invoice ${invoiceNum}`
        : `Deleted invoice ${invoiceNum}`,
      actionType: isExternalInvoice ? 'external_invoice_delete' : 'invoice_delete',
      details: `Amount: AED ${deletedRecord.total || deletedRecord.amount || 0}`,
      status: 'Completed'
    });

    return NextResponse.json({
      success: true,
      company,
      timestamp: new Date().toISOString(),
      message: 'Invoice deleted successfully',
      data: deletedRecord
    });
  } catch (error) {
    console.error('Invoice DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
