import React, { useState } from 'react';
import type { AnalysisResult, VideoDetails } from './types';
import { analyzeComments } from './services/geminiService';
import { extractVideoId, getVideoDetails, getComments } from './services/youtubeService';
import { LoadingSpinner } from './components/LoadingSpinner';
import { AnalysisChart } from './components/AnalysisChart';
import { YouTubeIcon } from './components/icons/YouTubeIcon';
import { LinkIcon } from './components/icons/LinkIcon';
import { ChartIcon } from './components/icons/ChartIcon';

const App: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [videoDetails, setVideoDetails] = useState<VideoDetails | null>(null);

  const handleAnalyze = async () => {
    if (!videoUrl) {
      setError('YouTube動画のURLを入力してください。');
      return;
    }
    
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      setError('有効なYouTube動画のURLを入力してください。');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setVideoDetails(null);

    try {
      // APIキーはサービス内部で環境変数から取得される
      const details = await getVideoDetails(videoId);
      setVideoDetails(details);

      const comments = await getComments(videoId);
      if (comments.length === 0) {
        setError("コメントが見つかりませんでした。分析を中止します。");
        setIsLoading(false);
        return;
      }
      
      const result = await analyzeComments(comments);
      setAnalysisResult(result);
    } catch (err) {
      if (err instanceof Error) {
        setError(`エラーが発生しました: ${err.message}`);
      } else {
        setError('不明なエラーが発生しました。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen font-sans">
      <div className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <YouTubeIcon className="w-10 h-10 text-red-500" />
            <span>StanceScope</span>
          </h1>
          <p className="text-gray-400">動画のコメント欄をAIが分析・要約します。</p>
        </header>

        <main className="max-w-3xl mx-auto">
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
            <div>
              <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-300 mb-2">
                YouTube Video URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LinkIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="videoUrl"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors duration-200"
            >
              {isLoading ? <LoadingSpinner /> : '分析する'}
            </button>
          </div>

          {error && (
            <div className="mt-6 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg" role="alert">
              <p>{error}</p>
            </div>
          )}

          {videoDetails && (
             <div className="mt-8 bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col md:flex-row items-center gap-6">
                <img src={videoDetails.thumbnailUrl} alt={videoDetails.title} className="w-full md:w-48 rounded-lg" />
                <h2 className="text-xl font-semibold text-white">{videoDetails.title}</h2>
             </div>
          )}

          {analysisResult && (
            <div className="mt-8 space-y-8">
              <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-2xl font-bold text-white mb-4">要約</h3>
                <p className="text-gray-300 whitespace-pre-wrap">{analysisResult.summary}</p>
              </div>

              <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-2xl font-bold text-white mb-4">主要な論点</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  {analysisResult.viewpoints.map((vp, index) => (
                    <li key={index}>{vp}</li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <ChartIcon className="w-6 h-6" />
                  センチメント分析
                </h3>
                <div className="h-80 w-full">
                  <AnalysisChart data={analysisResult.sentiment} />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;