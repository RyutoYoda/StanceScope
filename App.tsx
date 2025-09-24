import React, { useMemo, useState } from 'react';
import type { AnalysisResult, VideoDetails } from './types';
import { analyzeComments, hasGeminiApiKey } from './services/geminiService';
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
  const geminiConfigured = hasGeminiApiKey;

  const viewpointStats = useMemo(() => {
    if (!analysisResult) {
      return [];
    }

    const normalise = (value: string) => value.replace(/\s+/g, '').trim();
    const total = analysisResult.sentiment.reduce((sum, item) => sum + item.count, 0);

    return analysisResult.viewpoints.map((viewpoint, index) => {
      const label = `意見 ${String.fromCharCode(65 + index)}`;
      const sentimentBucket = analysisResult.sentiment.find(
        (item) => normalise(item.name) === normalise(label)
      );
      const count = sentimentBucket?.count ?? 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

      return {
        label,
        viewpoint,
        count,
        percentage,
      };
    });
  }, [analysisResult]);

  const neutralStat = useMemo(() => {
    if (!analysisResult) {
      return null;
    }

    const total = analysisResult.sentiment.reduce((sum, item) => sum + item.count, 0);
    const bucket = analysisResult.sentiment.find((item) => item.name.includes('中立'));
    if (!bucket) {
      return null;
    }

    return {
      label: bucket.name,
      count: bucket.count,
      percentage: total > 0 ? Math.round((bucket.count / total) * 100) : 0,
    };
  }, [analysisResult]);

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
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <header className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900 to-slate-950 p-10 shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.35),_transparent_55%)]" aria-hidden="true" />
          <div className="relative flex flex-col items-center text-center gap-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/10 px-4 py-1 text-xs uppercase tracking-[0.2em] text-blue-200">
              コメント分析AIダッシュボード
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white flex items-center justify-center gap-3">
            <YouTubeIcon className="w-10 h-10 text-red-500" />
            <span>StanceScope</span>
          </h1>
            <p className="max-w-2xl text-lg text-slate-300">
              YouTubeコメントを収集し、主要な論点と支持の偏りを俯瞰できるレポートを生成します。
            </p>
          </div>
        </header>

        <main className="mx-auto mt-10 max-w-4xl space-y-10">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
            <div>
              <label htmlFor="videoUrl" className="block text-sm font-medium text-slate-300 mb-2">
                YouTube動画のURL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <LinkIcon className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  id="videoUrl"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-3 pl-10 pr-4 text-sm text-white shadow-inner transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isLoading || !geminiConfigured}
              className="mt-4 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-4 py-3 text-base font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? <LoadingSpinner /> : '分析する'}
            </button>
          </div>

          {!geminiConfigured && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/15 px-6 py-5 text-amber-100" role="alert">
              <p>
                Gemini APIキーが設定されていません。Cloudflare Pages のシークレットに <code>GEMINI_API_KEY</code> を追加して、再度デプロイしてください。
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-6 py-5 text-red-100" role="alert">
              <p>{error}</p>
            </div>
          )}

          {videoDetails && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <img
                  src={videoDetails.thumbnailUrl}
                  alt={videoDetails.title}
                  className="w-full rounded-xl border border-slate-800 object-cover shadow-lg md:w-48"
                />
                <div className="space-y-2">
                  <span className="inline-flex items-center rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-xs uppercase tracking-[0.15em] text-blue-200">
                    対象動画
                  </span>
                  <h2 className="text-2xl font-semibold text-white leading-snug">{videoDetails.title}</h2>
                </div>
              </div>
            </div>
          )}

          {analysisResult && (
            <div className="space-y-10">
              <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900 to-slate-950 p-8 shadow-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.2),_transparent_55%)]" aria-hidden="true" />
                <div className="relative space-y-4">
                  <h3 className="text-2xl font-bold text-white">要約</h3>
                  <p className="whitespace-pre-wrap text-lg leading-relaxed text-slate-200">
                    {analysisResult.summary}
                  </p>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-white">主要な論点</h3>
                  <span className="text-sm text-slate-400">分析対象コメント数: {analysisResult.sentiment.reduce((sum, item) => sum + item.count, 0)} 件</span>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  {viewpointStats.map((stat) => (
                    <article key={stat.label} className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl transition hover:-translate-y-1 hover:border-blue-500/60 hover:shadow-blue-500/20">
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" aria-hidden="true" />
                      <div className="flex items-center justify-between text-sm text-blue-200">
                        <span className="tracking-[0.2em] uppercase">{stat.label}</span>
                        <span className="font-semibold text-blue-100">{stat.count}件 / {stat.percentage}%</span>
                      </div>
                      <p className="mt-4 text-base leading-relaxed text-slate-200">
                        {stat.viewpoint}
                      </p>
                      <div className="mt-5 h-2 w-full rounded-full bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
                          style={{ width: `${Math.min(100, Math.max(stat.percentage, stat.count > 0 ? 8 : 0))}%` }}
                        />
                      </div>
                    </article>
                  ))}

                  {neutralStat && (
                    <article className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-500 via-slate-400 to-slate-500" aria-hidden="true" />
                      <div className="flex items-center justify-between text-sm text-slate-300">
                        <span className="tracking-[0.2em] uppercase">{neutralStat.label}</span>
                        <span className="font-semibold text-slate-200">{neutralStat.count}件 / {neutralStat.percentage}%</span>
                      </div>
                      <p className="mt-4 text-base leading-relaxed text-slate-300">
                        議論のいずれの立場にも明確に属さない、またはその他のコメントです。
                      </p>
                      <div className="mt-5 h-2 w-full rounded-full bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-slate-400 to-slate-500"
                          style={{ width: `${Math.min(100, Math.max(neutralStat.percentage, neutralStat.count > 0 ? 8 : 0))}%` }}
                        />
                      </div>
                    </article>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl">
                <h3 className="flex items-center gap-2 text-2xl font-bold text-white">
                  <ChartIcon className="w-6 h-6 text-blue-400" />
                  センチメント分析
                </h3>
                <p className="mt-2 text-sm text-slate-400">支持の度合いと中立の割合を棒グラフで可視化しています。</p>
                <div className="mt-6 h-80 w-full">
                  <AnalysisChart data={analysisResult.sentiment} />
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
