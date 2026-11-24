import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateProfitSharing } from '@/lib/accounting';
import { Decimal } from 'decimal.js';

export async function GET() {
  const setting = await prisma.setting.findFirst({ where: { id: 1 } });
  return NextResponse.json(setting);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      bumkamName,
      villageName,
      districtName,
      regencyName,
      phone,
      email,
      address,
      businessType,
      padkamPercent,
      reserveFundPercent,
      managementBonusPercent,
      socialFundPercent,
      profitSharingActive,
      fiscalYear,
    } = body;

    // 1. Validasi Mutlak: Total persentase harus tepat 100%
    const validation = validateProfitSharing(
      padkamPercent,
      reserveFundPercent,
      managementBonusPercent,
      socialFundPercent
    );

    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, message: validation.message },
        { status: 400 }
      );
    }

    // 2. Simpan Pembaruan ke Database
    const updated = await prisma.setting.upsert({
      where: { id: 1 },
      update: {
        bumkamName: bumkamName?.trim() || 'BUMKam Tungkuwiri Mandiri',
        villageName: villageName?.trim() || 'Kampung Doyo Lama',
        districtName: districtName?.trim() || 'Distrik Waibu',
        regencyName: regencyName?.trim() || 'Kabupaten Jayapura',
        phone: phone?.trim() || '',
        email: email?.trim() || '',
        address: address?.trim() || '',
        businessType: businessType?.trim() || 'Pencetakan Baju Kaos (Sablon) & Konveksi',
        padkamPercent: new Decimal(padkamPercent).toString(),
        reserveFundPercent: new Decimal(reserveFundPercent).toString(),
        managementBonusPercent: new Decimal(managementBonusPercent).toString(),
        socialFundPercent: new Decimal(socialFundPercent).toString(),
        profitSharingActive: Boolean(profitSharingActive),
        fiscalYear: parseInt(fiscalYear, 10) || 2026,
      },
      create: {
        id: 1,
        bumkamName: bumkamName?.trim() || 'BUMKam Tungkuwiri Mandiri',
        villageName: villageName?.trim() || 'Kampung Doyo Lama',
        districtName: districtName?.trim() || 'Distrik Waibu',
        regencyName: regencyName?.trim() || 'Kabupaten Jayapura',
        phone: phone?.trim() || '',
        email: email?.trim() || '',
        address: address?.trim() || '',
        businessType: businessType?.trim() || 'Pencetakan Baju Kaos (Sablon) & Konveksi',
        padkamPercent: new Decimal(padkamPercent).toString(),
        reserveFundPercent: new Decimal(reserveFundPercent).toString(),
        managementBonusPercent: new Decimal(managementBonusPercent).toString(),
        socialFundPercent: new Decimal(socialFundPercent).toString(),
        profitSharingActive: Boolean(profitSharingActive),
        fiscalYear: parseInt(fiscalYear, 10) || 2026,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pengaturan BUMKam dan rasio bagi hasil 100% berhasil disimpan.',
      setting: updated,
    });
  } catch (error) {
    console.error('Error save settings:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menyimpan pengaturan ke database.' },
      { status: 500 }
    );
  }
}
