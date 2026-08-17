# Invoice Generator - Quick Start Guide for Aqeel & Boss

## 🎯 Overview
The Invoices dashboard now includes a complete invoice management system with:
- **Dynamic Invoice Generator** - Create professional invoices with automatic formatting
- **PDF Export** - Download invoices as PDF with one click
- **Date Filtering** - View historical invoices from any date
- **Status Management** - Track invoice lifecycle (Draft → Paid)
- **Company Branding** - Automatic PROtech or Revive branding based on your company

---

## 📋 Creating an Invoice

### Step 1: Start Invoice Creation
Click the blue **"Create New Invoice"** button in the Invoices section.

### Step 2: Fill Client Information
```
Client Name *      → Name of your client (required)
Email             → Client email address
Phone             → Client phone number
Address           → Client address for billing
```

### Step 3: Set Invoice Dates
```
Invoice Number    → Auto-generated (INV-YYYYMMDD####)
Invoice Date      → When invoice is issued (defaults to today)
Due Date          → Payment deadline (optional)
PO Number         → Purchase order reference (optional)
```

### Step 4: Add Line Items
Click **"Add Item"** to add products/services:
```
Description *     → Item name (required)
Quantity *        → Number of units (required)
Unit Price *      → Price per unit in AED (required)
```

The system automatically calculates:
- Item Amount = Quantity × Unit Price
- Subtotal = Sum of all item amounts
- Tax (VAT) = Subtotal × 5%
- **Total = Subtotal + Tax**

### Step 5: Add Notes (Optional)
Use the Notes field for payment terms, special instructions, or thanks message.

### Step 6: Preview & Export
1. Click **"Preview"** to see your formatted invoice
   - Review all details with company branding
   - Check totals are correct
2. Click **"Export PDF"** to download the invoice
3. Click **"Save Invoice"** to store in the system

---

## 🔍 Filtering Invoice History

### Filter by Date
1. Use the **"Filter by Date"** calendar picker
2. Select a specific date
3. Only invoices from that date will display
4. Totals and counts update automatically

### Filter by Status
1. Use the **"Filter by Status"** dropdown
2. Choose from:
   - Draft (not yet sent)
   - Pending (awaiting payment)
   - Approved (accepted by client)
   - Sent (delivered to client)
   - Paid ✅ (payment received)
   - Overdue (past due date)
   - Cancelled (voided)

### Clear Filters
Click **"Clear Filters"** to see all invoices again.

---

## 📊 Invoice Metrics Dashboard

**Above the invoice table, you'll see:**

| Metric | Shows |
|--------|-------|
| Total Invoices | How many invoices match your filters |
| Paid | Number of paid invoices |
| Pending | Number awaiting payment (draft, pending, sent) |
| Total Value | Combined value of all matching invoices in AED |

---

## 🎨 Company Branding

### PROtech FZCO
- **Color**: Professional Blue
- **Tagline**: "Quality, Transparency & Global B2B Procurement"
- **Industry**: Mobile Phone Wholesale
- **Location**: Dubai, UAE
- Your invoices will automatically use PROtech branding

### ReviveTech FZCO
- **Color**: Professional Green
- **Tagline**: "Professional Device Repair & Refurbishing Experts"
- **Industry**: Technology Solutions & Device Repair
- **Location**: Dubai, UAE
- **Note**: Dr. FONES Approved Partner since 2020
- Your invoices will automatically use ReviveTech branding

**The correct company branding is applied automatically based on your login company.**

---

## 💾 Managing Invoices

### View Invoice Details
Click the **👁️ (Preview)** icon to see a full invoice preview with:
- All client and company details
- Line items with calculations
- Company branding and colors
- Payment terms and notes

### Change Invoice Status
1. Click the status dropdown (currently shows: Draft, Pending, Approved, etc.)
2. Select the new status
3. Changes save automatically
4. Status updates in real-time across all instances

### Download as PDF
Click the **⬇️ (Download)** icon to export as PDF:
- File name: `INV-YYYYMMDD####-ClientName.pdf`
- Ready to email or print
- Full company branding included

### Delete Invoice
Click the **🗑️ (Delete)** icon to remove an invoice.
- ⚠️ This action cannot be undone
- Use if invoice was created in error

---

## ⚡ Real-Time Sync

**The invoice system automatically syncs every 4 seconds:**
- Create invoice in Tab 1 → Appears in Tab 2 within 4 seconds
- Change status in Tab 1 → Updates in Tab 2 automatically
- Delete invoice in Tab 1 → Removed from Tab 2 within 4 seconds

This means you and your team can work with invoices simultaneously without manual refresh!

---

## 🎁 What's Included in Each Invoice

### Automatically Generated
✅ Professional header with company name and logo color
✅ Unique invoice number (INV-YYYYMMDD####)
✅ Company legal details and contact information
✅ Client billing information
✅ Invoice date and due date

### Your Input
📝 Client name, email, phone, address
📝 Line items (description, quantity, price)
📝 Optional: PO number, due date, notes

### Automatically Calculated
🧮 Item amounts (qty × unit price)
🧮 Subtotal (sum of items)
🧮 VAT Tax (5% of subtotal)
🧮 Total (subtotal + tax)

---

## 🚀 Quick Tips

1. **Reuse Client Names** - System remembers previous clients you've used
2. **Set Due Dates** - Always set a due date for payment tracking
3. **Add Notes** - Use notes for payment instructions or thanks message
4. **Export Before Sending** - Always export PDF before emailing to clients
5. **Track Status** - Update status as invoices are sent and paid
6. **Use Filters** - Filter by status to find unpaid invoices quickly
7. **Backup Invoices** - System stores invoices automatically, but keep PDFs too

---

## ❓ Troubleshooting

| Issue | Solution |
|-------|----------|
| Invoice won't save | Ensure all items have description, quantity, and price |
| PDF export fails | Try refreshing page, then export again |
| Can't see invoice I created | Filter might be active - click "Clear Filters" |
| Invoice appears in wrong company | Check you're logged into correct company account |
| Status not updating | Wait 4-5 seconds for real-time sync, then refresh |

---

## 📱 Accessing Your Invoices

1. **Login** to your dashboard
2. Navigate to **Invoices** section (under dashboard)
3. You'll automatically see invoices for YOUR company:
   - PROtech staff see PROtech invoices only
   - Revive staff see Revive invoices only
4. Create, filter, and manage invoices as needed

---

## ✅ Invoice Workflow Example

```
1. Click "Create New Invoice"
2. Enter Client: "ABC Trading LLC"
3. Add Item: "Mobile Phones, 100 units, AED 1,500 each"
4. System calculates: AED 150,000 + VAT = AED 157,500
5. Click "Preview" → See full formatted invoice with branding
6. Click "Export PDF" → Download "INV-2026080001-ABCTrading.pdf"
7. Click "Save Invoice" → Stored in system
8. Send PDF to client via email
9. Later: Update status to "Sent"
10. Later: Update status to "Paid" when payment received
11. Use date filter to see all invoices from August 2026
```

---

**Questions?** The system is designed to be intuitive. Most operations complete with just a few clicks!
