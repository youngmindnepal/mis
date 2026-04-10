// app/api/permissions/categories/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get unique categories from permissions
    const permissions = await prisma.permission.findMany({
      select: {
        category: true,
      },
      distinct: ['category'],
    });

    const categories = permissions
      .map((p) => p.category)
      .filter(
        (category) =>
          category && category !== 'null' && category !== 'undefined'
      );

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
