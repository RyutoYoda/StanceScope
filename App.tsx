import React, { useMemo, useState } from 'react';
import type { AnalysisResult, VideoDetails } from './types';
import { analyzeComments, hasGeminiApiKey } from './services/geminiService';
import { runPersonalityAnalysisAgent, type PersonalityAnalysis } from './services/personalityAgent';
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
  const [personalityAnalysis, setPersonalityAnalysis] = useState<{
    analysis: PersonalityAnalysis;
    interactions: string;
    strategy: string;
  } | null>(null);
  const [agentWorking, setAgentWorking] = useState(false);
  const [comments, setComments] = useState<string[]>([]);
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

      const fetchedComments = await getComments(videoId);
      if (fetchedComments.length === 0) {
        setError("コメントが見つかりませんでした。分析を中止します。");
        setIsLoading(false);
        return;
      }
      
      setComments(fetchedComments);
      const result = await analyzeComments(fetchedComments);
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

  const runPersonalityAgent = async () => {
    if (!comments.length || !videoDetails) return;
    
    setAgentWorking(true);
    try {
      const result = await runPersonalityAnalysisAgent(comments, videoDetails.title);
      setPersonalityAnalysis(result);
    } catch (err) {
      console.error('Personality Agent analysis failed:', err);
      setError('性格診断分析に失敗しました。');
    } finally {
      setAgentWorking(false);
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

              {/* AI Agent 性格診断セクション */}
              <section className="rounded-2xl border border-purple-800 bg-gradient-to-br from-purple-900/20 via-slate-900/70 to-slate-950 p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="flex items-center gap-2 text-2xl font-bold text-white">
                    🤖 AI エージェント: コメント性格診断
                  </h3>
                  <button
                    onClick={runPersonalityAgent}
                    disabled={agentWorking || !comments.length}
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-all transform hover:scale-105"
                  >
                    {agentWorking ? '🔄 AI分析中...' : '🚀 性格診断開始'}
                  </button>
                </div>

                {agentWorking && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
                    <h4 className="font-bold text-purple-300 mb-3">🧠 エージェントの思考プロセス</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-purple-200">
                        <div className="w-2 h-2 bg-purple-400 rounded-full mr-3 animate-pulse"></div>
                        コメント者の性格タイプを分析中...
                      </div>
                      <div className="flex items-center text-purple-200">
                        <div className="w-2 h-2 bg-purple-400 rounded-full mr-3 animate-pulse"></div>
                        性格タイプ間の相互作用パターンを予測中...
                      </div>
                      <div className="flex items-center text-purple-200">
                        <div className="w-2 h-2 bg-purple-400 rounded-full mr-3 animate-pulse"></div>
                        最適なモデレーション戦略を生成中...
                      </div>
                    </div>
                  </div>
                )}

                {personalityAnalysis && (
                  <div className="space-y-8">
                    {/* 性格タイプ分布 */}
                    <div>
                      <h4 className="text-xl font-bold text-purple-300 mb-4">📊 性格タイプ分布</h4>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {personalityAnalysis.analysis.personalityDistribution.map((personality, index) => (
                          <div key={index} className="bg-slate-800/60 border border-purple-500/30 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <h5 className="font-semibold text-purple-200">{personality.type}</h5>
                              <span className="text-purple-300 font-bold">{personality.percentage}%</span>
                            </div>
                            <p className="text-sm text-slate-300 mb-3">
                              {personality.characteristics.join('、')}
                            </p>
                            <div className="bg-slate-700 rounded-full h-2 mb-2">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                                style={{ width: `${personality.percentage}%` }}
                              />
                            </div>
                            <div className="text-xs text-slate-400">
                              {personality.count}件のコメント
                            </div>
                            {personality.examples.length > 0 && (
                              <details className="mt-3">
                                <summary className="text-xs text-purple-400 cursor-pointer hover:text-purple-300">
                                  コメント例を見る
                                </summary>
                                <div className="mt-2 text-xs text-slate-400 bg-slate-900/50 p-2 rounded border-l-2 border-purple-500/30">
                                  {personality.examples[0]}
                                </div>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* グループダイナミクス */}
                    <div className="bg-slate-800/40 border border-purple-500/20 rounded-lg p-6">
                      <h4 className="text-xl font-bold text-purple-300 mb-3">🎭 グループダイナミクス</h4>
                      <p className="text-slate-200 leading-relaxed mb-4">
                        {personalityAnalysis.analysis.groupDynamics}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400">対立リスク:</span>
                        <div className="flex-1 bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              personalityAnalysis.analysis.conflictPotential <= 3
                                ? 'bg-green-500'
                                : personalityAnalysis.analysis.conflictPotential <= 6
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${personalityAnalysis.analysis.conflictPotential * 10}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-purple-300">
                          {personalityAnalysis.analysis.conflictPotential}/10
                        </span>
                      </div>
                    </div>

                    {/* 相互作用パターン */}
                    <div className="bg-slate-800/40 border border-purple-500/20 rounded-lg p-6">
                      <h4 className="text-xl font-bold text-purple-300 mb-3">🔄 相互作用パターン分析</h4>
                      <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                        {personalityAnalysis.interactions}
                      </div>
                    </div>

                    {/* モデレーション戦略 */}
                    <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-500/20 rounded-lg p-6">
                      <h4 className="text-xl font-bold text-green-300 mb-3">🛡️ 推奨モデレーション戦略</h4>
                      <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                        {personalityAnalysis.strategy}
                      </div>
                    </div>

                    {/* 推奨事項 */}
                    <div className="bg-slate-800/40 border border-purple-500/20 rounded-lg p-6">
                      <h4 className="text-xl font-bold text-purple-300 mb-3">💡 建設的な議論のための推奨事項</h4>
                      <ul className="space-y-2">
                        {personalityAnalysis.analysis.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2 text-slate-200 text-sm">
                            <span className="text-purple-400 mt-1">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
