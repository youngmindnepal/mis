import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const counselorId = searchParams.get('counselorId');

    const where = {};
    if (dateFrom || dateTo) {
      where.followUpDate = {};
      if (dateFrom) where.followUpDate.gte = new Date(dateFrom);
      if (dateTo) where.followUpDate.lte = new Date(dateTo + 'T23:59:59.999');
    }
    if (counselorId) where.counselorId = parseInt(counselorId);

    const followUps = await prisma.followUp.findMany({
      where,
      include: {
        preadmission: { select: { id: true, studentName: true, phone: true } },
        counselor: { select: { id: true, name: true } },
      },
      orderBy: { followUpDate: 'asc' },
    });

    // Build report data
    const reportData = {};
    const outcomes = {
      interested: 0,
      not_interested: 0,
      will_think: 0,
      enrolled: 0,
      pending: 0,
    };
    const counselorStats = {};

    followUps.forEach((fu) => {
      const dateKey = new Date(fu.followUpDate).toISOString().split('T')[0];
      if (!reportData[dateKey]) {
        reportData[dateKey] = {
          date: dateKey,
          total: 0,
          completed: 0,
          pending: 0,
          outcomes: { ...outcomes },
        };
      }
      reportData[dateKey].total++;
      if (fu.status === 'completed') reportData[dateKey].completed++;
      if (fu.status === 'pending') reportData[dateKey].pending++;
      if (
        fu.outcome &&
        reportData[dateKey].outcomes[fu.outcome] !== undefined
      ) {
        reportData[dateKey].outcomes[fu.outcome]++;
      }

      // Counselor stats
      const cName = fu.counselor?.name || 'Unknown';
      if (!counselorStats[cName]) {
        counselorStats[cName] = {
          name: cName,
          total: 0,
          completed: 0,
          pending: 0,
        };
      }
      counselorStats[cName].total++;
      if (fu.status === 'completed') counselorStats[cName].completed++;
      if (fu.status === 'pending') counselorStats[cName].pending++;
    });

    const totalFollowUps = followUps.length;
    const completedFollowUps = followUps.filter(
      (f) => f.status === 'completed'
    ).length;
    const pendingFollowUps = followUps.filter(
      (f) => f.status === 'pending'
    ).length;
    const todayFollowUps = followUps.filter((f) => {
      const d = new Date(f.followUpDate);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    }).length;
    const overdueFollowUps = followUps.filter((f) => {
      const d = new Date(f.followUpDate);
      const today = new Date();
      return d < today && f.status === 'pending';
    }).length;

    // 3D Data - by day of week
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const dayData = dayNames.map((day) => ({
      day,
      total: followUps.filter(
        (f) => new Date(f.followUpDate).getDay() === dayNames.indexOf(day)
      ).length,
      completed: followUps.filter(
        (f) =>
          new Date(f.followUpDate).getDay() === dayNames.indexOf(day) &&
          f.status === 'completed'
      ).length,
    }));

    // 3D Data - by week
    const weekData = [];
    const sortedDates = Object.keys(reportData).sort();
    let weekNum = 1;
    for (let i = 0; i < sortedDates.length; i += 7) {
      const weekSlice = sortedDates.slice(i, i + 7);
      const weekTotal = weekSlice.reduce(
        (sum, d) => sum + reportData[d].total,
        0
      );
      const weekCompleted = weekSlice.reduce(
        (sum, d) => sum + reportData[d].completed,
        0
      );
      weekData.push({
        week: `Week ${weekNum}`,
        total: weekTotal,
        completed: weekCompleted,
      });
      weekNum++;
    }

    // 3D Data - by hour
    const hourData = [];
    for (let h = 6; h < 18; h++) {
      const hourFollowUps = followUps.filter(
        (f) => new Date(f.followUpDate).getHours() === h
      );
      hourData.push({
        hour: `${h}:00`,
        total: hourFollowUps.length,
        am: h < 12,
      });
    }

    return NextResponse.json({
      success: true,
      report: {
        totalFollowUps,
        completedFollowUps,
        pendingFollowUps,
        todayFollowUps,
        overdueFollowUps,
        completionRate:
          totalFollowUps > 0
            ? Math.round((completedFollowUps / totalFollowUps) * 100)
            : 0,
        dailyData: Object.values(reportData).sort((a, b) =>
          a.date.localeCompare(b.date)
        ),
        dayData,
        weekData,
        hourData,
        counselorStats: Object.values(counselorStats),
        outcomes,
      },
    });
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
