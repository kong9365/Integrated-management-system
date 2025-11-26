import Plotly from "plotly.js";
import createPlotlyComponent from "react-plotly.js/factory";
import { Data, Layout, Config, Figure } from "plotly.js";

// Plotly 컴포넌트 생성
const Plot = createPlotlyComponent(Plotly);

interface PlotlyChartProps {
  data: Data[];
  layout?: Partial<Layout>;
  config?: Partial<Config>;
  style?: React.CSSProperties;
  className?: string;
  onUpdate?: (figure: Figure) => void;
}

export function PlotlyChart({
  data,
  layout = {},
  config = {
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ["lasso2d", "select2d"],
    responsive: true,
  },
  style = { width: "100%", height: "100%" },
  className,
  onUpdate,
}: PlotlyChartProps) {
  const defaultLayout: Partial<Layout> = {
    autosize: true,
    font: {
      family: "Segoe UI, sans-serif",
      size: 12,
    },
    plot_bgcolor: "rgba(0,0,0,0)",
    paper_bgcolor: "rgba(0,0,0,0)",
    margin: { l: 60, r: 20, t: 40, b: 40 },
    ...layout,
  };

  return (
    <div className={className} style={style}>
      <Plot
        data={data}
        layout={defaultLayout}
        config={config}
        style={style}
        useResizeHandler={true}
        onUpdate={(figure) => {
          if (onUpdate) {
            onUpdate(figure);
          }
        }}
      />
    </div>
  );
}

