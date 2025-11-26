/**
 * 차트 데이터 생성 유틸리티 함수
 */

import { Data, Layout } from "plotly.js";

interface SessionRecord {
  집계일자: string;
  장비: string;
  시험자: string;
  acquisitionMethod: string;
  샘플명: string;
  가동시간_h: number;
  세션시작?: string;
  세션종료?: string;
}

/**
 * 장비별 가동률 바차트 데이터 생성
 */
export function createEquipmentBarChart(
  sessions: SessionRecord[],
  dateRange?: { from: Date; to: Date }
): { data: Data[]; layout: Partial<Layout> } {
  if (sessions.length === 0) {
    return {
      data: [],
      layout: {},
    };
  }

  // 장비별 가동시간 집계
  const equipmentUsage = sessions.reduce((acc, session) => {
    if (!acc[session.장비]) {
      acc[session.장비] = 0;
    }
    acc[session.장비] += session.가동시간_h;
    return acc;
  }, {} as Record<string, number>);

  // 가동률 계산 (기간 동안 24시간 가능 가정)
  const uniqueDates = new Set(sessions.map((s) => s.집계일자)).size;
  const days = uniqueDates || 1;

  const equipmentData = Object.entries(equipmentUsage)
    .map(([장비, 가동시간_h]) => ({
      장비,
      가동시간_h,
      가동률: (가동시간_h / (days * 24)) * 100,
    }))
    .sort((a, b) => a.가동률 - b.가동률);

  // 색상 매핑
  const colors = equipmentData.map((item) => {
    if (item.가동률 >= 80) return "#28a745"; // 녹색
    if (item.가동률 >= 50) return "#ffc107"; // 노란색
    return "#dc3545"; // 빨간색
  });

  const avgRate = equipmentData.reduce((sum, item) => sum + item.가동률, 0) / equipmentData.length;

  const data: Plotly.Data[] = [
    {
      type: "bar",
      orientation: "h",
      y: equipmentData.map((item) => item.장비),
      x: equipmentData.map((item) => item.가동률),
      marker: {
        color: colors,
        line: { width: 0 },
      },
      text: equipmentData.map((item) => `${item.가동률.toFixed(1)}%`),
      textposition: "auto",
      hovertemplate: "<b>%{y}</b><br>가동률: %{x:.1f}%<br>총 사용시간: %{customdata:.1f}h<extra></extra>",
      customdata: equipmentData.map((item) => item.가동시간_h),
    },
  ];

  const layout: Partial<Plotly.Layout> = {
    title: "장비별 가동률 (%)",
    xaxis: {
      title: "가동률 (%)",
      range: [0, 100],
      gridcolor: "rgba(128,128,128,0.2)",
    },
    yaxis: {
      title: "",
      showgrid: false,
    },
    shapes: [
      {
        type: "line",
        x0: avgRate,
        x1: avgRate,
        y0: -0.5,
        y1: equipmentData.length - 0.5,
        line: {
          dash: "dash",
          color: "blue",
          width: 2,
        },
      },
    ],
    annotations: [
      {
        x: avgRate,
        y: equipmentData.length - 0.5,
        text: `평균: ${avgRate.toFixed(1)}%`,
        showarrow: false,
        xanchor: "left",
        bgcolor: "rgba(255,255,255,0.8)",
      },
    ],
    height: 400,
    margin: { l: 150, r: 20, t: 40, b: 40 },
  };

  return { data, layout };
}

/**
 * 시간대별 히트맵 데이터 생성
 */
export function createTimeHeatmap(
  sessions: SessionRecord[],
  dateRange?: { from: Date; to: Date }
): { data: Data[]; layout: Partial<Layout> } {
  if (sessions.length === 0 || !sessions[0].세션시작) {
    return {
      data: [],
      layout: {},
    };
  }

  // 요일별 시간대별 집계
  const heatmapData: Record<string, Record<number, number>> = {};
  const dayOrder = ["월", "화", "수", "목", "금", "토", "일"];
  const dayMap: Record<string, string> = {
    Monday: "월",
    Tuesday: "화",
    Wednesday: "수",
    Thursday: "목",
    Friday: "금",
    Saturday: "토",
    Sunday: "일",
  };

  sessions.forEach((session) => {
    if (!session.세션시작) return;
    const date = new Date(session.세션시작);
    const dayName = dayMap[date.toLocaleDateString("en-US", { weekday: "long" })] || "월";
    const hour = date.getHours();

    if (!heatmapData[dayName]) {
      heatmapData[dayName] = {};
    }
    if (!heatmapData[dayName][hour]) {
      heatmapData[dayName][hour] = 0;
    }
    heatmapData[dayName][hour] += session.가동시간_h;
  });

  // 히트맵 데이터 배열 생성
  const z: number[][] = [];
  const y: string[] = dayOrder.filter((day) => heatmapData[day]);
  const x: string[] = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);

  y.forEach((day) => {
    const row: number[] = [];
    for (let hour = 0; hour < 24; hour++) {
      row.push(heatmapData[day]?.[hour] || 0);
    }
    z.push(row);
  });

  const data: Data[] = [
    {
      type: "heatmap",
      z,
      x,
      y,
      colorscale: "YlOrRd",
      hovertemplate: "%{y}<br>%{x}<br>사용시간: %{z:.1f}h<extra></extra>",
    },
  ];

  const layout: Partial<Layout> = {
    title: "시간대별 장비 사용 패턴",
    xaxis: { title: "시간" },
    yaxis: { title: "요일" },
    height: 400,
    margin: { l: 80, r: 20, t: 40, b: 40 },
  };

  return { data, layout };
}

/**
 * 가동률 트렌드 라인 차트 데이터 생성
 */
export function createTrendLineChart(
  sessions: SessionRecord[],
  dateRange?: { from: Date; to: Date }
): { data: Data[]; layout: Partial<Layout> } {
  if (sessions.length === 0) {
    return {
      data: [],
      layout: {},
    };
  }

  // 일별 장비별 가동시간 집계
  const dailyData: Record<string, Record<string, number>> = {};

  sessions.forEach((session) => {
    const date = session.집계일자;
    if (!dailyData[date]) {
      dailyData[date] = {};
    }
    if (!dailyData[date][session.장비]) {
      dailyData[date][session.장비] = 0;
    }
    dailyData[date][session.장비] += session.가동시간_h;
  });

  // 날짜 정렬
  const sortedDates = Object.keys(dailyData).sort();
  const equipmentList = Array.from(
    new Set(sessions.map((s) => s.장비))
  ).sort();

  // 각 장비별로 데이터 시리즈 생성
  const colors = [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#e377c2",
    "#7f7f7f",
    "#bcbd22",
    "#17becf",
  ];

  const data: Data[] = equipmentList.map((equipment, index) => {
    const y = sortedDates.map((date) => dailyData[date]?.[equipment] || 0);
    return {
      type: "scatter",
      mode: "lines+markers",
      name: equipment,
      x: sortedDates,
      y,
      line: { width: 2.5 },
      marker: { size: 7 },
      hovertemplate: `<b>${equipment}</b><br>날짜: %{x}<br>사용시간: %{y:.1f}h<extra></extra>`,
    } as Data;
  });

  const layout: Partial<Layout> = {
    title: "장비별 일일 사용시간 추이",
    xaxis: {
      title: "날짜",
      gridcolor: "rgba(128,128,128,0.2)",
    },
    yaxis: {
      title: "사용시간 (h)",
      gridcolor: "rgba(128,128,128,0.2)",
    },
    legend: {
      orientation: "h",
      yanchor: "bottom",
      y: 1.02,
      xanchor: "right",
      x: 1,
    },
    height: 400,
    margin: { l: 60, r: 20, t: 60, b: 40 },
  };

  return { data, layout };
}

/**
 * 사용자별 사용시간 바차트 데이터 생성
 */
export function createUserBarChart(
  sessions: SessionRecord[],
  dateRange?: { from: Date; to: Date }
): { data: Data[]; layout: Partial<Layout> } {
  if (sessions.length === 0) {
    return {
      data: [],
      layout: {},
    };
  }

  // 사용자별 가동시간 집계
  const userUsage = sessions.reduce((acc, session) => {
    if (!session.시험자) return acc;
    if (!acc[session.시험자]) {
      acc[session.시험자] = 0;
    }
    acc[session.시험자] += session.가동시간_h;
    return acc;
  }, {} as Record<string, number>);

  const userData = Object.entries(userUsage)
    .map(([시험자, 가동시간_h]) => ({ 시험자, 가동시간_h }))
    .sort((a, b) => b.가동시간_h - a.가동시간_h)
    .slice(0, 10)
    .reverse(); // Top 10, 오름차순 정렬

  const data: Data[] = [
    {
      type: "bar",
      orientation: "h",
      y: userData.map((item) => item.시험자),
      x: userData.map((item) => item.가동시간_h),
      marker: {
        color: userData.map((item) => item.가동시간_h),
        colorscale: "Blues",
        showscale: false,
      },
      text: userData.map((item) => `${item.가동시간_h.toFixed(1)}h`),
      textposition: "auto",
      hovertemplate: "<b>%{y}</b><br>사용시간: %{x:.1f}h<extra></extra>",
    },
  ];

  const layout: Partial<Layout> = {
    title: "사용자별 장비 사용시간 Top 10",
    xaxis: {
      title: "사용시간 (h)",
      gridcolor: "rgba(128,128,128,0.2)",
    },
    yaxis: {
      title: "",
      showgrid: false,
    },
    height: 400,
    margin: { l: 150, r: 80, t: 60, b: 40 },
  };

  return { data, layout };
}

/**
 * 분석법별 파이차트 데이터 생성
 */
export function createMethodPieChart(
  sessions: SessionRecord[],
  dateRange?: { from: Date; to: Date }
): { data: Data[]; layout: Partial<Layout> } {
  if (sessions.length === 0) {
    return {
      data: [],
      layout: {},
    };
  }

  // 분석법별 가동시간 집계
  const methodUsage = sessions.reduce((acc, session) => {
    if (!session.acquisitionMethod) return acc;
    if (!acc[session.acquisitionMethod]) {
      acc[session.acquisitionMethod] = 0;
    }
    acc[session.acquisitionMethod] += session.가동시간_h;
    return acc;
  }, {} as Record<string, number>);

  const methodData = Object.entries(methodUsage)
    .map(([acquisitionMethod, 가동시간_h]) => ({ acquisitionMethod, 가동시간_h }))
    .sort((a, b) => b.가동시간_h - a.가동시간_h)
    .slice(0, 10); // Top 10

  const data: Data[] = [
    {
      type: "pie",
      labels: methodData.map((item) => item.acquisitionMethod),
      values: methodData.map((item) => item.가동시간_h),
      textinfo: "label+percent",
      textposition: "inside",
      hovertemplate: "<b>%{label}</b><br>사용시간: %{value:.1f}h<br>비율: %{percent}<extra></extra>",
      marker: {
        line: { color: "#FFFFFF", width: 2 },
      },
    },
  ];

  const layout: Partial<Layout> = {
    title: "분석법별 사용 비율 (Top 10)",
    height: 400,
    margin: { l: 20, r: 20, t: 60, b: 20 },
  };

  return { data, layout };
}

/**
 * ROI 스캐터 플롯 데이터 생성
 */
export function createROIScatterChart(
  sessions: SessionRecord[],
  equipmentCosts: Record<string, number>,
  dateRange?: { from: Date; to: Date }
): { data: Data[]; layout: Partial<Layout> } {
  if (sessions.length === 0) {
    return {
      data: [],
      layout: {},
    };
  }

  // 장비별 가동시간 집계
  const equipmentUsage = sessions.reduce((acc, session) => {
    if (!acc[session.장비]) {
      acc[session.장비] = 0;
    }
    acc[session.장비] += session.가동시간_h;
    return acc;
  }, {} as Record<string, number>);

  // 가동률 계산
  const uniqueDates = new Set(sessions.map((s) => s.집계일자)).size;
  const days = uniqueDates || 1;

  const equipmentData = Object.entries(equipmentUsage).map(([장비, 가동시간_h]) => {
    const 가동률 = (가동시간_h / (days * 24)) * 100;
    const 연간비용 = equipmentCosts[장비] || 10000000; // 기본값 1000만원
    const 시간당비용 = 가동시간_h > 0 ? (연간비용 / 가동시간_h) : 0;

    return {
      장비,
      가동률,
      연간비용: 연간비용 / 10000, // 만원 단위
      시간당비용,
      가동시간_h,
    };
  });

  // 평균값 계산
  const avgCost = equipmentData.reduce((sum, item) => sum + item.연간비용, 0) / equipmentData.length;
  const avgUtil = equipmentData.reduce((sum, item) => sum + item.가동률, 0) / equipmentData.length;

  // 사분면별 색상 결정
  const colors = equipmentData.map((item) => {
    if (item.가동률 >= avgUtil && item.연간비용 <= avgCost) {
      return "#4caf50"; // 최적 (저비용 고효율)
    } else if (item.가동률 >= avgUtil && item.연간비용 > avgCost) {
      return "#2196F3"; // 유지 필수 (고비용 고효율)
    } else if (item.가동률 < avgUtil && item.연간비용 > avgCost) {
      return "#f44336"; // 재검토 필요 (고비용 저효율)
    } else {
      return "#ff9800"; // 개선/폐기 (저비용 저효율)
    }
  });

  const data: Data[] = [
    {
      type: "scatter",
      mode: "markers+text",
      x: equipmentData.map((item) => item.연간비용),
      y: equipmentData.map((item) => item.가동률),
      text: equipmentData.map((item) => item.장비),
      textposition: "top center",
      textfont: { size: 10 },
      marker: {
        size: equipmentData.map((item) => Math.max(10, item.가동시간_h / 10)),
        color: colors,
        line: { width: 2, color: "white" },
      },
      hovertemplate:
        "<b>%{text}</b><br>가동률: %{y:.1f}%<br>연간비용: %{x:.0f}만원<br>시간당비용: %{customdata:,.0f}원<extra></extra>",
      customdata: equipmentData.map((item) => item.시간당비용),
    },
  ];

  const layout: Partial<Layout> = {
    title: "장비별 투자 효율성 매트릭스",
    xaxis: {
      title: "연간 유지보수 비용 (만원)",
      gridcolor: "rgba(128,128,128,0.2)",
    },
    yaxis: {
      title: "가동률 (%)",
      gridcolor: "rgba(128,128,128,0.2)",
    },
    shapes: [
      {
        type: "line",
        x0: avgCost,
        x1: avgCost,
        y0: 0,
        y1: 100,
        line: { dash: "dash", color: "gray", width: 1 },
      },
      {
        type: "line",
        x0: 0,
        x1: Math.max(...equipmentData.map((item) => item.연간비용)),
        y0: avgUtil,
        y1: avgUtil,
        line: { dash: "dash", color: "gray", width: 1 },
      },
    ],
    annotations: [
      {
        x: Math.min(...equipmentData.map((item) => item.연간비용)),
        y: Math.max(...equipmentData.map((item) => item.가동률)),
        text: "최적<br>(저비용 고효율)",
        showarrow: false,
        font: { size: 11, color: "#4caf50" },
        bgcolor: "rgba(76,175,80,0.1)",
      },
      {
        x: Math.max(...equipmentData.map((item) => item.연간비용)),
        y: Math.max(...equipmentData.map((item) => item.가동률)),
        text: "유지 필수<br>(고비용 고효율)",
        showarrow: false,
        font: { size: 11, color: "#2196F3" },
        bgcolor: "rgba(33,150,243,0.1)",
      },
      {
        x: Math.max(...equipmentData.map((item) => item.연간비용)),
        y: Math.min(...equipmentData.map((item) => item.가동률)),
        text: "재검토 필요<br>(고비용 저효율)",
        showarrow: false,
        font: { size: 11, color: "#f44336" },
        bgcolor: "rgba(244,67,54,0.1)",
      },
      {
        x: Math.min(...equipmentData.map((item) => item.연간비용)),
        y: Math.min(...equipmentData.map((item) => item.가동률)),
        text: "개선/폐기<br>(저비용 저효율)",
        showarrow: false,
        font: { size: 11, color: "#ff9800" },
        bgcolor: "rgba(255,152,0,0.1)",
      },
    ],
    height: 500,
    margin: { l: 60, r: 60, t: 60, b: 60 },
  };

  return { data, layout };
}

/**
 * 장비별 유지보수 비용 기본값 (향후 파일 업로드로 대체)
 */
export function getDefaultEquipmentCosts(): Record<string, number> {
  return {
    "GC-Headspace (FID/ECD)": 8000000,
    "HPLC Agilent-14": 12000000,
    "HPLC Agilent-28": 10000000,
    "HPLC Agilent-29": 11000000,
    "HPLC Agilent-27": 9000000,
    "HPLC Agilent-30": 9500000,
    "GC-MS Agilent": 15000000,
    "HPLC Waters-01": 13000000,
  };
}

