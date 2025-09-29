export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string | MessageContent;
}

export interface MessageContent {
  type: 'table' | 'plot' | 'theory';
  component?: any;
  tableData?: any[][];
  plotData?: any[];
  plotType?: string;
  explanation?: string;
  csvDownload?: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

export interface ApiResponse {
  type: 'table' | 'plot' | 'theory';
  message: string;
  raw_data?: any[];  // Changed from raw_data? to match backend
  columns?: string[]; // Added to match backend
  csv_url?: string;   // Changed from csv_download? to match backend
  error?: string;
}