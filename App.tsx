import React, { useState, useCallback } from 'react';
import { analyzeComments } from './services/geminiService';
import { getVideoDetails, getVideoComments } from './services/youtubeService';
import type { AnalysisResult, VideoDetails } from './types';
import { YouTubeIcon } from './components/icons/YouTubeIcon';
import { LinkIcon } from './components/icons/LinkIcon';
import { LoadingSpinner } from './components/LoadingSpinner';
import { AnalysisChart } from './components/AnalysisChart';
import { ChartIcon } from './components/icons/ChartIcon';

const App: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoDetails, setVideoDetails] = useState<VideoDetails | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleFetchVideo = useCallback(async () => {
    if (!videoUrl.trim()) {
      setError('YouTubeのURLを入力してください。');
      return;
    }
    setIsLoading(true);
    setLoadingMessage('動画情報を取得中...');
    setError(null);
    setVideoDetails(null);
    setAnalysisResult(null);

    try {
      const details = await getVideoDetails(videoUrl);
      setVideoDetails(details);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : '動画情報の取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, [videoUrl]);

  const handleAnalyze = useCallback(async () => {
    if (!videoDetails?.id) {
      setError('動画情報が見つかりません。');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('コメントをAIが分析中...');
    setError(null);
    setAnalysisResult(null);

    try {
      setLoadingMessage('コメントを取得中...');
      const comments = await getVideoComments(videoDetails.id);
       if (comments.length === 0) {
        setError('この動画にはコメントがありません。');
        setIsLoading(false);
        return;
      }
      setLoadingMessage('AIが対立軸を分析中...');
      const result = await analyzeComments(comments);
      setAnalysisResult(result);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'コメントの分析中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }, [videoDetails]);

  const handleUrlKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleFetchVideo();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-2">
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
              StanceScope
            </h1>
          </div>
          <p className="text-lg text-gray-400">
            AIがYouTubeのコメントから人々のスタンスを読み解き、可視化します。
          </p>
        </header>

        <main className="bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
          <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
            <h2 className="text-lg font-semibold text-white mb-2">使い方</h2>
            <ol className="list-decimal list-inside text-gray-300 text-sm space-y-1">
              <li>分析したいYouTube動画のURLを貼り付けて、「動画情報を取得」ボタンを押します。</li>
              <li>「コメントを分析」ボタンを押すと、AIが論点の特定から分析・グラフ化まで全自動で行います。</li>
            </ol>
          </div>

          <div className="w-full space-y-4">
            <label htmlFor="youtube-url" className="font-semibold text-white">YouTube動画のURL</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-grow">
                 <YouTubeIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="youtube-url"
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  onKeyDown={handleUrlKeyDown}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-gray-900 border-2 border-gray-700 rounded-full py-3 pl-12 pr-4 text-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={handleFetchVideo}
                disabled={isLoading || !videoUrl.trim()}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white font-bold rounded-full shadow-md hover:bg-gray-700 disabled:bg-gray-500 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 ease-in-out"
              >
                <span>動画情報を取得</span>
              </button>
            </div>
          </div>
          
          {isLoading && !videoDetails && !analysisResult && (
            <div className="flex justify-center items-center gap-4 p-4 text-lg">
              <LoadingSpinner />
              <span>{loadingMessage}</span>
            </div>
          )}

          {error && <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg">{error}</div>}

          {videoDetails && !isLoading && (
            <div className="space-y-6 pt-4 border-t border-gray-700 animate-fade-in">
              <style>{`
                @keyframes fade-in {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
              `}</style>
              <h2 className="text-xl font-semibold text-center text-white">取得した動画情報</h2>
              <div className="bg-gray-900 rounded-lg overflow-hidden flex flex-col md:flex-row items-center gap-6 p-4 border border-gray-700">
                <img src={videoDetails.thumbnailUrl} alt="Video Thumbnail" className="w-full md:w-48 rounded-md aspect-video object-cover"/>
                <h3 className="text-lg font-bold text-gray-200 text-center md:text-left">{videoDetails.title}</h3>
              </div>
              
              <div className="flex justify-center">
                <button
                  onClick={handleAnalyze}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white font-bold rounded-full shadow-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 ease-in-out w-full sm:w-auto"
                >
                   <ChartIcon className="h-6 w-6" />
                   <span>コメントを分析</span>
                </button>
              </div>
            </div>
          )}
        </main>

        <section className="mt-10">
          {isLoading && !analysisResult && (
             <div className="flex justify-center items-center gap-4 p-4 text-lg">
                <LoadingSpinner />
                <span>{loadingMessage}</span>
            </div>
          )}
          
          {analysisResult && (
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in">
                <h2 className="text-2xl font-bold text-center text-white mb-4">分析結果</h2>

                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold text-indigo-400 mb-2">AIが特定した主な論点</h3>
                    <div className="space-y-3">
                        {analysisResult.viewpoints.map((vp, index) => (
                            <p key={index} className="bg-gray-700 p-3 rounded-md">
                                <strong>意見{String.fromCharCode(65 + index)}:</strong> {vp}
                            </p>
                        ))}
                    </div>
                </div>

                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold text-indigo-400 mb-2">AIによる分析サマリー</h3>
                    <p className="text-gray-300 whitespace-pre-wrap">{analysisResult.summary}</p>
                </div>
                <div className="h-96 w-full">
                    <AnalysisChart data={analysisResult.sentiment} />
                </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default App;