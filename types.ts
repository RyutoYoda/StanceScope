export interface SentimentData {
  name: string;
  count: number;
}

export interface AnalysisResult {
  summary: string;
  sentiment: SentimentData[];
  viewpoints: string[];
}

export interface VideoDetails {
  id: string;
  title: string;
  thumbnailUrl: string;
}