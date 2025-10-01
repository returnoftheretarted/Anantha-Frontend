"use client";

import type React from "react";
import { useRef, useState, useMemo, useEffect } from "react";
import {
  Download,
  BarChart3,
  LineChartIcon,
  ScatterChartIcon,
  AreaChartIcon,
  PieChartIcon,
  Activity,
  TrendingUp,
  Settings,
  Maximize2,
  Minimize2,
  Loader2,
  RefreshCw,
  Map,
  ZoomOut,
  X,
} from "lucide-react";
import Papa from "papaparse";
import * as Plotly from "plotly.js-dist-min";

const CHART_COLORS = [
  "hsl(var(--chart-1))", // Primary Blue
  "hsl(var(--chart-2))", // Teal
  "hsl(var(--chart-3))", // Purple
  "hsl(var(--chart-4))", // Yellow
  "hsl(var(--chart-5))", // Pink
  "hsl(var(--chart-6))", // Green
  "hsl(var(--chart-7))", // Orange
  "hsl(var(--chart-8))", // Light Blue
];

const CHART_TYPES = [
  { value: "line", label: "Line", icon: LineChartIcon },
  { value: "bar", label: "Bar", icon: BarChart3 },
  { value: "area", label: "Area", icon: AreaChartIcon },
  { value: "scatter", label: "Scatter", icon: ScatterChartIcon },
  { value: "pie", label: "Pie", icon: PieChartIcon },
  { value: "radar", label: "Radar", icon: Activity },
  { value: "geograph", label: "Geography", icon: Map },
];

interface ChartConfig {
  showGrid: boolean;
  showLegend: boolean;
  strokeWidth: number;
  opacity: number;
  animationDuration: number;
  curveType: "spline" | "linear" | "hv" | "vh";
  colorScale: string;
  markerSize: number;
  hoverMode: "closest" | "x" | "y" | false;
}

const CSVVisualizationDashboard: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const plotlyRef = useRef<any>(null);
  const [plotType, setPlotType] = useState("line");
  const [csvData, setCsvData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [xAxis, setXAxis] = useState("");
  const [yAxis, setYAxis] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const [config, setConfig] = useState<ChartConfig>({
    showGrid: true,
    showLegend: true,
    strokeWidth: 2,
    opacity: 0.85,
    animationDuration: 600,
    curveType: "spline",
    colorScale: "viridis",
    markerSize: 6,
    hoverMode: "closest",
  });

  // Helper function to detect date columns
  const isDateColumn = (columnName: string, sampleValues: any[]) => {
    const lowerName = columnName.toLowerCase();
    
    // Check if column name suggests it's a date
    const dateKeywords = ['date', 'time', 'created', 'updated', 'timestamp'];
    const hasDateKeyword = dateKeywords.some(keyword => lowerName.includes(keyword));
    
    if (hasDateKeyword) return true;
    
    // Check if sample values look like dates
    const validDateCount = sampleValues.slice(0, 5).filter(value => {
      if (!value || typeof value !== 'string') return false;
      
      // Common date patterns
      const datePatterns = [
        /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/, // dd-mm-yyyy or dd/mm/yyyy
        /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/, // yyyy-mm-dd or yyyy/mm/dd
        /^\d{1,2}[-/]\d{1,2}[-/]\d{2}$/, // dd-mm-yy or dd/mm/yy
      ];
      
      return datePatterns.some(pattern => pattern.test(value));
    }).length;
    
    // If more than half of sample values look like dates, consider it a date column
    return validDateCount >= Math.ceil(sampleValues.slice(0, 5).length / 2);
  };

  // Date parsing function
  const parseDate = (dateStr: any) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    
    // Handle dd-mm-yyyy format
    const ddmmyyyy = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)); // month is 0-indexed in JS Date
    }
    
    // Handle yyyy-mm-dd format
    const yyyymmdd = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (yyyymmdd) {
      const [, year, month, day] = yyyymmdd;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Fallback to native Date parsing
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Function to sample data if it exceeds 2000 points
  const sampleData = (data: any[], maxPoints = 5000) => {
    if (data.length <= maxPoints) return data;
    const step = Math.floor(data.length / maxPoints);
    const sampledData = [];
    for (let i = 0; i < data.length; i += step) {
      sampledData.push(data[i]);
    }
    return sampledData.slice(0, maxPoints);
  };

  // Function to fetch CSV data
  const fetchCSVData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        "http://localhost:8000/static/plots/userId_chatId_uniqueId.csv"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();

      return new Promise<any[]>((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
          complete: (results) => {
            if (results.errors.length > 0) {
              console.warn("CSV parsing warnings:", results.errors);
            }
            resolve(results.data as any[]);
          },
          error: (error) => {
            reject(error);
          },
        });
      });
    } catch (error) {
      console.error("Error fetching CSV data:", error);
      throw error;
    }
  };

  // Load CSV data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchCSVData();
        const sampledData = sampleData(data);
        setCsvData(sampledData);

        if (sampledData.length > 0) {
          const allColumns = Object.keys(sampledData[0] || {});
          const sampleValues = (col: string) => sampledData.slice(0, 10).map(row => row[col]).filter(v => v != null);
          
          // Find first plottable column for x-axis
          const firstPlottableCol = allColumns.find(key => {
            const samples = sampleValues(key);
            if (samples.length === 0) return false;
            
            // Check if it's a date or numeric column
            if (isDateColumn(key, samples)) return true;
            
            const value = sampledData[0][key];
            return typeof value === "number" || (!isNaN(Number.parseFloat(value)) && isFinite(value));
          });
          
          // Find second plottable column for y-axis
          const secondPlottableCol = allColumns.find(key => {
            if (key === firstPlottableCol) return false;
            const samples = sampleValues(key);
            if (samples.length === 0) return false;
            
            // Check if it's a date or numeric column
            if (isDateColumn(key, samples)) return true;
            
            const value = sampledData[0][key];
            return typeof value === "number" || (!isNaN(Number.parseFloat(value)) && isFinite(value));
          });

          if (firstPlottableCol && !xAxis) {
            setXAxis(firstPlottableCol);
          }
          if (secondPlottableCol && !yAxis) {
            setYAxis(secondPlottableCol);
          } else if (firstPlottableCol && !yAxis && !secondPlottableCol) {
            setYAxis(firstPlottableCol);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load CSV data"
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Enhanced column detection
  const { numericColumns, dateColumns, allPlottableColumns } = useMemo(() => {
    if (csvData.length === 0) return { numericColumns: [], dateColumns: [], allPlottableColumns: [] };
    
    const allColumns = Object.keys(csvData[0] || {});
    const numeric: string[] = [];
    const dates: string[] = [];
    
    allColumns.forEach(key => {
      const sampleValues = csvData.slice(0, 10).map(row => row[key]).filter(v => v != null);
      
      if (sampleValues.length === 0) return;
      
      // Check if it's a date column
      if (isDateColumn(key, sampleValues)) {
        dates.push(key);
      } else {
        // Check if it's numeric
        const value = csvData[0][key];
        if (typeof value === "number" || (!isNaN(Number.parseFloat(value)) && isFinite(value))) {
          numeric.push(key);
        }
      }
    });
    
    const allPlottable = [...numeric, ...dates];
    
    return { 
      numericColumns: numeric, 
      dateColumns: dates, 
      allPlottableColumns: allPlottable 
    };
  }, [csvData]);

  // Updated chart data processing to handle dates
  const chartData = useMemo(() => {
    return csvData.map((row, index) => {
      const processedRow = { ...row, index: index + 1 };
      
      // Convert date columns to proper Date objects for plotting
      dateColumns.forEach(col => {
        if (processedRow[col]) {
          const parsedDate = parseDate(processedRow[col]);
          if (parsedDate) {
            processedRow[col] = parsedDate;
          }
        }
      });
      
      return processedRow;
    });
  }, [csvData, dateColumns]);

  const geoColumns = useMemo(() => {
    if (csvData.length === 0) return { lat: null, lon: null };
    const columns = Object.keys(csvData[0] || {});
    const latCol = columns.find(
      (col) =>
        col.toLowerCase().includes("lat") ||
        col.toLowerCase().includes("latitude") ||
        col.toLowerCase() === "y"
    );
    const lonCol = columns.find(
      (col) =>
        col.toLowerCase().includes("lon") ||
        col.toLowerCase().includes("lng") ||
        col.toLowerCase().includes("longitude") ||
        col.toLowerCase() === "x"
    );
    return { lat: latCol || null, lon: lonCol || null };
  }, [csvData]);

  const handleDownload = async () => {
    if (!plotlyRef.current) return;

    try {
      await Plotly.downloadImage(plotlyRef.current, {
        format: "png",
        width: 1600,
        height: 900,
        filename: `chart-${plotType}-${Date.now()}`,
        scale: 2,
      });
    } catch (error) {
      console.error("Error downloading chart:", error);
      // Fallback method
      try {
        const canvas = plotlyRef.current.querySelector("canvas");
        if (canvas) {
          const link = document.createElement("a");
          link.download = `chart-${plotType}-${Date.now()}.png`;
          link.href = canvas.toDataURL();
          link.click();
        }
      } catch (fallbackError) {
        console.error("Fallback download also failed:", fallbackError);
      }
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchCSVData()
      .then((data) => {
        const sampledData = sampleData(data);
        setCsvData(sampledData);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to refresh data");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleZoomOut = () => {
    if (plotlyRef.current) {
      Plotly.relayout(plotlyRef.current, {
        "xaxis.autorange": true,
        "yaxis.autorange": true,
      });
      setIsZoomedIn(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    if (chartRef.current && chartData.length > 0) {
      if (plotType === "geograph") {
        if (geoColumns.lat && geoColumns.lon) {
          renderPlotlyChart();
        }
      } else if (xAxis && yAxis) {
        renderPlotlyChart();
      }
    }
  }, [plotType, chartData, xAxis, yAxis, config, isFullscreen]);

  const renderPlotlyChart = () => {
    if (!chartRef.current) return;

    const plotlyConfig = {
      responsive: true,
      displayModeBar: false,
      displaylogo: false,
      scrollZoom: true,
    };

    // Process data to handle multiple points per date/x-value
    const processChartData = () => {
      if (plotType === "scatter" || plotType === "line") {
        // For scatter and line plots, show all individual points
        return chartData;
      } else if (plotType === "bar" && dateColumns.includes(xAxis)) {
        // For bar charts with dates, aggregate by date and calculate average
        const grouped = chartData.reduce((acc, row) => {
          const xVal = row[xAxis];
          const yVal = Number(row[yAxis]) || 0;
          
          let key;
          if (xVal instanceof Date) {
            key = xVal.toDateString(); // Group by date string
          } else {
            key = String(xVal);
          }
          
          if (!acc[key]) {
            acc[key] = { xValue: xVal, yValues: [], count: 0 };
          }
          acc[key].yValues.push(yVal);
          acc[key].count += 1;
          return acc;
        }, {} as Record<string, { xValue: any, yValues: number[], count: number }>);

        // Calculate averages for each group
        return Object.values(grouped).map(group => ({
          [xAxis]: group.xValue,
          [yAxis]: group.yValues.reduce((sum, val) => sum + val, 0) / group.count,
          count: group.count,
          min: Math.min(...group.yValues),
          max: Math.max(...group.yValues)
        }));
      } else {
        return chartData;
      }
    };

    const processedData = processChartData();

    // Updated axis styling with light colors for dark theme
    const commonAxisStyle = {
      gridcolor: "rgba(255, 255, 255, 0.1)",
      zerolinecolor: "rgba(255, 255, 255, 0.3)",
      color: "rgba(255, 255, 255, 0.8)",
      linecolor: "rgba(255, 255, 255, 0.6)",
      linewidth: 1,
      tickfont: { size: 11, color: "rgba(255, 255, 255, 0.8)" },
      titlefont: { size: 13, color: "rgba(255, 255, 255, 1)" },
    };

    const layout: any = {
      plot_bgcolor: "hsl(210, 100%, 5%)",
      paper_bgcolor: "hsl(210, 100%, 5%)",
      font: {
        color: "rgba(255, 255, 255, 0.9)",
        family: "DM Sans, system-ui, sans-serif",
        size: 12,
      },
      showlegend: config.showLegend,
      legend: {
        font: { color: "rgba(255, 255, 255, 0.9)", size: 11 },
        x: 1.02,
        xanchor: "left",
        y: 1,
        yanchor: "top",
        bgcolor: "rgba(30, 30, 30, 0.8)",
        bordercolor: "rgba(255, 255, 255, 0.2)",
        borderwidth: 1,
      },
      margin: { l: 70, r: 50, t: 50, b: 60 },
      transition: {
        duration: config.animationDuration,
        easing: "cubic-in-out",
      },
      hovermode: config.hoverMode,
    };

    // Configure axes for all non-geographic chart types
    if (plotType !== "pie" && plotType !== "geograph") {
      layout.xaxis = {
        ...commonAxisStyle,
        title: {
          text: xAxis,
          font: { size: 13, color: "rgba(255, 255, 255, 1)" },
        },
        showgrid: config.showGrid,
      };
      layout.yaxis = {
        ...commonAxisStyle,
        title: {
          text: yAxis,
          font: { size: 13, color: "rgba(255, 255, 255, 1)" },
        },
        showgrid: config.showGrid,
      };
    }

    let data: any[] = [];

    // Define curve color - using white for the line
    const curveColor = "rgba(255, 255, 255, 0.9)"; // White color for the curve

    switch (plotType) {
      case "line":
        data = [
          {
            x: processedData.map((d) => d[xAxis]),
            y: processedData.map((d) => d[yAxis]),
            type: "scatter",
            mode: "lines+markers",
            name: `${yAxis}`,
            line: {
              color: curveColor, // Using white color
              width: config.strokeWidth,
              shape: config.curveType,
            },
            marker: {
              color: curveColor, // Using white color
              size: config.markerSize,
              opacity: config.opacity,
              line: { color: "rgba(255, 255, 255, 1)", width: 1 },
            },
            hovertemplate: `<b>%{x}</b><br>${yAxis}: %{y:.2f}<extra></extra>`,
          },
        ];
        break;

      case "bar":
        const isDateXAxis = dateColumns.includes(xAxis);
        const hoverTemplate = isDateXAxis 
          ? `<b>%{x}</b><br>Average ${yAxis}: %{y:.2f}<br>Data points: %{customdata}<extra></extra>`
          : `<b>%{x}</b><br>${yAxis}: %{y:.2f}<extra></extra>`;

        data = [
          {
            x: processedData.map((d) => d[xAxis]),
            y: processedData.map((d) => d[yAxis]),
            type: "bar",
            name: isDateXAxis ? `Average ${yAxis}` : yAxis,
            marker: {
              color: curveColor, // Using white color
              opacity: config.opacity,
              line: { color: "rgba(255, 255, 255, 0.8)", width: 1 },
            },
            customdata: processedData.map((d) => d.count || 1),
            hovertemplate: hoverTemplate,
          },
        ];
        break;

      case "area":
        data = [
          {
            x: processedData.map((d) => d[xAxis]),
            y: processedData.map((d) => d[yAxis]),
            fill: "tozeroy",
            type: "scatter",
            mode: "lines",
            name: `${yAxis}`,
            line: {
              color: curveColor, // Using white color
              width: config.strokeWidth,
              shape: config.curveType,
            },
            fillcolor: "rgba(255, 255, 255, 0.3)", // Light white fill
            hovertemplate: `<b>%{x}</b><br>${yAxis}: %{y:.2f}<extra></extra>`,
          },
        ];
        break;

      case "scatter":
        data = [
          {
            x: processedData.map((d) => d[xAxis]),
            y: processedData.map((d) => d[yAxis]),
            mode: "markers",
            type: "scatter",
            name: `${yAxis}`,
            marker: {
              color: curveColor, // Using white color
              size: config.markerSize + 2,
              opacity: config.opacity,
              line: { color: "rgba(255, 255, 255, 1)", width: 1 },
            },
            hovertemplate: `<b>%{x}</b><br>${yAxis}: %{y:.2f}<extra></extra>`,
          },
        ];
        break;

      case "pie":
        const pieData = processedData.reduce((acc, d) => {
          const label = String(d[xAxis]);
          const value = Number(d[yAxis]) || 0;
          if (acc[label]) {
            acc[label] += value;
          } else {
            acc[label] = value;
          }
          return acc;
        }, {} as Record<string, number>);

        const pieEntries = Object.entries(pieData).slice(0, 8);

        data = [
          {
            values: pieEntries.map(([_, value]) => value),
            labels: pieEntries.map(([label, _]) => label),
            type: "pie",
            marker: { colors: CHART_COLORS },
            textinfo: "label+percent",
            textfont: { color: "rgba(255, 255, 255, 0.9)", size: 11 },
            hoverinfo: "label+percent+value",
            insidetextfont: { color: "rgba(0, 0, 0, 0.9)" },
            outsidetextfont: { color: "rgba(255, 255, 255, 0.9)" },
          },
        ];
        layout.margin = { l: 20, r: 20, t: 40, b: 20 };
        break;

      case "radar":
        const radarData = processedData.slice(0, 6);
        data = [
          {
            type: "scatterpolar",
            r: radarData.map((d) => d[yAxis]),
            theta: radarData.map((d) => String(d[xAxis])),
            fill: "toself",
            name: yAxis,
            line: { color: curveColor, width: config.strokeWidth }, // Using white color
            marker: {
              color: curveColor,
              size: config.markerSize,
              opacity: config.opacity,
            }, // Using white color
            hovertemplate: `<b>%{theta}</b><br>${yAxis}: %{r:.2f}<extra></extra>`,
          },
        ];
        layout.polar = {
          bgcolor: "hsl(210, 100%, 5%)",
          radialaxis: {
            visible: true,
            color: "rgba(255, 255, 255, 0.8)",
            gridcolor: "rgba(255, 255, 255, 0.1)",
            linecolor: "rgba(255, 255, 255, 0.6)",
            linewidth: 1,
          },
          angularaxis: {
            color: "rgba(255, 255, 255, 0.8)",
            gridcolor: "rgba(255, 255, 255, 0.1)",
            linecolor: "rgba(255, 255, 255, 0.6)",
            linewidth: 1,
          },
        };
        break;

      case "geograph":
        if (geoColumns.lat && geoColumns.lon) {
          const validGeoData = chartData.filter(
            (d) =>
              d[geoColumns.lat!] != null &&
              d[geoColumns.lon!] != null &&
              !isNaN(d[geoColumns.lat!]) &&
              !isNaN(d[geoColumns.lon!])
          );

          data = [
            {
              type: "scattermapbox",
              lat: validGeoData.map((d) => d[geoColumns.lat!]),
              lon: validGeoData.map((d) => d[geoColumns.lon!]),
              mode: "markers",
              marker: {
                color: curveColor, // Using white color
                size: config.markerSize + 4,
                opacity: config.opacity,
              },
              text: validGeoData.map((d) => {
                const info = Object.keys(d)
                  .filter(
                    (key) => key !== geoColumns.lat && key !== geoColumns.lon
                  )
                  .map((key) => `${key}: ${d[key]}`)
                  .join("<br>");
                return `Lat: ${d[geoColumns.lat!]}<br>Lon: ${
                  d[geoColumns.lon!]
                }<br>${info}`;
              }),
              hovertemplate: "%{text}<extra></extra>",
            },
          ];

          const lats = validGeoData.map((d) => d[geoColumns.lat!]);
          const lons = validGeoData.map((d) => d[geoColumns.lon!]);
          const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
          const centerLon = lons.reduce((a, b) => a + b, 0) / lons.length;

          const latRange = Math.max(...lats) - Math.min(...lats);
          const lonRange = Math.max(...lons) - Math.min(...lons);
          const maxRange = Math.max(latRange, lonRange);
          let zoom =
            maxRange < 1
              ? 8
              : maxRange < 5
              ? 6
              : maxRange < 20
              ? 4
              : maxRange < 50
              ? 3
              : 2;

          layout.mapbox = {
            style: "carto-darkmatter",
            center: { lat: centerLat, lon: centerLon },
            zoom: zoom,
            accesstoken: "YOUR_MAPBOX_ACCESS_TOKEN",
          };

          delete layout.xaxis;
          delete layout.yaxis;
        }
        break;
    }

    const onUpdate = (figure: any) => {
      if (figure.layout?.xaxis?.range || figure.layout?.yaxis?.range) {
        setIsZoomedIn(true);
      } else {
        setIsZoomedIn(false);
      }
    };

    Plotly.newPlot(chartRef.current, data, layout, plotlyConfig).then(
      (plot) => {
        plotlyRef.current = plot;
        plot.on("plotly_relayout", onUpdate);
      }
    );
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 bg-background min-h-screen">
        <div className="bg-card border border-border rounded-xl shadow-[var(--shadow-elegant)] p-8 text-center">
          <div className="space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-primary text-primary-foreground">
              <Loader2 className="h-10 w-10 animate-spin" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Loading CSV Data
              </h3>
              <p className="text-muted-foreground text-sm">
                Fetching sample sales data from CSV file
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 bg-background min-h-screen">
        <div className="bg-card border border-destructive/30 rounded-xl shadow-[var(--shadow-elegant)] p-8 text-center">
          <div className="space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-destructive/20 flex items-center justify-center border border-destructive/30">
              <Activity className="h-10 w-10 text-destructive" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-destructive mb-2">
                Data Loading Error
              </h3>
              <p className="text-destructive/80 mb-4">{error}</p>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-all duration-200 shadow-[var(--shadow-card)]"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Loading
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!csvData || csvData.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 bg-background min-h-screen">
        <div className="bg-card border border-border rounded-xl shadow-[var(--shadow-elegant)] p-8 text-center">
          <div className="space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-warning text-warning-foreground">
              <BarChart3 className="h-10 w-10" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Data Available
              </h3>
              <p className="text-muted-foreground mb-4">
                The CSV file appears to be empty or contains no valid data
              </p>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 shadow-[var(--shadow-card)]"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (allPlottableColumns.length === 0 && plotType !== "geograph") {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 bg-background min-h-screen">
        <div className="bg-card border border-warning/30 rounded-xl shadow-[var(--shadow-elegant)] p-8 text-center">
          <div className="space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-warning/20 flex items-center justify-center border border-warning/30">
              <Activity className="h-10 w-10 text-warning" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-warning mb-2">
                No Plottable Data Found
              </h3>
              <p className="text-warning/80 mb-4">
                The CSV data doesn't contain numeric or date columns suitable for
                plotting
              </p>
              <div className="mt-6 p-4 rounded-lg text-left max-w-md mx-auto bg-muted border border-border">
                <p className="text-sm mb-3 text-foreground font-medium">
                  Available columns:
                </p>
                <ul className="text-sm space-y-1">
                  {Object.keys(csvData[0] || {}).map((col) => (
                    <li key={col} className="font-mono text-muted-foreground">
                      • {col}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full mx-auto space-y-6 bg-background min-h-screen font-[var(--font-body)] transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-50 p-4 overflow-auto max-w-none"
          : "max-w-7xl p-6"
      }`}
    >
      {/* Header */}
      <div className="bg-card border border-border rounded-xl shadow-[var(--shadow-elegant)] p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-primary">
              CSV Data Visualization
            </h1>
            <p className="text-muted-foreground text-sm">
              Interactive {plotType.charAt(0).toUpperCase() + plotType.slice(1)}{" "}
              chart • {yAxis || "Geographic"} vs {xAxis || "Location"} •{" "}
              {csvData.length.toLocaleString()} data points
            </p>
          </div>

          {/* Control Panel */}
          <div className="flex items-center gap-2 p-2 bg-secondary rounded-lg border border-border">
            {isZoomedIn && (
              <button
                onClick={handleZoomOut}
                className="p-2 rounded-lg bg-accent hover:bg-accent-hover text-accent-foreground transition-all duration-200 border border-border"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg bg-accent hover:bg-accent-hover text-accent-foreground transition-all duration-200 border border-border"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-accent hover:bg-accent-hover text-accent-foreground transition-all duration-200 border border-border"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>

            <button
              onClick={handleDownload}
              className="p-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 shadow-[var(--shadow-card)]"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-all duration-200 border ${
                showSettings
                  ? "bg-primary text-primary-foreground border-primary/30"
                  : "bg-accent hover:bg-accent-hover text-accent-foreground border-border"
              }`}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="bg-card border border-border rounded-xl shadow-[var(--shadow-elegant)] overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Chart Type Selection */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {CHART_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setPlotType(value)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    plotType === value
                      ? "bg-primary text-primary-foreground shadow-[var(--shadow-card)] border border-primary/30"
                      : "bg-secondary hover:bg-secondary-hover text-secondary-foreground border border-border"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Axis Configuration */}
          {plotType !== "geograph" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  X-Axis
                </label>
                <select
                  value={xAxis}
                  onChange={(e) => setXAxis(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
                >
                  <option value="index">Index</option>
                  {allPlottableColumns.map((col) => (
                    <option key={col} value={col}>
                      {col} {dateColumns.includes(col) ? '(Date)' : '(Numeric)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Y-Axis
                </label>
                <select
                  value={yAxis}
                  onChange={(e) => setYAxis(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
                >
                  {allPlottableColumns.map((col) => (
                    <option key={col} value={col}>
                      {col} {dateColumns.includes(col) ? '(Date)' : '(Numeric)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Advanced Settings Panel */}
          {showSettings && (
            <div className="space-y-8 p-6 rounded-xl bg-secondary/50 border border-border backdrop-blur-sm">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                  Chart Configuration
                </h3>

                {/* Visual Settings Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-foreground/80 uppercase tracking-wider">
                      Display Options
                    </h4>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.showGrid}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                showGrid: e.target.checked,
                              }))
                            }
                            className="rounded border-border bg-input text-primary focus:ring-primary/50"
                          />
                          <span className="text-sm font-medium text-foreground">
                            Show Grid Lines
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.showLegend}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                showLegend: e.target.checked,
                              }))
                            }
                            className="rounded border-border bg-input text-primary focus:ring-primary/50"
                          />
                          <span className="text-sm font-medium text-foreground">
                            Show Legend
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-foreground/80 uppercase tracking-wider">
                      Styling Controls
                    </h4>
                    <div className="space-y-4">
                      <div className="p-3 rounded-lg bg-card border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">
                            Stroke Width
                          </span>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            {config.strokeWidth}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="8"
                          step="1"
                          value={config.strokeWidth}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              strokeWidth: Number(e.target.value),
                            }))
                          }
                          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>

                      <div className="p-3 rounded-lg bg-card border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">
                            Opacity
                          </span>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            {Math.round(config.opacity * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.05"
                          value={config.opacity}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              opacity: Number(e.target.value),
                            }))
                          }
                          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>

                      <div className="p-3 rounded-lg bg-card border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">
                            Marker Size
                          </span>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            {config.markerSize}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="16"
                          step="1"
                          value={config.markerSize}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              markerSize: Number(e.target.value),
                            }))
                          }
                          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Advanced Options */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-foreground/80 uppercase tracking-wider">
                    Advanced Options
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground">
                        Hover Mode
                      </label>
                      <select
                        value={
                          config.hoverMode === false ? "off" : config.hoverMode
                        }
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            hoverMode:
                              e.target.value === "off"
                                ? false
                                : (e.target.value as any),
                          }))
                        }
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:ring-2 focus:ring-ring"
                      >
                        <option value="closest">Closest Point</option>
                        <option value="x">X-Axis</option>
                        <option value="y">Y-Axis</option>
                        <option value="off">Disabled</option>
                      </select>
                    </div>

                    {(plotType === "line" || plotType === "area") && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-foreground">
                          Curve Type
                        </label>
                        <select
                          value={config.curveType}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              curveType: e.target.value as any,
                            }))
                          }
                          className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:ring-2 focus:ring-ring"
                        >
                          <option value="spline">Smooth Curve</option>
                          <option value="linear">Linear</option>
                          <option value="hv">Step (H-V)</option>
                          <option value="vh">Step (V-H)</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {plotType === "geograph" &&
                (!geoColumns.lat || !geoColumns.lon) && (
                  <div className="p-4 rounded-lg border-l-4 border-warning bg-warning/10 border border-warning/20">
                    <div className="space-y-2">
                      <p className="text-sm text-warning font-medium">
                        Geographic visualization requires latitude and longitude
                        columns.
                      </p>
                      <p className="text-xs text-warning/80">
                        Looking for columns named: lat/latitude/y and
                        lon/lng/longitude/x
                      </p>
                      {csvData.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Available columns:{" "}
                          {Object.keys(csvData[0]).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Chart Container */}
          <div
            ref={chartRef}
            className={`w-full rounded-xl border-2 border-border bg-muted/20 overflow-hidden ${
              isFullscreen ? "h-[calc(100vh-20rem)]" : "h-96 lg:h-[600px]"
            }`}
          >
            {(xAxis && yAxis) ||
            (plotType === "geograph" && geoColumns.lat && geoColumns.lon) ? (
              <div className="w-full h-full" />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center space-y-2">
                  <BarChart3 className="h-12 w-12 mx-auto opacity-50" />
                  <p className="text-sm">
                    {plotType === "geograph"
                      ? "Geographic data not available - need latitude and longitude columns"
                      : "Please select both X and Y axes to display the chart"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Data Summary */}
          <div className="flex flex-wrap items-center gap-6 text-sm border-t border-border pt-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-chart-1" />
              <span>
                {csvData.length.toLocaleString()} data points{" "}
                {csvData.length >= 2000 ? "(sampled)" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-chart-3" />
              <span>{numericColumns.length} numeric columns</span>
            </div>
            {dateColumns.length > 0 && (
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-chart-2" />
                <span>{dateColumns.length} date columns</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-success" />
              <span>Live CSV data</span>
            </div>
            {plotType === "geograph" && geoColumns.lat && geoColumns.lon && (
              <div className="flex items-center gap-2">
                <Map className="h-4 w-4 text-chart-2" />
                <span>Geographic data available</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVVisualizationDashboard;
