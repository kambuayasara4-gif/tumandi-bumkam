import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Decimal } from 'decimal.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')) : new Date();
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // 1. Rekap Penjualan
    const salesInvoices = await prisma.salesInvoice.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      include: {
        customer: true,
        items: {
          include: {
            item: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    let totalSalesGross = new Decimal(0);
    let totalSalesPaid = new Decimal(0);
    let totalSalesUnpaid = new Decimal(0);

    const itemSalesSummary = {};
    const customerSalesSummary = {};

    for (const inv of salesInvoices) {
      const grandTotal = new Decimal(inv.grandTotal.toString());
      const paid = new Decimal(inv.paidAmount.toString());
      const unpaid = grandTotal.minus(paid);

      totalSalesGross = totalSalesGross.plus(grandTotal);
      totalSalesPaid = totalSalesPaid.plus(paid);
      if (unpaid.greaterThan(0)) {
        totalSalesUnpaid = totalSalesUnpaid.plus(unpaid);
      }

      // Per Customer
      const custName = inv.customer?.name || 'Umum';
      if (!customerSalesSummary[custName]) {
        customerSalesSummary[custName] = {
          customerName: custName,
          orderCount: 0,
          totalAmount: new Decimal(0),
          paidAmount: new Decimal(0),
          unpaidAmount: new Decimal(0),
        };
      }
      customerSalesSummary[custName].orderCount += 1;
      customerSalesSummary[custName].totalAmount = customerSalesSummary[custName].totalAmount.plus(grandTotal);
      customerSalesSummary[custName].paidAmount = customerSalesSummary[custName].paidAmount.plus(paid);
      if (unpaid.greaterThan(0)) {
        customerSalesSummary[custName].unpaidAmount = customerSalesSummary[custName].unpaidAmount.plus(unpaid);
      }

      // Per Item
      for (const item of inv.items) {
        const itemName = item.item?.name || 'Item Sablon';
        const qty = new Decimal(item.quantity.toString());
        const total = new Decimal(item.totalPrice.toString());
        const cost = new Decimal(item.costPrice.toString()).times(qty);
        const margin = total.minus(cost);

        if (!itemSalesSummary[itemName]) {
          itemSalesSummary[itemName] = {
            itemName,
            quantity: new Decimal(0),
            totalSales: new Decimal(0),
            totalCost: new Decimal(0),
            grossMargin: new Decimal(0),
          };
        }
        itemSalesSummary[itemName].quantity = itemSalesSummary[itemName].quantity.plus(qty);
        itemSalesSummary[itemName].totalSales = itemSalesSummary[itemName].totalSales.plus(total);
        itemSalesSummary[itemName].totalCost = itemSalesSummary[itemName].totalCost.plus(cost);
        itemSalesSummary[itemName].grossMargin = itemSalesSummary[itemName].grossMargin.plus(margin);
      }
    }

    // 2. Rekap Pembelian Bahan Baku
    const purchaseInvoices = await prisma.purchaseInvoice.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      include: {
        supplier: true,
      },
      orderBy: { date: 'desc' },
    });

    let totalPurchaseGross = new Decimal(0);
    let totalPurchasePaid = new Decimal(0);
    let totalPurchaseDebt = new Decimal(0);

    for (const po of purchaseInvoices) {
      const amount = new Decimal(po.totalAmount.toString());
      const paid = new Decimal(po.paidAmount.toString());
      const debt = amount.minus(paid);

      totalPurchaseGross = totalPurchaseGross.plus(amount);
      totalPurchasePaid = totalPurchasePaid.plus(paid);
      if (debt.greaterThan(0)) {
        totalPurchaseDebt = totalPurchaseDebt.plus(debt);
      }
    }

    return NextResponse.json({
      success: true,
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      sales: {
        totalSalesGross: totalSalesGross.toNumber(),
        totalSalesPaid: totalSalesPaid.toNumber(),
        totalSalesUnpaid: totalSalesUnpaid.toNumber(),
        invoiceCount: salesInvoices.length,
        itemSummary: Object.values(itemSalesSummary).map((i) => ({
          itemName: i.itemName,
          quantity: i.quantity.toNumber(),
          totalSales: i.totalSales.toNumber(),
          totalCost: i.totalCost.toNumber(),
          grossMargin: i.grossMargin.toNumber(),
        })),
        customerSummary: Object.values(customerSalesSummary).map((c) => ({
          customerName: c.customerName,
          orderCount: c.orderCount,
          totalAmount: c.totalAmount.toNumber(),
          paidAmount: c.paidAmount.toNumber(),
          unpaidAmount: c.unpaidAmount.toNumber(),
        })),
      },
      purchases: {
        totalPurchaseGross: totalPurchaseGross.toNumber(),
        totalPurchasePaid: totalPurchasePaid.toNumber(),
        totalPurchaseDebt: totalPurchaseDebt.toNumber(),
        invoiceCount: purchaseInvoices.length,
      },
    });
  } catch (error) {
    console.error('Error generating sales summary:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menyusun rekapitulasi penjualan: ' + error.message },
      { status: 500 }
    );
  }
}
